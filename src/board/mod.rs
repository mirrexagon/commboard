use std::collections::{BTreeMap, HashMap};
use std::fs::File;
use std::io;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};
use serde_json::json;

use thiserror::Error;

mod card;
mod tag;

pub use card::{Card, CardId};
pub use tag::Tag;

use card::CardError;

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum Action {
    SetBoardName { name: String },
    NewCard,
    DeleteCurrentCard,
    SelectCardAbove,
    SelectCardBelow,
    SetCurrentCardText { text: String },
    AddTagToCurrentCard { tag: Tag },
    DeleteTagFromCurrentCard { tag: Tag },
    //SetFilter { filter: String },
}

#[derive(Debug, Serialize)]
#[serde(tag = "type")]
enum InteractionView {
    Default {
        /// If there are no cards, no card can be selected, and the default view
        /// is the only view available.
        selected_card_id: Option<CardId>,
    },
    // Category {
    //     /// A tag represents a column in a category.
    //     selected_tag: Tag,
    //     selected_card_id: CardId,
    // },
}

/// The state of a session interacting with the board.
#[derive(Debug, Serialize)]
struct InteractionState {
    view: InteractionView,
    filter: String,
}

impl Default for InteractionState {
    fn default() -> Self {
        InteractionState {
            view: InteractionView::Default {
                selected_card_id: None,
            },
            filter: String::new(),
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Board {
    name: String,

    /// The default view shows all cards in card ID order.
    cards: BTreeMap<CardId, Card>,
    next_card_id: CardId,

    // A tag represents a category and column.
    // Categories are listed in alphabetical order.
    // Columns within a category have a saved order.
    // Cards within a column have a saved order.
    column_position_in_category: HashMap<Tag, usize>,
    card_position_in_column: HashMap<(CardId, Tag), usize>,

    /// Path to JSON file this board saves to.
    #[serde(skip)]
    file_path: PathBuf,

    #[serde(skip)]
    interaction_state: InteractionState,
}

impl Board {
    /// Creates a new empty board.
    pub fn new<P: AsRef<Path>>(file_path: P) -> Self {
        Self {
            name: format!("New Board"),

            cards: BTreeMap::new(),
            next_card_id: CardId::new(0),

            column_position_in_category: HashMap::new(),
            card_position_in_column: HashMap::new(),

            file_path: file_path.as_ref().to_owned(),
            interaction_state: Default::default(),
        }
    }

    pub fn save(&self) -> Result<(), BoardError> {
        let f = File::create(&self.file_path)?;
        serde_json::to_writer_pretty(f, self)?;
        Ok(())
    }

    pub fn load<P: AsRef<Path>>(path: P) -> Result<Self, BoardError> {
        let f = File::open(path.as_ref())?;
        let mut board: Board = serde_json::from_reader(f)?;
        board.file_path = path.as_ref().to_owned();
        Ok(board)
    }

    pub fn get_state_as_json(&self) -> serde_json::Value {
        json!({
            "board_name": self.name,
            "cards": self.cards,

            "default_card_order": self.cards.keys().collect::<Vec<_>>(),

            "interaction_state": self.interaction_state,
        })
    }

    pub fn perform_action(&mut self, action: &Action) -> Result<(), BoardError> {
        // Remember to validate everything before performing the action, so it is atomic!

        match action {
            Action::SetBoardName { name } => {
                self.name = name.to_owned();
                Ok(())
            }

            Action::NewCard => {
                let new_card_id = self.get_next_card_id();
                self.cards.insert(new_card_id, Card::new(new_card_id));

                match self.interaction_state.view {
                    InteractionView::Default { .. } => {
                        // The new card was added to the end of the view
                        // (because the default view is ordered by card ID and
                        // the new card has the highest card ID), select it.
                        self.interaction_state.view = InteractionView::Default {
                            selected_card_id: Some(new_card_id),
                        };
                        Ok(())
                    }
                }
            }

            Action::DeleteCurrentCard => match self.interaction_state.view {
                InteractionView::Default { .. } => {
                    let to_remove_card_id = self.get_selected_card_id()?;

                    self.cards.remove(&to_remove_card_id);

                    self.interaction_state.view =
                        if let Some(max_card_id) = self.get_current_max_card_id() {
                            let new_selected_card_id = if to_remove_card_id > max_card_id {
                                // The just-removed card was on the end of the
                                // default view, so select the new end of the view.
                                max_card_id
                            } else {
                                // Find the card that is now taking the spot the removed card was in (the next card down).
                                *self
                                    .cards
                                    .keys()
                                    .find(|card_id| *card_id > &to_remove_card_id)
                                    .unwrap()
                            };

                            InteractionView::Default {
                                selected_card_id: Some(new_selected_card_id),
                            }
                        } else {
                            // There are no more cards.
                            InteractionView::Default {
                                selected_card_id: None,
                            }
                        };

                    Ok(())
                }
            },

            Action::SelectCardBelow | Action::SelectCardAbove => {
                match self.interaction_state.view {
                    InteractionView::Default { .. } => {
                        let originally_selected_card_id = self.get_selected_card_id()?;

                        // Unwrap is okay because we have already checked that a card is selected.
                        let new_selected_card_id = match action {
                            Action::SelectCardBelow => self
                                .get_next_card_in_default_order(originally_selected_card_id)
                                .unwrap(),
                            Action::SelectCardAbove => self
                                .get_previous_card_in_default_order(originally_selected_card_id)
                                .unwrap(),
                            _ => unreachable!(),
                        };

                        self.interaction_state.view = InteractionView::Default {
                            selected_card_id: Some(new_selected_card_id),
                        };

                        Ok(())
                    }
                }
            }

            Action::SetCurrentCardText { text } => {
                let selected_card_id = self.get_selected_card_id()?;
                self.cards.get_mut(&selected_card_id).unwrap().text = text.to_owned();
                Ok(())
            }

            Action::AddTagToCurrentCard { tag } => {
                todo!()
            }

            Action::DeleteTagFromCurrentCard { tag } => {
                todo!()
            }
        }
    }

    /// Get the ID of the currently-selected card, or return an error.
    fn get_selected_card_id(&self) -> Result<CardId, BoardError> {
        match self.interaction_state.view {
            InteractionView::Default { selected_card_id } => {
                selected_card_id.ok_or(BoardError::NoCardSelected)
            }
        }
    }

    /// Returns `None` if there are no cards.
    fn get_current_min_card_id(&self) -> Option<CardId> {
        self.cards.keys().next().map(|id| *id)
    }

    /// Returns `None` if there are no cards.
    fn get_current_max_card_id(&self) -> Option<CardId> {
        self.cards.keys().last().map(|id| *id)
    }

    /// Returns `None` if there are no cards (and so no card is selected).
    fn get_next_card_in_default_order(&self, card_id: CardId) -> Option<CardId> {
        let index = self.cards.keys().position(|id| *id == card_id)?;
        self.cards.keys().nth(index.saturating_add(1)).map(|id| *id)
    }

    /// Returns `None` if there are no cards (and so no card is selected).
    fn get_previous_card_in_default_order(&self, card_id: CardId) -> Option<CardId> {
        let index = self.cards.keys().position(|id| *id == card_id)?;
        self.cards.keys().nth(index.saturating_sub(1)).map(|id| *id)
    }

    /// Get the next card ID for a new card.
    fn get_next_card_id(&mut self) -> CardId {
        let next_card_id = self.next_card_id;
        self.next_card_id = self.next_card_id.next();
        next_card_id
    }
}

#[derive(Debug, Error)]
pub enum BoardError {
    #[error("serde error")]
    SerdeError(#[from] serde_json::Error),

    #[error("I/O error")]
    IoError(#[from] io::Error),

    #[error("no such card with ID '{0}'")]
    NoSuchCard(CardId),

    #[error("no such category")]
    NoSuchCategory,

    #[error("no such column")]
    NoSuchColumn,

    #[error("supplied position '{0}' was out of bounds")]
    PositionOutOfBounds(usize),

    #[error("card doesn't have the specified tag")]
    CardDoesntHaveTag,

    #[error("card error: {0}")]
    CardError(#[from] CardError),

    #[error("no card selected")]
    NoCardSelected,
}

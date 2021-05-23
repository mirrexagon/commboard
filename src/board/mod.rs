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
    //SetCurrentCardText { text: String },
    //AddTagToCurrentCard { tag: Tag },
    //DeleteTagFromCurrentCard { card_id: CardId, tag: Tag },
}

/// The state of a session interacting with the board.
/// TOOD: Track whether the selected card is being viewed, so the UI can keep rendering everything declaratively
#[derive(Debug, Serialize)]
#[serde(tag = "type")]
pub enum InteractionState {
    /// Viewing default view with no card selected.
    NothingSelected,

    /// Viewing default view with a card selected.
    DefaultView { selected_card_id: CardId },
    // Viewing a category, with a card selected.
    // CategoryView {
    //     selected_tag: Tag,
    //     selected_card_id: CardId,
    // },
}

impl Default for InteractionState {
    fn default() -> Self {
        InteractionState::NothingSelected
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Board {
    name: String,

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

                match self.interaction_state {
                    InteractionState::NothingSelected | InteractionState::DefaultView { .. } => {
                        // The new card was added to the end of the view, select it.
                        self.interaction_state = InteractionState::DefaultView {
                            selected_card_id: new_card_id,
                        };
                        Ok(())
                    }
                }
            }

            Action::DeleteCurrentCard => match self.interaction_state {
                InteractionState::NothingSelected => Err(BoardError::NoCardSelected),

                InteractionState::DefaultView {
                    selected_card_id: to_remove_card_id,
                } => {
                    self.cards.remove(&to_remove_card_id);

                    self.interaction_state =
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

                            InteractionState::DefaultView {
                                selected_card_id: new_selected_card_id,
                            }
                        } else {
                            // There are no more cards.
                            InteractionState::NothingSelected
                        };
                    Ok(())
                }
            },
        }
    }

    fn get_current_max_card_id(&self) -> Option<CardId> {
        self.cards.keys().last().map(|id| *id)
    }

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

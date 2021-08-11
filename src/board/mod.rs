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
    Empty,
    Default {
        selected_card_id: CardId,
    },
    Category {
        /// A tag represents a column in a category.
        selected_tag: Tag,
        selected_card_id: CardId,
    },
}

/// The state of a session interacting with the board.
///
/// - If neither a card or tag is selected, the board is empty.
/// - If only a card is selected, the default all card view is shown.
/// - If both a card and a tag are selected, the category view for that tag is shown, with that card selected.
/// - If no card is selected but a tag is selected, that is invalid.
#[derive(Debug, Serialize)]
struct InteractionState {
    selected_card_id: Option<CardId>,
    selected_tag: Option<Tag>,
    filter: String,
}

impl Default for InteractionState {
    fn default() -> Self {
        InteractionState {
            selected_card_id: None,
            selected_tag: None,
            filter: String::new(),
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Board {
    name: String,

    cards: BTreeMap<CardId, Card>,
    next_card_id: CardId,
    card_order: Vec<CardId>,

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
            card_order: Vec::new(),

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

    /// Get the next card ID for a new card and increment the next ID.
    fn get_next_card_id(&mut self) -> CardId {
        let next_card_id = self.next_card_id;
        self.next_card_id = self.next_card_id.next();
        next_card_id
    }

    // -- Viewing the board --
    pub fn get_state_as_json(&self) -> serde_json::Value {
        json!({
            "board_name": self.name,

            "cards": self.cards,
            "card_order": self.card_order,

            "categories": self.get_categories(),

            "interaction_state": self.interaction_state,

            // TODO: Fix this
            "current_category_view": if let Some(selected_card_id) = self.interaction_state.selected_card_id {
                Some(self.get_category(selected_tag.category()),
            } else { None },
        })
    }

    /// Returns a list of all categories in the board, in alphabetical order.
    fn get_categories(&self) -> Vec<String> {
        let mut categories: Vec<_> = self
            .get_all_tags()
            .into_iter()
            .map(|tag| tag.category().to_owned())
            .collect();

        categories.sort();
        categories.dedup();

        categories
    }

    /// Returns a map of tag values (column names) to a vector of the cards with
    /// that tag (columns).
    fn get_category(&self, category: &str) -> BTreeMap<String, Vec<CardId>> {
        self.get_tags_with_category(category)
            .iter()
            .map(|tag| (tag.column().to_owned(), self.get_cards_with_tag(tag)))
            .collect()
    }

    /// Returns a vector of all cards with this tag, in the global card order.
    ///
    /// Such a vector is equivalent to a column.
    fn get_cards_with_tag(&self, tag: &Tag) -> Vec<CardId> {
        self.card_order
            .iter()
            .map(|card_id| *card_id)
            .filter(|card_id| self.cards.get(card_id).unwrap().has_tag(tag))
            .collect()
    }

    /// Returns a vector of all tags with the specified category.
    fn get_tags_with_category(&self, category: &str) -> Vec<Tag> {
        self.get_all_tags()
            .into_iter()
            .filter(|tag| tag.category() == category)
            .collect()
    }

    /// Returns a list of all the tags in the board, in alphabetical order.
    fn get_all_tags(&self) -> Vec<Tag> {
        let mut tags: Vec<Tag> = self
            .cards
            .values()
            .flat_map(|card| card.get_tags().into_iter())
            .collect();

        tags.sort();
        tags
    }

    // -- Manipulating the board --
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
                    InteractionView::Empty | InteractionView::Default { .. } => {
                        self.interaction_state.view = InteractionView::Default {
                            selected_card_id: new_card_id,
                        };

                        Ok(())
                    }

                    InteractionView::Category {
                        selected_tag,
                        selected_card_id,
                    } => {
                        self
                        self.interaction_state.view = InteractionView::Category {
                        }


                        Ok(())
                        },
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
                let selected_card_id = self.get_selected_card_id()?;
                let selected_card = self.cards.get_mut(&selected_card_id).unwrap();

                if selected_card.has_tag(tag) {
                    return Err(BoardError::CardAlreadyHasTag);
                }

                // Add tag to the card itself.
                selected_card.add_tag(tag);

                // Add a position for this column if it is not already present.
                if !self.column_position_in_category.contains_key(tag) {
                    self.column_position_in_category.insert(
                        tag.clone(),
                        self.get_next_column_position_in_category(tag.category()),
                    );
                }

                // Add this card to the column associated with this tag.
                self.card_position_in_column.insert(
                    (selected_card_id, tag.clone()),
                    self.get_next_card_position_for_column(tag),
                );

                // TODO: Debug assert that the two maps have no gaps in the positions of columns/cards.

                Ok(())
            }

            Action::DeleteTagFromCurrentCard { tag } => {
                let selected_card_id = self.get_selected_card_id()?;
                let selected_card = self.cards.get_mut(&selected_card_id).unwrap();

                if !selected_card.has_tag(tag) {
                    return Err(BoardError::CardDoesntHaveTag);
                }

                // Remove tag from the card itself.
                selected_card.delete_tag(tag);

                // Remove this card from the column associated with this tag.
                {
                    // Move the other cards up.
                    let cards = self.get_cards_in_column_ordered(tag);
                    let card_index = cards
                        .iter()
                        .position(|card_id| *card_id == selected_card_id)
                        .unwrap();

                    self.card_position_in_column
                        .remove(&(selected_card_id, tag.clone()));

                    for (card_id, pos) in self.card_position_in_column.iter_mut() {
                        if *pos > card_index {
                            *pos -= 1;
                        }
                    }
                }

                // If there are no more cards in this column, remove the column.
                if self.get_cards_in_column_ordered(tag).is_empty() {
                    let columns = self.get_columns_in_category_ordered(tag.category());
                    let tag_column_index = columns
                        .iter()
                        .position(|column| tag.column() == column)
                        .unwrap();

                    self.column_position_in_category.remove(tag);

                    // Move the other columns up.
                    for (tag, pos) in self.column_position_in_category.iter_mut() {
                        if *pos > tag_column_index {
                            *pos -= 1;
                        }
                    }
                }

                // TODO: Debug assert that the two maps have no gaps in the positions of columns/cards.

                Ok(())
            }
        }
    }

    /// Returns the ID of the currently-selected card, or an error if no card is selected.
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
        self.cards
            .keys()
            .nth(index.saturating_add(1).clamp(0, self.cards.len() - 1))
            .map(|id| *id)
    }

    /// Returns `None` if there are no cards (and so no card is selected).
    fn get_previous_card_in_default_order(&self, card_id: CardId) -> Option<CardId> {
        let index = self.cards.keys().position(|id| *id == card_id)?;
        self.cards.keys().nth(index.saturating_sub(1)).map(|id| *id)
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

    #[error("card already has the specified tag")]
    CardAlreadyHasTag,

    #[error("no card selected")]
    NoCardSelected,
}

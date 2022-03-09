use std::collections::BTreeMap;
use std::fs::File;
use std::io;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};
use serde_json::json;

use thiserror::Error;

mod card;
mod tag;

#[cfg(test)]
mod tests;

pub use card::{Card, CardId};
pub use tag::Tag;

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum Action {
    SetBoardName { name: String },
    NewCard,
    DeleteCurrentCard,
    SelectCardVerticalOffset { offset: isize },
    SelectCardHorizontalOffset { offset: isize },
    MoveCurrentCardVerticalOffset { offset: isize },
    MoveCurrentCardHorizontalInCategory { offset: isize },
    SetCurrentCardText { text: String },
    AddTagToCurrentCard { tag: Tag },
    DeleteTagFromCurrentCard { tag: Tag },
    ViewDefault,
    ViewCategory { category: String },
    //SetFilter { filter: String },
}

/// The state of a session interacting with the board.
///

#[derive(Debug, Serialize)]
struct InteractionState {
    selection: CardSelection,
    filter: String,
}

impl Default for InteractionState {
    fn default() -> Self {
        Self {
            selection: Default::default(),
            filter: String::new(),
        }
    }
}

/// - If neither a card or tag is selected, the board is empty.
/// - If only a card is selected, the default all card view is shown.
/// - If both a card and a tag are selected, the category view for that tag is shown, with that card selected.
/// - If no card is selected but a tag is selected, that is invalid.
#[derive(Debug, Serialize)]
struct CardSelection {
    card_id: Option<CardId>,
    tag: Option<Tag>,
}

impl Default for CardSelection {
    fn default() -> Self {
        Self {
            card_id: None,
            tag: None,
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
        board.interaction_state = InteractionState {
            selection: CardSelection {
                card_id: board.card_order.get(0).map(|id| *id),
                ..Default::default()
            },
            ..Default::default()
        };

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
        let current_category_view = match &self.interaction_state.selection.tag {
            Some(tag) => Some(self.get_category(tag.category())),
            None => None,
        };

        json!({
            "board_name": self.name,

            "cards": self.cards,
            "card_order": self.card_order,

            "categories": self.get_categories(),
            "tags": self.get_all_tags(),

            "interaction_state": self.interaction_state,

            "current_category_view": current_category_view
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

    fn get_cards_with_category(&self, category: &str) -> Vec<CardId> {
        self.card_order
            .iter()
            .map(|card_id| *card_id)
            .filter(|card_id| self.cards.get(card_id).unwrap().has_category(category))
            .collect()
    }

    /// Returns a vector of all tags with the specified category, in
    /// alphabetical order.
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
        tags.dedup();
        tags
    }

    // -- Manipulating the board --
    pub fn perform_action(&mut self, action: &Action) -> Result<(), BoardError> {
        // Remember to validate everything before performing the action, so it is atomic!

        let result = match action {
            Action::SetBoardName { name } => {
                self.name = name.to_owned();
                Ok(())
            }

            Action::NewCard => {
                let new_card_id = self.get_next_card_id();
                self.cards.insert(new_card_id, Card::new(new_card_id));

                // Insert the new card into the order after the current card.
                if let Some(selected_card_id) = self.interaction_state.selection.card_id {
                    let insert_at_index = self
                        .card_order
                        .iter()
                        .position(|card_id| *card_id == selected_card_id)
                        .unwrap()
                        + 1;

                    if insert_at_index < self.card_order.len() {
                        self.card_order.insert(insert_at_index, new_card_id)
                    } else {
                        self.card_order.push(new_card_id);
                    }
                } else {
                    // There are no cards, just push this one on.
                    self.card_order.push(new_card_id);
                }

                // Select the new card.
                self.interaction_state.selection.card_id = Some(new_card_id);

                // If we are viewing a tag, add that tag to the card.
                if let Some(selected_tag) = &self.interaction_state.selection.tag {
                    self.cards
                        .get_mut(&new_card_id)
                        .unwrap()
                        .add_tag(&selected_tag);
                }

                Ok(())
            }

            Action::DeleteCurrentCard => {
                let selected_card_id = self.get_selected_card_id()?;

                self.interaction_state.selection = self.get_next_selection_card_after_delete()?;

                let global_index_to_remove = self
                    .card_order
                    .iter()
                    .position(|card_id| *card_id == selected_card_id)
                    .unwrap();

                self.card_order.remove(global_index_to_remove);
                self.cards.remove(&selected_card_id);

                Ok(())
            }

            Action::SelectCardVerticalOffset { offset } => {
                // Ensure a card is selected.
                self.get_selected_card_id()?;

                let card_id = match self.get_card_at_offset_from_current_in_current_view(*offset)? {
                    CardOffsetResult::Ok(card_id) => card_id,
                    CardOffsetResult::Clamped(card_id) => card_id,
                };

                self.interaction_state.selection.card_id = Some(card_id);

                Ok(())
            }

            Action::SelectCardHorizontalOffset { offset } => {
                let selected_card_id = self.get_selected_card_id()?;

                let selected_tag = match &self.interaction_state.selection.tag {
                    Some(tag) => tag,
                    None => return Err(BoardError::NotInCategoryView),
                };

                let tags_in_category = self.get_tags_with_category(selected_tag.category());
                let current_tag_in_category_index = tags_in_category
                    .iter()
                    .position(|t| t == selected_tag)
                    .unwrap() as isize;
                let target_tag_in_category_index = (current_tag_in_category_index + offset)
                    .clamp(0, (tags_in_category.len() as isize) - 1)
                    as usize;
                let target_tag = &tags_in_category[target_tag_in_category_index];

                let cards_in_tag = self.get_cards_with_tag(selected_tag);
                let current_card_in_tag_index = cards_in_tag
                    .iter()
                    .position(|c| *c == selected_card_id)
                    .unwrap() as isize;

                let cards_in_target_tag = self.get_cards_with_tag(&target_tag);
                let target_card_in_tag_index = current_card_in_tag_index
                    .clamp(0, (cards_in_target_tag.len() as isize) - 1)
                    as usize;
                let target_card_id = cards_in_target_tag[target_card_in_tag_index];

                self.interaction_state.selection.card_id = Some(target_card_id);
                self.interaction_state.selection.tag = Some(target_tag.clone());

                Ok(())
            }

            Action::MoveCurrentCardVerticalOffset { offset } => {
                let selected_card_id = self.get_selected_card_id()?;
                let selected_card_index_in_order = self
                    .card_order
                    .iter()
                    .position(|card_id| *card_id == selected_card_id)
                    .unwrap();

                let target_index_in_card_order = match &self.interaction_state.selection.tag {
                    Some(tag) => {
                        let card_in_target_spot = match self
                            .get_card_at_offset_from_current_in_current_view(*offset)
                            .unwrap()
                        {
                            CardOffsetResult::Ok(card_id) => card_id,
                            CardOffsetResult::Clamped(card_id) => card_id,
                        };

                        self.card_order
                            .iter()
                            .position(|c| *c == card_in_target_spot)
                            .unwrap()
                    }
                    None => ((selected_card_index_in_order as isize) + offset)
                        .clamp(0, (self.card_order.len() - 1) as isize)
                        as usize,
                } as usize;

                self.card_order.remove(selected_card_index_in_order);

                self.card_order
                    .insert(target_index_in_card_order, selected_card_id);

                Ok(())
            }

            Action::MoveCurrentCardHorizontalInCategory { offset } => {
                // Ensure a card is selected.
                self.get_selected_card_id()?;

                let selected_tag = match &self.interaction_state.selection.tag {
                    Some(tag) => tag.clone(),
                    None => return Err(BoardError::NotInCategoryView),
                };

                let tags_in_category = self.get_tags_with_category(selected_tag.category());
                let current_tag_in_category_index = tags_in_category
                    .iter()
                    .position(|t| *t == selected_tag)
                    .unwrap() as isize;
                let target_tag_in_category_index = (current_tag_in_category_index + offset)
                    .clamp(0, (tags_in_category.len() as isize) - 1)
                    as usize;
                let target_tag = &tags_in_category[target_tag_in_category_index];

                self.perform_action(&Action::DeleteTagFromCurrentCard {
                    tag: selected_tag.clone(),
                })?;

                self.perform_action(&Action::AddTagToCurrentCard {
                    tag: target_tag.clone(),
                })?;

                self.interaction_state.selection.tag = Some(target_tag.clone());

                Ok(())
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

                Ok(())
            }

            Action::ViewDefault => {
                if self.interaction_state.selection.tag.is_some() {
                    self.interaction_state.selection.tag = None;
                    Ok(())
                } else {
                    Err(BoardError::NoTagSelected)
                }
            }

            Action::ViewCategory { category } => {
                if self.get_categories().contains(&category) {
                    let selected_card_id = self.get_selected_card_id()?;
                    let selected_card = self.cards.get(&selected_card_id).unwrap();

                    if selected_card.has_category(category) {
                        self.interaction_state.selection.card_id = Some(selected_card_id);
                        self.interaction_state.selection.tag =
                            Some(selected_card.get_tags_with_category(category)[0].clone());

                        Ok(())
                    } else {
                        let nearest_card_in_category = self
                            .get_cards_by_distance_from_selected()?
                            .into_iter()
                            .skip_while(|card_id| {
                                !self.cards.get(&card_id).unwrap().has_category(category)
                            })
                            .next()
                            .unwrap();

                        self.interaction_state.selection.card_id = Some(nearest_card_in_category);
                        self.interaction_state.selection.tag = Some(
                            self.cards
                                .get(&nearest_card_in_category)
                                .unwrap()
                                .get_tags_with_category(category)[0]
                                .clone(),
                        );

                        Ok(())
                    }
                } else {
                    Err(BoardError::NoSuchCategory)
                }
            }
        };

        if result.is_ok() {
            self.save()?;
        }

        result
    }

    /// Get the list of cards ordered by their distance from the selected card in the overall card order.
    /// The list excludes the selected card.
    ///
    /// Goes card below, card above, card two slots below, card two slots above, etc.
    fn get_cards_by_distance_from_selected(&self) -> Result<Vec<CardId>, BoardError> {
        let selected_card_id = self.get_selected_card_id()?;
        let selected_card_index_in_order = self
            .card_order
            .iter()
            .position(|card_id| *card_id == selected_card_id)
            .unwrap();

        let mut elements_before = Vec::new();
        let mut elements_after = Vec::new();

        for i in 0..selected_card_index_in_order {
            elements_before.push(self.card_order[i]);
        }

        for i in (selected_card_index_in_order + 1)..self.card_order.len() {
            elements_after.push(self.card_order[i]);
        }
        elements_after.reverse();

        let mut result = Vec::new();

        while !elements_before.is_empty() || !elements_after.is_empty() {
            if let Some(card_id) = elements_after.pop() {
                result.push(card_id);
            }

            if let Some(card_id) = elements_before.pop() {
                result.push(card_id);
            }
        }

        Ok(result)
    }

    fn get_next_selection_card_after_delete(&self) -> Result<CardSelection, BoardError> {
        // If selecting a tag. try:
        // - Next card in cards with tag in global order.
        // - Previous card with tag in global order.
        // - Next card with same category.
        // - Previous card with same category.
        // - Fall back to default rules.

        // If in default view, try:
        // - Next card in global card order.
        // - Previous card in global card order.
        // - Select nothing.

        if let Some(tag) = &self.interaction_state.selection.tag {
            let cards_with_tag = self.get_cards_with_tag(&tag);

            if let CardOffsetResult::Ok(card_id) =
                self.get_card_at_offset_from_current_in_list(&cards_with_tag, 1)?
            {
                return Ok(CardSelection {
                    card_id: Some(card_id),
                    tag: Some(tag.clone()),
                });
            }

            if let CardOffsetResult::Ok(card_id) =
                self.get_card_at_offset_from_current_in_list(&cards_with_tag, -1)?
            {
                return Ok(CardSelection {
                    card_id: Some(card_id),
                    tag: Some(tag.clone()),
                });
            }

            let cards_with_category = self.get_cards_with_category(tag.category());

            if let CardOffsetResult::Ok(card_id) =
                self.get_card_at_offset_from_current_in_list(&cards_with_category, 1)?
            {
                return Ok(CardSelection {
                    card_id: Some(card_id),
                    tag: Some(tag.clone()),
                });
            }

            if let CardOffsetResult::Ok(card_id) =
                self.get_card_at_offset_from_current_in_list(&cards_with_category, -1)?
            {
                return Ok(CardSelection {
                    card_id: Some(card_id),
                    tag: Some(tag.clone()),
                });
            }
        }

        if let CardOffsetResult::Ok(card_id) =
            self.get_card_at_offset_from_current_in_list(&self.card_order, 1)?
        {
            return Ok(CardSelection {
                card_id: Some(card_id),
                tag: None,
            });
        }

        if let CardOffsetResult::Ok(card_id) =
            self.get_card_at_offset_from_current_in_list(&self.card_order, -1)?
        {
            return Ok(CardSelection {
                card_id: Some(card_id),
                tag: None,
            });
        }

        Ok(CardSelection {
            card_id: None,
            tag: None,
        })
    }

    fn get_selected_card_id(&self) -> Result<CardId, BoardError> {
        self.interaction_state
            .selection
            .card_id
            .ok_or(BoardError::NoCardSelected)
    }

    fn get_card_at_offset_from_current_in_current_view(
        &self,
        offset: isize,
    ) -> Result<CardOffsetResult, BoardError> {
        let cards;

        if let Some(tag) = &self.interaction_state.selection.tag {
            cards = self.get_cards_with_tag(&tag);
        } else {
            cards = self.card_order.clone();
        }

        self.get_card_at_offset_from_current_in_list(&cards, offset)
    }

    // Panics if the currently-selected card is not in the list provided.
    fn get_card_at_offset_from_current_in_list(
        &self,
        cards: &[CardId],
        offset: isize,
    ) -> Result<CardOffsetResult, BoardError> {
        let selected_card_id = self.get_selected_card_id()?;

        let selected_index = cards
            .iter()
            .position(|card_id| *card_id == selected_card_id)
            .unwrap() as isize;

        let next_index = selected_index + offset;

        Ok(if next_index < 0 || next_index >= cards.len() as isize {
            let next_index = next_index.clamp(0, cards.len() as isize - 1);
            CardOffsetResult::Clamped(cards[next_index as usize])
        } else {
            CardOffsetResult::Ok(cards[next_index as usize])
        })
    }
}

enum CardOffsetResult {
    Ok(CardId),
    Clamped(CardId),
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

    #[error("no tag selected")]
    NoTagSelected,

    #[error("not in category view")]
    NotInCategoryView,
}

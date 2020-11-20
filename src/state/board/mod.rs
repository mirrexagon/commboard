use std::collections::HashMap;
use std::fmt;

use serde::{Deserialize, Serialize};
use thiserror::Error;

mod card;
mod tag;

pub use card::{Card, CardId};
pub use tag::Tag;

use card::CardError;

#[derive(Debug, Clone, Copy, PartialOrd, Ord, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct BoardId(u64);

impl BoardId {
    pub fn new(id: u64) -> BoardId {
        BoardId(id)
    }

    pub fn next(self) -> BoardId {
        BoardId(self.0 + 1)
    }

    pub fn as_integer(&self) -> u64 {
        self.0
    }
}

impl fmt::Display for BoardId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.as_integer())
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Board {
    id: BoardId,
    pub name: String,

    cards: HashMap<CardId, Card>,
    next_card_id: CardId,

    /// Default ordering of cards if no category view is active.
    default_card_order: Vec<CardId>,

    categories: Vec<Category>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Category {
    /// The category part of the tag.
    name: String,
    columns: Vec<Column>,
}

impl Category {
    pub fn name(&self) -> &str {
        &self.name
    }

    pub fn columns(&self) -> &[Column] {
        &self.columns
    }

    fn add_card_tag(&mut self, card_id: CardId, tag: &Tag) -> Result<(), BoardError> {
        // If the column doesn't exist, create it.
        let column = match self.get_column_mut(tag) {
            Some(column) => column,
            None => {
                self.columns.push(Column {
                    name: tag.category().to_owned(),
                    cards: Vec::new(),
                });

                self.columns.last_mut().unwrap()
            }
        };

        column.add_card(card_id);

        Ok(())
    }

    fn delete_card_tag(&mut self, card_id: CardId, tag: &Tag) -> Result<(), BoardError> {
        if let Some(column_pos) = self.get_column_position(tag) {
            self.columns[column_pos].delete_card(card_id)?;

            // If the column has no cards now, remove it.
            if self.columns[column_pos].cards.is_empty() {
                self.columns.remove(column_pos);
            }

            Ok(())
        } else {
            Err(BoardError::NoSuchCard(card_id))
        }
    }

    /// Index one past the end of the array (ie. the length) means put it at the end, instead of inserting between columns.
    fn move_column(&mut self, tag: &Tag, to_pos: usize) -> Result<(), BoardError> {
        let from_pos = self
            .get_column_position(tag)
            .ok_or(BoardError::NoSuchColumn)?;

        if to_pos > self.columns.len() {
            return Err(BoardError::IndexOutOfBounds(to_pos));
        }

        let column = self.columns.remove(from_pos);

        if to_pos == self.columns.len() {
            self.columns.push(column);
        } else {
            self.columns.insert(to_pos, column);
        }

        Ok(())
    }

    fn get_column_mut(&mut self, tag: &Tag) -> Option<&mut Column> {
        match self.get_column_position(tag) {
            Some(pos) => Some(&mut self.columns[pos]),
            None => None,
        }
    }

    fn get_column_position(&self, tag: &Tag) -> Option<usize> {
        self.columns
            .iter()
            .position(|column| column.name == tag.value())
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Column {
    /// The value part of the tag.
    name: String,
    cards: Vec<CardId>,
}

impl Column {
    pub fn name(&self) -> &str {
        &self.name
    }

    pub fn cards(&self) -> &[CardId] {
        &self.cards
    }

    fn add_card(&mut self, card_id: CardId) {
        self.cards.push(card_id);
    }

    fn delete_card(&mut self, card_id: CardId) -> Result<(), BoardError> {
        if let Some(pos) = self.get_card_position(card_id) {
            self.cards.remove(pos);
            Ok(())
        } else {
            Err(BoardError::NoSuchCard(card_id))
        }
    }

    /// Index one past the end of the array (ie. the length) means put it at the end, instead of inserting between cards.
    fn move_card(&mut self, card_id: CardId, to_pos: usize) -> Result<(), BoardError> {
        let from_pos = self
            .get_card_position(card_id)
            .ok_or(BoardError::NoSuchCard(card_id))?;

        if to_pos > self.cards.len() {
            return Err(BoardError::IndexOutOfBounds(to_pos));
        }

        self.cards.remove(from_pos);

        if to_pos == self.cards.len() {
            self.cards.push(card_id);
        } else {
            self.cards.insert(to_pos, card_id);
        }

        Ok(())
    }

    fn get_card_position(&self, card_id: CardId) -> Option<usize> {
        self.cards.iter().position(|&id| id == card_id)
    }
}

impl Board {
    /// Creates a new empty board.
    pub fn new(id: BoardId) -> Self {
        Self {
            id,
            name: format!("Board {}", id.as_integer()),

            cards: HashMap::new(),
            next_card_id: CardId::new(0),

            default_card_order: Vec::new(),
            categories: Vec::new(),
        }
    }

    fn get_next_card_id(&mut self) -> CardId {
        let next_card_id = self.next_card_id;
        self.next_card_id = self.next_card_id.next();
        next_card_id
    }

    pub fn id(&self) -> BoardId {
        self.id
    }

    pub fn cards(&self) -> &HashMap<CardId, Card> {
        &self.cards
    }

    pub fn default_card_order(&self) -> &[CardId] {
        &self.default_card_order
    }

    pub fn categories(&self) -> &[Category] {
        &self.categories
    }

    // -- Cards --
    /// Creates a new card with no tags and no text, and returns its ID.
    pub fn new_card(&mut self) -> CardId {
        let id = self.get_next_card_id();
        self.cards.insert(id, Card::new(id));
        self.default_card_order.push(id);
        id
    }

    /// Deletes a card from the board.
    pub fn delete_card(&mut self, card_id: CardId) -> Result<(), BoardError> {
        if !self.cards.contains_key(&card_id) {
            return Err(BoardError::NoSuchCard(card_id));
        }

        // Remove from default order.
        {
            let pos = self
                .default_card_order
                .iter()
                .position(|&i| i == card_id)
                .unwrap();

            self.default_card_order.remove(pos);
        }

        // Remove from categories.
        // Need to build this separately because otherwise self is kept borrowed immutably in the loop.
        let mut card_tags = Vec::new();
        for tag in self.cards[&card_id].get_tags() {
            card_tags.push(tag.clone());
        }

        for tag in card_tags.iter() {
            let category = self.get_category_mut(tag).expect(&format!(
                "tried to delete card '{}' from board, but it had tag '{}' and its category did not exist",
                card_id,
                tag.tag()
            ));
            category.delete_card_tag(card_id, tag).expect(&format!("tried to delete card '{}' from board, but it had tag '{}' and its column in the category did not exist or did not contain the card", card_id, tag.tag()));
        }

        // Remove from main hashmap.
        self.cards.remove(&card_id);

        Ok(())
    }

    /// Returns a reference to the card with the specified ID, or `None` if
    /// the specified card does not exist.
    pub fn get_card(&self, id: CardId) -> Option<&Card> {
        self.cards.get(&id)
    }

    /// Returns a mutable reference to the card with the specified ID, or
    /// `None` if the specified card does not exist.
    pub fn get_card_mut(&mut self, id: CardId) -> Option<&mut Card> {
        self.cards.get_mut(&id)
    }

    pub fn set_card_text<S: Into<String>>(
        &mut self,
        id: CardId,
        text: S,
    ) -> Result<(), BoardError> {
        if let Some(card) = self.get_card_mut(id) {
            card.text = text.into();
            Ok(())
        } else {
            Err(BoardError::NoSuchCard(id))
        }
    }

    pub fn move_card_within_default_card_order(
        &mut self,
        id: CardId,
        new_index: usize,
    ) -> Result<(), BoardError> {
        if new_index >= self.default_card_order.len() {
            return Err(BoardError::IndexOutOfBounds(new_index));
        }

        if let Some(old_index) = self.default_card_order.iter().position(|&i| i == id) {
            self.default_card_order.remove(old_index);
            self.default_card_order.insert(new_index, id);
            Ok(())
        } else {
            Err(BoardError::NoSuchCard(id))
        }
    }

    /// Adds a tag to a card in the board.
    pub fn add_card_tag(&mut self, card_id: CardId, tag: &Tag) -> Result<(), BoardError> {
        // Add tag to card object.
        let card = self
            .get_card_mut(card_id)
            .ok_or(BoardError::NoSuchCard(card_id))?;
        card.add_tag(tag.clone())?;

        // Add card to its category, creating the category for this tag if it doesn't exist.
        let category = match self.get_category_mut(tag) {
            Some(category) => category,
            None => {
                self.categories.push(Category {
                    name: tag.category().to_owned(),
                    columns: Vec::new(),
                });

                self.categories.last_mut().unwrap()
            }
        };

        category.add_card_tag(card_id, tag);

        Ok(())
    }

    /// Deletes a tag from a card in the board.
    pub fn delete_card_tag(&mut self, card_id: CardId, tag: &Tag) -> Result<(), BoardError> {
        // Delete tag from card object.
        let card = self
            .get_card_mut(card_id)
            .ok_or(BoardError::NoSuchCard(card_id))?;
        card.delete_tag(tag)?;

        // Delete the card from its category/column.
        let category_pos = self.get_category_position(tag).expect(&format!(
            "tried to delete card '{}' tag '{}' from board, but the tag's category did not exist",
            card_id,
            tag.tag()
        ));

        self.categories[category_pos]
            .delete_card_tag(card_id, tag)
            .expect(&format!(
                "tried to delete card '{}' tag '{}' from board, but the tag's column did not exist",
                card_id,
                tag.tag()
            ));

        // If the category has no columns now, remove it.
        if self.categories[category_pos].columns.is_empty() {
            self.categories.remove(category_pos);
        }

        Ok(())
    }

    fn get_category_mut(&mut self, tag: &Tag) -> Option<&mut Category> {
        match self.get_category_position(tag) {
            Some(pos) => Some(&mut self.categories[pos]),
            None => None,
        }
    }

    fn get_category_position(&self, tag: &Tag) -> Option<usize> {
        self.categories
            .iter()
            .position(|category| category.name == tag.category())
    }
}

#[derive(Debug, Error)]
pub enum BoardError {
    #[error("no such card with ID '{0}'")]
    NoSuchCard(CardId),

    #[error("supplied index '{0}' was out of bounds")]
    IndexOutOfBounds(usize),

    #[error("column does not exist in category")]
    NoSuchColumn,

    #[error("card error: {0}")]
    CardError(#[from] CardError),
}

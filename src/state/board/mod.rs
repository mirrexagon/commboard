use std::collections::HashMap;
use std::fmt;

use serde::{Deserialize, Serialize};
use thiserror::Error;

mod card;
mod tag;

mod bycategory;

pub use card::{Card, CardId};
pub use tag::Tag;

use bycategory::{ByCategory, ByCategoryError};
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
    default_order: Vec<CardId>,

    cards_by_category: ByCategory,
}

impl Board {
    /// Creates a new empty board.
    pub fn new(id: BoardId) -> Self {
        Self {
            id,
            name: format!("Board {}", id.as_integer()),

            cards: HashMap::new(),
            next_card_id: CardId::new(0),

            default_order: Vec::new(),
            cards_by_category: ByCategory::new(),
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

    pub fn default_order(&self) -> &[CardId] {
        &self.default_order
    }

    pub fn cards_by_category(&self) -> &ByCategory {
        &self.cards_by_category
    }

    // -- Cards --
    /// Creates a new card with no tags and no text, and returns its ID.
    pub fn new_card(&mut self) -> CardId {
        let id = self.get_next_card_id();
        self.cards.insert(id, Card::new(id));
        id
    }

    /// Deletes a card from the board.
    pub fn delete_card(&mut self, id: CardId) -> Result<(), BoardError> {
        if let Some(_) = self.cards.remove(&id) {
            let index = self.default_order.iter().position(|&i| i == id).unwrap();
            self.default_order.remove(index);
            Ok(())
        } else {
            Err(BoardError::NoSuchCard(id))
        }
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

    pub fn move_card_within_default_order(
        &mut self,
        id: CardId,
        new_index: usize,
    ) -> Result<(), BoardError> {
        if new_index >= self.default_order.len() {
            return Err(BoardError::IndexOutOfBounds(new_index));
        }

        if let Some(old_index) = self.default_order.iter().position(|&i| i == id) {
            self.default_order.remove(old_index);
            self.default_order.insert(new_index, id);
            Ok(())
        } else {
            Err(BoardError::NoSuchCard(id))
        }
    }

    /// Adds a tag to a card in the board.
    pub fn add_card_tag(&mut self, id: CardId, tag: &Tag) -> Result<(), BoardError> {
        let card = self.get_card_mut(id).ok_or(BoardError::NoSuchCard(id))?;
        card.add_tag(tag.clone())?;
        self.cards_by_category.add_card_tag(id, tag)?;
        Ok(())
    }

    /// Deletes a tag from a card in the board.
    pub fn delete_card_tag(&mut self, id: CardId, tag: &Tag) -> Result<(), BoardError> {
        let card = self.get_card_mut(id).ok_or(BoardError::NoSuchCard(id))?;
        card.delete_tag(tag)?;
        self.cards_by_category.delete_card_tag(id, tag)?;
        Ok(())
    }

    // -- Category rearrangement --
}

#[derive(Debug, Error)]
pub enum BoardError {
    #[error("no such card with ID '{0}' in board")]
    NoSuchCard(CardId),

    #[error("supplied index '{0}' was out of bounds")]
    IndexOutOfBounds(usize),

    #[error("card error: {0}")]
    CardError(#[from] CardError),

    #[error("bycategory error: {0}")]
    ByCategoryError(#[from] ByCategoryError),
}

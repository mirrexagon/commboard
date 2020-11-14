use std::collections::{HashMap, HashSet};

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

#[derive(Debug, Serialize, Deserialize)]
pub struct Board {
    id: BoardId,
    pub name: String,

    cards: Vec<Card>,
    next_card_id: CardId,
}

impl Board {
    pub fn new(id: BoardId) -> Self {
        Self {
            id,
            name: format!("Board {}", id.as_integer()),

            cards: Vec::new(),
            next_card_id: CardId::new(0),
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

    pub fn cards(&self) -> &Vec<Card> {
        &self.cards
    }

    /// Creates a new card with no tags and no text, and returns its ID.
    pub fn new_card(&mut self) -> CardId {
        let id = self.get_next_card_id();
        self.cards.push(Card::new(id));

        id
    }

    /// Deletes a card from the board.
    pub fn delete_card(&mut self, id: CardId) -> Result<(), BoardError> {
        if let Some(index) = self.get_index_of_card(id) {
            self.cards.remove(index);
            Ok(())
        } else {
            Err(BoardError::NoSuchCard(id))
        }
    }

    /// Returns a reference to the card with the specified ID, or `None` if
    /// the specified card does not exist.
    pub fn get_card(&self, id: CardId) -> Option<&Card> {
        if let Some(index) = self.get_index_of_card(id) {
            Some(&self.cards[index])
        } else {
            None
        }
    }

    /// Returns a mutable reference to the card with the specified ID, or
    /// `None` if the specified card does not exist.
    pub fn get_card_mut(&mut self, id: CardId) -> Option<&mut Card> {
        if let Some(index) = self.get_index_of_card(id) {
            Some(&mut self.cards[index])
        } else {
            None
        }
    }

    /// Returns `false` if no card with the given ID exists in the board.
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

    /// Adds a tag to a card in the board.
    pub fn add_card_tag(&mut self, id: CardId, tag: &Tag) -> Result<(), BoardError> {
        let card = self.get_card_mut(id).ok_or(BoardError::NoSuchCard(id))?;
        card.add_tag(tag.clone())?;
        Ok(())
    }

    /// Deletes a tag from a card in the board.
    pub fn delete_card_tag(&mut self, id: CardId, tag: &Tag) -> Result<(), BoardError> {
        let card = self.get_card_mut(id).ok_or(BoardError::NoSuchCard(id))?;
        card.delete_tag(tag)?;
        Ok(())
    }

    /// Given a `CardId`, return the index of the corresponding card in the
    /// `cards` vector, or `None` if there is no such card.
    fn get_index_of_card(&self, id: CardId) -> Option<usize> {
        for (i, card) in self.cards.iter().enumerate() {
            if card.id() == id {
                return Some(i);
            }
        }

        None
    }
}

#[derive(Debug, Error)]
pub enum BoardError {
    #[error("no such card in board")]
    NoSuchCard(CardId),

    #[error("card error: {0}")]
    CardError(#[from] CardError),
}

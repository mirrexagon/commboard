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
struct Category {
    /// The category part of the tag.
    name: String,
    columns: Vec<Column>,
}

impl Category {
    fn get_column_for_tag_mut(&mut self, tag: &Tag) -> Option<&mut Column> {
        self.columns
            .iter_mut()
            .find(|column| column.name == tag.category())
    }

    fn add_card_tag(&mut self, card_id: CardId, tag: &Tag) -> Result<(), BoardError> {
        todo!()
    }
}

#[derive(Debug, Serialize, Deserialize)]
struct Column {
    /// The value part of the tag.
    name: String,
    cards: Vec<CardId>,
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
            card_tags: Vec::new(),
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

    pub fn card_tags(&self) -> &Vec<(Tag, Vec<CardId>)> {
        &self.card_tags
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
    pub fn delete_card(&mut self, id: CardId) -> Result<(), BoardError> {
        if !self.cards.contains_key(&id) {
            return Err(BoardError::NoSuchCard(id));
        }

        // Remove from default order.
        {
            let pos = self
                .default_card_order
                .iter()
                .position(|i| *i == id)
                .unwrap();

            self.default_card_order.remove(pos);
        }

        // Remove from tags lists.
        for tag in self.cards[&id].get_tags() {
            let tag_list_index = self.get_tag_list_index(tag).unwrap();
            {
                let pos = self.card_tags[tag_list_index]
                    .1
                    .iter()
                    .position(|i| *i == id)
                    .unwrap();
                self.card_tags[tag_list_index].1.remove(pos);
            }
        }

        // Remove from main hashmap.
        self.cards.remove(&id);

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
    pub fn add_card_tag(&mut self, id: CardId, tag: &Tag) -> Result<(), BoardError> {
        // Delete tag from card object.
        let card = self.get_card_mut(id).ok_or(BoardError::NoSuchCard(id))?;
        card.add_tag(tag.clone())?;

        // Add card to tag list, creating the list for this tag if it doesn't exist.
        let mut tag_list_index = self.get_tag_list_index(tag);

        if let None = tag_list_index {
            tag_list_index = Some(self.card_tags.len());
            self.card_tags.push((tag.clone(), Vec::new()));
        }

        self.card_tags[tag_list_index.unwrap()].1.push(id);

        Ok(())
    }

    /// Deletes a tag from a card in the board.
    pub fn delete_card_tag(&mut self, id: CardId, tag: &Tag) -> Result<(), BoardError> {
        // Delete tag from card object.
        let card = self.get_card_mut(id).ok_or(BoardError::NoSuchCard(id))?;
        card.delete_tag(tag)?;

        // Delete card from tag list, removing the tag list if it is now empty.
        let tag_list_index = self.get_tag_list_index(tag).unwrap();
        {
            let pos = self.card_tags[tag_list_index]
                .1
                .iter()
                .position(|i| *i == id)
                .unwrap();
            self.card_tags[tag_list_index].1.remove(pos);
        }

        if self.card_tags[tag_list_index].1.is_empty() {
            self.card_tags.remove(tag_list_index);
        }

        Ok(())
    }

    fn get_category_for_tag(&self, tag: &Tag) -> Option<usize> {
        self.card_tags.iter().position(|pair| pair.0 == *tag)
    }
}

#[derive(Debug, Error)]
pub enum BoardError {
    #[error("no such card with ID '{0}' in board")]
    NoSuchCard(CardId),

    #[error("supplied index '{0}' was out of bounds")]
    IndexOutOfBounds(usize),

    #[error("card error: {0}")]
    CardError(#[from] CardError),
}

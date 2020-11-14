use std::collections::HashSet;

use serde::{Deserialize, Serialize};
use thiserror::Error;

use super::Tag;

#[derive(Debug, Clone, Copy, PartialOrd, Ord, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct CardId(u64);

impl CardId {
    pub fn new(id: u64) -> CardId {
        CardId(id)
    }

    pub fn next(self) -> CardId {
        CardId(self.0 + 1)
    }

    pub fn as_integer(&self) -> u64 {
        self.0
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Card {
    id: CardId,
    pub text: String,
    tags: HashSet<Tag>,
}

impl Card {
    pub fn new(id: CardId) -> Self {
        Self {
            id,
            text: String::new(),
            tags: HashSet::new(),
        }
    }

    // Returns the `CardId` of this card.
    pub fn id(&self) -> CardId {
        self.id
    }

    /// Adds a tag to the card.
    pub fn add_tag(&mut self, tag: Tag) -> Result<(), CardError> {
        if !self.tags.contains(&tag) {
            self.tags.insert(tag);
            Ok(())
        } else {
            Err(CardError::AlreadyHasTag)
        }
    }

    /// Deletes a tag from the card.
    pub fn delete_tag(&mut self, tag: &Tag) -> Result<(), CardError> {
        if self.tags.contains(&tag) {
            self.tags.remove(tag);
            Ok(())
        } else {
            Err(CardError::NoSuchTag)
        }
    }

    /// Returns a vector of all tags in this card, in alphabetical order.
    pub fn get_tags(&self) -> Vec<&Tag> {
        let mut tags_vec: Vec<_> = self.tags.iter().collect();
        tags_vec.sort();
        tags_vec
    }

    /// Returns `true` if the card has at least one tag with the given category.
    pub fn has_category(&self, category: &str) -> bool {
        for tag in &self.tags {
            if tag.category() == category {
                return true;
            }
        }

        false
    }

    /// Returns a vector of all tags with the given category, in alphabetical order.
    pub fn get_tags_with_category(&self, category: &str) -> Vec<&Tag> {
        self.get_tags()
            .into_iter()
            .filter(|tag| tag.category() == category)
            .collect()
    }
}

#[derive(Debug, Error)]
pub enum CardError {
    #[error("card already has this tag")]
    AlreadyHasTag,
    #[error("no such tag in card")]
    NoSuchTag,
}

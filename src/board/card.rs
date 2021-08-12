use std::collections::HashSet;
use std::fmt;

use serde::{Deserialize, Serialize};

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

impl fmt::Display for CardId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.as_integer())
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

    /// Adds a tag to the card, ignoring if it already exists.
    pub fn add_tag(&mut self, tag: &Tag) {
        if !self.has_tag(&tag) {
            self.tags.insert(tag.clone());
        }
    }

    /// Deletes a tag from the card, ignoring if it doesn't exist.
    pub fn delete_tag(&mut self, tag: &Tag) {
        if self.has_tag(&tag) {
            self.tags.remove(tag);
        }
    }

    /// Returns a vector of all tags in this card, in alphabetical order.
    pub fn get_tags(&self) -> Vec<Tag> {
        let mut tags_vec: Vec<_> = self.tags.iter().map(|tag| tag.clone()).collect();
        tags_vec.sort();
        tags_vec
    }

    pub fn has_tag(&self, tag: &Tag) -> bool {
        self.tags.contains(tag)
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
    pub fn get_tags_with_category(&self, category: &str) -> Vec<Tag> {
        self.get_tags()
            .into_iter()
            .filter(|tag| tag.category() == category)
            .collect()
    }
}

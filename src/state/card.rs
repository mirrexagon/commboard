use serde::{Deserialize, Serialize};

use crate::state::tag::Tag;

#[derive(Debug, Clone, Copy, PartialOrd, Ord, PartialEq, Eq, Serialize, Deserialize)]
pub struct CardId(pub u64);

impl CardId {
    pub fn next(&self) -> CardId {
        CardId(self.0 + 1)
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Card {
    id: CardId,
    pub text: String,
    pub tags: Vec<Tag>,
}

impl Card {
    pub fn new(id: CardId) -> Self {
        Self {
            id,
            text: String::new(),
            tags: Vec::new(),
        }
    }

    pub fn id(&self) -> CardId {
        self.id
    }

    pub fn has_category(&self, category: &str) -> bool {
        for tag in &self.tags {
            if tag.category() == category {
                return true;
            }
        }

        false
    }

    pub fn get_tags_with_category(&self, category: &str) -> Vec<&Tag> {
        let mut tags_with_category = Vec::new();

        for tag in &self.tags {
            if tag.category() == category {
                tags_with_category.push(tag)
            }
        }

        tags_with_category
    }
}

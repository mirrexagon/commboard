use serde::Serialize;

#[derive(Debug, Clone, Copy, PartialOrd, Ord, PartialEq, Eq, Serialize)]
pub struct CardId(pub u64);

impl CardId {
    pub fn next(&self) -> CardId {
        CardId(self.0 + 1)
    }
}

#[derive(Debug, Serialize)]
pub struct Card {
    pub id: CardId,
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

    pub fn has_category(&self, category: &str) -> bool {
        for tag in &self.tags {
            if tag.category == category {
                return true;
            }
        }

        false
    }

    pub fn get_tags_with_category(&self, category: &str) -> Vec<&Tag> {
        let mut tags_with_category = Vec::new();

        for tag in &self.tags {
            if tag.category == category {
                tags_with_category.push(tag)
            }
        }

        tags_with_category
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct Tag {
    pub category: String,
    pub value: String,
}

impl Tag {
    pub fn new(category: &str, value: &str) -> Self {
        Self {
            category: category.to_owned(),
            value: value.to_owned(),
        }
    }

    /// Returns `None` if there is no `:` in the string.
    pub fn from_tag_string(tag_string: &str) -> Option<Self> {
        tag_string.find(':').map(|index| {
            let (category, value) = tag_string.split_at(index);
            Self::new(category, &value[1..])
        })
    }
}

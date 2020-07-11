#[derive(Debug, Clone)]
pub struct Board {
    cards: Vec<Card>,
}

#[derive(Debug, Clone)]
pub struct Card {
    text: String,
    tags: Vec<Tag>,
}

impl Card {
    pub fn new() -> Self {
        Card {
            text: String::new(),
            tags: Vec::new(),
        }
    }
}

#[derive(Debug, Clone)]
pub struct Tag {
    category: String,
    value: String,
}

impl Tag {
    pub fn new(category: &str, value: &str) -> Self {
        Tag {
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

#[derive(Debug, thiserror::Error)]
pub enum Error {}

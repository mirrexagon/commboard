use std::collections::{HashMap, HashSet};

use serde::{Deserialize, Serialize};

mod card;
mod tag;
mod view;

pub use card::{Card, CardId};
pub use tag::Tag;

use view::{ViewByCategory, ViewDefault};

// TODO: Errors using enums instead of bools

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
    name: String,

    cards: HashMap<CardId, Card>,
    next_card_id: CardId,

    view_default: ViewDefault,
    view_by_category: ViewByCategory,
}

impl Board {
    pub fn new(id: BoardId) -> Self {
        Self {
            id,
            name: format!("Board {}", id.0),

            cards: HashMap::new(),
            next_card_id: CardId::new(0),

            view_default: ViewDefault::new(),
            view_by_category: ViewByCategory::new(),
        }
    }

    pub fn id(&self) -> BoardId {
        self.id
    }

    pub fn name(&self) -> &str {
        &self.name
    }

    pub fn set_name<S: Into<String>>(&mut self, name: S) {
        self.name = name.into();
    }

    pub fn cards(&self) -> &HashMap<CardId, Card> {
        &self.cards
    }

    // -- Cards --
    // TODO: Expose card manipulation from views, eg. Default can insert at index,
    // by category has more complex insertions and moves.

    /// Add a card with no tags to the end of the default view.
    pub fn add_card(&mut self) -> CardId {
        let id = self.get_next_card_id();
        self.cards.insert(id, Card::new(id));

        self.view_default.add_card(id, None);

        id
    }

    /// Returns `false` if no card with the given ID exists in the board.
    pub fn delete_card(&mut self, id: CardId) -> bool {
        if let Some(_) = self.cards.remove(&id) {
            self.view_default.delete_card(id);

            true
        } else {
            false
        }
    }

    /// Returns `false` if no card with the given ID exists in the board.
    pub fn set_card_text<S: Into<String>>(&mut self, id: CardId, text: S) -> bool {
        match self.cards.get_mut(&id) {
            Some(card) => {
                card.text = text.into();
                true
            }
            None => false,
        }
    }

    // TODO: Possible errors: no such card, card already has tag.
    pub fn add_card_tag(&mut self, id: CardId, tag: &Tag) -> bool {
        let card = match self.cards.get_mut(&id) {
            Some(card) => card,
            None => return false,
        };

        if let None = card.tags.iter().position(|t| t == tag) {
            card.tags.push(tag.clone());
            true
        } else {
            false
        }
    }

    // TODO: Possible errors: no such card, card doesn't have tag.
    pub fn delete_card_tag(&mut self, id: CardId, tag: &Tag) -> bool {
        let card = match self.cards.get_mut(&id) {
            Some(card) => card,
            None => return false,
        };

        if let Some(pos) = card.tags.iter().position(|t| t == tag) {
            card.tags.remove(pos);
            true
        } else {
            false
        }
    }

    fn get_next_card_id(&mut self) -> CardId {
        let next_card_id = self.next_card_id;
        self.next_card_id = self.next_card_id.next();
        next_card_id
    }

    // -- Views --
    pub fn get_view_default(&self) -> &ViewDefault {
        &self.view_default
    }

    pub fn get_view_by_category(&self) -> &ViewByCategory {
        &self.view_by_category
    }

    pub fn get_cards_with_filter(&self, filter: Option<&str>) -> HashSet<CardId> {
        // TODO: Implement more complex filtering. This is just string matching on the text.

        self.cards
            .iter()
            .filter(|(id, card)| filter.is_none() || card.text.contains(filter.unwrap()))
            .map(|(id, card)| *id)
            .collect()
    }
}

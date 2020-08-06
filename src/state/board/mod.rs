use std::collections::HashMap;

use serde::{Deserialize, Serialize};

mod card;
mod tag;
mod view;

pub use card::{Card, CardId};
pub use tag::Tag;

use view::{ViewByCategory, ViewDefault};

#[derive(Debug, Clone, Copy, PartialOrd, Ord, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct BoardId(u64);

impl BoardId {
    pub fn new(id: u64) -> BoardId {
        BoardId(id)
    }

    pub fn next(self) -> BoardId {
        BoardId(self.0 + 1)
    }
}

// TODO: Keep track of order of columns for each category, and keep track of
// order of cards in each column for each category - the single all card order
// can't express all possible sets of orders between categories

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

    // -- Cards --
    // TODO: Expose card manipulation from views, eg. Default can insert at index,
    // by category has more complex insertions and moves.

    // NEXT: Wire up view stuff to calls here.

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
        match self.get_card_mut(id) {
            Some(card) => {
                card.text = text.into();
                true
            }
            None => false,
        }
    }

    // TODO: Possible errors: no such card, card already has tag.
    pub fn add_card_tag<S: Into<String>>(&mut self, id: CardId, tag: S) {}

    // TODO: Possible errors: no such card, card doesn't have tag.
    pub fn delete_card_tag<S: Into<String>>(&mut self, id: CardId, tag: S) {}

    /// Returns `None` if the specified card doesn't exist in the board.
    fn get_card_mut(&mut self, id_to_get: CardId) -> Option<&mut Card> {
        for (id, card) in &mut self.cards {
            if *id == id_to_get {
                return Some(card);
            }
        }

        None
    }

    fn get_next_card_id(&mut self) -> CardId {
        let next_card_id = self.next_card_id;
        self.next_card_id = self.next_card_id.next();
        next_card_id
    }

    // -- Views --
    pub fn get_view_default(&self, filter: Option<&str>) -> &ViewDefault {
        todo!()
    }

    pub fn get_view_by_category(&self, filter: Option<&str>, category: &str) -> &ViewByCategory {
        todo!()
    }

    pub fn get_cards_with_filter(&self, filter: Option<&str>) -> Vec<&Card> {
        // TODO: Implement filtering.
        self.cards.iter().map(|(id, card)| card).collect()
    }
}

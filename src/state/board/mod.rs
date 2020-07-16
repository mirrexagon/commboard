use std::collections::HashMap;

use serde::{Deserialize, Serialize};

mod card;
mod tag;
mod view;

pub use card::{Card, CardId};
pub use tag::Tag;
pub use view::ViewByCategory;

#[derive(Debug, Clone, Copy, PartialOrd, Ord, PartialEq, Eq, Serialize, Deserialize)]
pub struct BoardId(u64);

impl BoardId {
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

    /// Is a `Vec` because this is the order cards are shown in without
    /// grouping on.
    cards: Vec<Card>,
    next_card_id: CardId,

    /// Map of category name to info.
    categories: HashMap<String, CategoryInfo>,
}

struct CategoryInfo {
    /// Order of columns in the category.
    columns: Vec<ColumnInfo>,
}

struct ColumnInfo {
    /// Order of columns in the column.
    cards: Vec<CardId>,
}

impl Board {
    pub fn new(id: BoardId) -> Self {
        Self {
            id,
            name: format!("Board {}", id.0),
            cards: Vec::new(),
            next_card_id: CardId(0),
        }
    }

    pub fn id(&self) -> BoardId {
        self.id
    }

    pub fn name(&self) -> &str {
        &self.name
    }

    pub fn set_name<S: Into<String>(name: S) {
        self.name = name.into();
    }

    // -- Cards --
    pub fn add_card(&mut self) -> &mut Card {
        let id = self.get_next_card_id();
        self.cards.push(Card::new(id));

        let index = self.cards.len() - 1;
        &mut self.cards[index]
    }

    /// Returns `false` if no card with the given ID exists in the board.
    pub fn delete_card(&mut self, id: CardId) -> bool {
        let mut index = None;

        for (i, card) in self.cards.iter().enumerate() {
            if card.id() == id {
                index = Some(i);
                break;
            }
        }

        if let Some(index) = index {
            self.cards.remove(index);
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
    pub fn add_card_tag<S: Into<String>>(&mut self, id: CardId, tag: S) {
    }

    /// Returns `None` if the specified card doesn't exist in the board.
    pub fn get_card_mut(&mut self, id: CardId) -> Option<&mut Card> {
        for card in &mut self.cards {
            if card.id() == id {
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
    pub fn get_view(&self, filter: Option<&str>) -> view::ViewAll {
        view::ViewAll::new(self, filter)
    }

    pub fn get_view_by_category(
        &self,
        filter: Option<&str>,
        category: &str,
    ) -> view::ViewByCategory {
        view::ViewByCategory::new(self, filter, category)
    }

    pub fn get_cards_with_filter(&self, filter: Option<&str>) -> Vec<&Card> {
        // TODO: Implement filtering.
        self.cards.iter().collect()
    }
}

mod card;
mod view;

use serde::{Deserialize, Serialize};

pub use card::{Card, CardId, Tag};
pub use view::{ViewAll, ViewByCategory};

#[cfg(test)]
mod tests;

#[derive(Debug, Serialize, Deserialize)]
pub struct Boards {
    boards: Vec<Board>,
}

#[derive(Debug, Clone, Copy, PartialOrd, Ord, PartialEq, Eq, Serialize, Deserialize)]
pub struct BoardId(pub u64);

#[derive(Debug, Serialize, Deserialize)]
pub struct Board {
    id: BoardId,
    cards: Vec<Card>,
    next_card_id: CardId,
}

impl Board {
    pub fn new(id: BoardId) -> Self {
        Self {
            id,
            cards: Vec::new(),
            next_card_id: CardId(0),
        }
    }

    pub fn add_card(&mut self) -> CardId {
        let id = self.get_next_card_id();
        self.cards.push(Card::new(id));
        id
    }

    /// Returns `false` if no card with the given ID exists in the board.
    pub fn delete_card(&mut self, id: CardId) -> bool {
        let mut index = None;

        for (i, card) in self.cards.iter().enumerate() {
            if card.id == id {
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
    pub fn set_card_text(&mut self, id: CardId, text: &str) -> bool {
        self.modify_card(id, |card| card.text = text.to_owned())
    }

    /// Returns `false` if no card with the given ID exists in the board.
    pub fn set_card_tags(&mut self, id: CardId, tags: &[Tag]) -> bool {
        self.modify_card(id, |card| card.tags = tags.to_vec())
    }

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

    fn get_cards(&self, filter: Option<&str>) -> Vec<&Card> {
        // TODO: Implement filtering.
        self.cards.iter().collect()
    }

    /// Runs a function or closure on a card, if it exists.
    ///
    /// Returns `false` if no card with the given ID exists in the board.
    /// Otherwise, the function has been applied.
    fn modify_card<F: FnOnce(&mut Card)>(&mut self, id: CardId, func: F) -> bool {
        if let Some(card) = self.get_card_mut(id) {
            func(card);
            true
        } else {
            false
        }
    }

    fn get_card_mut(&mut self, id: CardId) -> Option<&mut Card> {
        for card in &mut self.cards {
            if card.id == id {
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
}

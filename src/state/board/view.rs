use super::CardId;
use serde::{Deserialize, Serialize};

// All actions here should panic as the caller is meant to validate its arguments
// (eg. when a card is deleted, it should ensure that card actually exists
// before calling here).

#[derive(Debug, Serialize, Deserialize)]
pub struct ViewDefault {
    card_order: Vec<CardId>,
}

impl ViewDefault {
    pub fn new() -> Self {
        Self {
            card_order: Vec::new(),
        }
    }

    pub fn get_view(&self) -> &Vec<CardId> {
        &self.card_order
    }

    pub fn add_card_append(&mut self, card: CardId) {
        self.add_card_at_index(card, self.card_order.len())
    }

    pub fn add_card_at_index(&mut self, card: CardId, index: usize) {
        todo!()
    }

    pub fn move_card_to(&mut self, card: CardId, index: usize) {
        todo!()
    }

    pub fn delete_card(&mut self, card: CardId) {
        todo!()
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ViewByCategory {}

impl ViewByCategory {
    pub fn new() -> Self {
        todo!()
    }

    pub fn get_view(&self) -> &Vec<CardId> {
        todo!()
    }

    pub fn add_card_append(&mut self, card: CardId) {
        todo!()
    }

    pub fn add_card_at_index(&mut self, card: CardId, index: usize) {
        todo!()
    }

    pub fn move_card_to(&mut self, card: CardId, index: usize) {
        todo!()
    }

    pub fn delete_card(&mut self, card: CardId) {
        todo!()
    }
}

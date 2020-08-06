use super::{CardId, Tag};
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

    pub fn get_view(&self) -> &[CardId] {
        &self.card_order
    }

    pub fn add_card(&mut self, card: CardId, index: Option<usize>) {
        if let Some(_) = self.card_order.iter().position(|id| *id == card) {
            panic!(
                "Tried to add already-present card '{:?}' to default view",
                card
            );
        }

        match index {
            None => self.card_order.push(card),
            Some(index) => {
                if index == self.card_order.len() {
                    self.card_order.push(card);
                } else {
                    self.card_order.insert(index, card);
                }
            }
        };
    }

    pub fn move_card_to(&mut self, card_to_move: CardId, index: usize) {
        self.delete_card(card_to_move);
        self.add_card(card_to_move, Some(index));
    }

    pub fn delete_card(&mut self, card_to_delete: CardId) {
        match self.card_order.iter().position(|id| *id == card_to_delete) {
            Some(pos) => self.card_order.remove(pos),
            None => panic!(
                "Card '{:?}' does not exist in the default view",
                card_to_delete
            ),
        };
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ViewByCategory {
    categories: Vec<Category>,
}

impl ViewByCategory {
    pub fn new() -> Self {
        Self {
            categories: Vec::new(),
        }
    }

    pub fn get_view(&self) -> &[Category] {
        &self.categories
    }

    pub fn add_card_tag(&mut self, card: CardId, tag: &Tag, index: Option<usize>) {
        let column = self.get_category_column(tag);

        if let Some(_) = column.cards.iter().position(|id| *id == card) {
            panic!(
                "Tried to add tag '{:?}' to card '{:?}' in category view but it already has that tag",
                tag, card
            );
        }

        match index {
            None => column.cards.push(card),
            Some(index) => {
                if index == column.cards.len() {
                    column.cards.push(card);
                } else {
                    column.cards.insert(index, card);
                }
            }
        };
    }

    pub fn remove_card_tag(&mut self, card: CardId, tag: &Tag) {
        let column = self.get_category_column(tag);

        match column.cards.iter().position(|id| *id == card) {
            Some(pos) => column.cards.remove(pos),
            None => panic!(
                "Tried to remove tag '{:?}' from card '{:?}' in category view but it does not have that tag",
                tag, card
            ),
        };
    }

    pub fn move_card_within_column_to(&mut self, card: CardId, tag: &Tag, index: usize) {
        todo!()
    }

    fn get_category_column(&mut self, tag: &Tag) -> &mut Column {
        todo!()
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Category {
    columns: Vec<Column>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Column {
    name: String,
    cards: Vec<CardId>,
}

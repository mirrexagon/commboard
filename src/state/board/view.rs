use std::collections::HashSet;

use super::{CardId, Tag};
use serde::{Deserialize, Serialize};

// TODO: Send errors back up instead of panicking on error.
// TODO: Figure out how to make returned filtered views unmodifiable.

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ViewDefault {
    card_order: Vec<CardId>,
}

impl ViewDefault {
    pub fn new() -> Self {
        Self {
            card_order: Vec::new(),
        }
    }

    pub fn get_filtered(&self, cards_to_include: &HashSet<CardId>) -> Self {
        Self {
            card_order: self
                .card_order
                .iter()
                .filter(|card_id| cards_to_include.contains(card_id))
                .map(|card_id| *card_id)
                .collect(),
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

    pub fn move_card(&mut self, card_to_move: CardId, new_index: usize) {
        self.delete_card(card_to_move);
        self.add_card(card_to_move, Some(new_index));
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ViewByCategory {
    categories: Vec<Category>,
}

impl ViewByCategory {
    pub fn new() -> Self {
        Self {
            categories: Vec::new(),
        }
    }

    pub fn get_filtered(&self, cards_to_include: &HashSet<CardId>) -> Self {
        let mut result = Self {
            categories: Vec::new(),
        };

        for old_category in &self.categories {
            let mut new_columns = Vec::new();

            for old_column in &old_category.columns {
                let filtered_cards: Vec<CardId> = old_column
                    .cards
                    .iter()
                    .filter(|card_id| cards_to_include.contains(card_id))
                    .map(|card_id| *card_id)
                    .collect();

                if !filtered_cards.is_empty() {
                    new_columns.push(Column {
                        name: old_column.name.clone(),
                        cards: filtered_cards,
                    });
                }
            }

            if !new_columns.is_empty() {
                result.categories.push(Category {
                    name: old_category.name.clone(),
                    columns: new_columns,
                });
            }
        }

        result
    }

    pub fn get_view(&self) -> &[Category] {
        &self.categories
    }

    pub fn add_card_tag(&mut self, card: CardId, tag: &Tag, index: Option<usize>) {
        let column = self.get_column(tag);

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
        let column = self.get_column(tag);

        match column.cards.iter().position(|id| *id == card) {
            Some(pos) => column.cards.remove(pos),
            None => panic!(
                "Tried to remove tag '{:?}' from card '{:?}' in category view but it does not have that tag",
                tag, card
            ),
        };
    }

    pub fn move_card_within_column(&mut self, card: CardId, tag: &Tag, new_index: usize) {
        self.remove_card_tag(card, tag);
        self.add_card_tag(card, tag, Some(new_index));
    }

    pub fn move_column_within_category(&mut self, tag: &Tag, new_index: usize) {
        todo!()
    }

    pub fn move_category(&mut self, category: &str, new_index: usize) {
        todo!()
    }

    /// Creates the category/column if it doesn't exist, appended to the end.
    fn get_column(&mut self, tag: &Tag) -> &mut Column {
        let category_pos = match self
            .categories
            .iter()
            .position(|category| category.name == tag.category())
        {
            Some(pos) => pos,
            None => {
                self.categories.push(Category {
                    name: tag.category().to_owned(),
                    columns: Vec::new(),
                });

                self.categories.len() - 1
            }
        };

        let category = &mut self.categories[category_pos];

        let column_pos = match category
            .columns
            .iter()
            .position(|column| column.name == tag.value())
        {
            Some(pos) => pos,
            None => {
                category.columns.push(Column {
                    name: tag.value().to_owned(),
                    cards: Vec::new(),
                });

                category.columns.len() - 1
            }
        };

        &mut category.columns[column_pos]
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Category {
    pub name: String,
    pub columns: Vec<Column>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Column {
    pub name: String,
    pub cards: Vec<CardId>,
}

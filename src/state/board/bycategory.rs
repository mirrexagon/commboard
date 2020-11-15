use thiserror::Error;

use super::{CardId, Tag};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct ByCategory {
    categories: Vec<Category>,
}

impl ByCategory {
    pub fn new() -> Self {
        Self {
            categories: Vec::new(),
        }
    }

    pub fn categories(&self) -> &[Category] {
        &self.categories
    }

    pub fn add_card_tag(&mut self, card: CardId, tag: &Tag) -> Result<(), ByCategoryError> {
        let column = self.get_column(tag);

        if let Some(_) = column.cards.iter().position(|id| *id == card) {
            return Err(ByCategoryError::CardAlreadyHasTag);
        }

        column.cards.push(card);
        Ok(())
    }

    pub fn delete_card_tag(&mut self, card: CardId, tag: &Tag) -> Result<(), ByCategoryError> {
        let column = self.get_column(tag);

        match column.cards.iter().position(|id| *id == card) {
            Some(pos) => {
                column.cards.remove(pos);
                Ok(())
            }
            None => Err(ByCategoryError::CardAlreadyHasTag),
        }
    }

    pub fn move_card_within_column(
        &mut self,
        card: CardId,
        tag: &Tag,
        new_index: usize,
    ) -> Result<(), ByCategoryError> {
        todo!()
    }

    pub fn move_column_within_category(
        &mut self,
        tag: &Tag,
        new_index: usize,
    ) -> Result<(), ByCategoryError> {
        todo!()
    }

    pub fn move_category(
        &mut self,
        category: &str,
        new_index: usize,
    ) -> Result<(), ByCategoryError> {
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

#[derive(Debug, Serialize, Deserialize)]
pub struct Category {
    pub name: String,
    pub columns: Vec<Column>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Column {
    pub name: String,
    pub cards: Vec<CardId>,
}

#[derive(Debug, Error)]
pub enum ByCategoryError {
    #[error("card already has this tag")]
    CardAlreadyHasTag,

    #[error("card doesn't have this tag")]
    CardDoesntHaveTag,
}

use std::collections::HashMap;

use serde::Serialize;

use crate::state::{board::Board, card::Card};

#[derive(Debug, Serialize)]
pub struct ViewAll<'a> {
    pub cards: Vec<&'a Card>,
}

impl<'a> ViewAll<'a> {
    pub fn new(board: &'a Board, filter: Option<&str>) -> Self {
        Self {
            cards: board.get_cards_with_filter(filter),
        }
    }
}

#[derive(Debug, Serialize)]
pub struct ViewByCategory<'a> {
    pub columns: Vec<Column<'a>>,
}

impl<'a> ViewByCategory<'a> {
    pub fn new(board: &'a Board, filter: Option<&str>, category: &str) -> Self {
        let mut columns: Vec<Column> = Vec::new();
        let mut value_to_column_index: HashMap<String, usize> = HashMap::new();

        for card in board.get_cards_with_filter(filter) {
            let matching_tags = card.get_tags_with_category(category);

            for tag in matching_tags {
                if let Some(&column_index) = value_to_column_index.get(&tag.value) {
                    columns[column_index].cards.push(card);
                } else {
                    let column_index = columns.len();
                    columns.push(Column {
                        name: &tag.value,
                        cards: vec![card],
                    });
                    value_to_column_index.insert(tag.value.clone(), column_index);
                }
            }
        }

        columns.sort_by(|a, b| a.name.cmp(b.name));

        ViewByCategory { columns }
    }
}

#[derive(Debug, Serialize)]
pub struct Column<'a> {
    pub name: &'a str,
    pub cards: Vec<&'a Card>,
}

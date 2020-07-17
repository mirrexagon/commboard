use std::collections::HashMap;

use serde::Serialize;

use crate::state::board::{Board, Card};

#[derive(Debug)]
pub struct ViewByCategory<'a> {
    pub name: &'a str,
    pub columns: Vec<ViewByCategoryColumn<'a>>,
}

impl<'a> ViewByCategory<'a> {
    pub fn new(board: &'a Board, filter: Option<&str>, category: &str) -> Self {
        let mut columns: Vec<ViewByCategoryColumn> = Vec::new();
        let mut value_to_column_index: HashMap<String, usize> = HashMap::new();

        for card in board.get_cards_with_filter(filter) {
            let matching_tags = card.get_tags_with_category(category);

            for tag in matching_tags {
                if let Some(&column_index) = value_to_column_index.get(tag.value()) {
                    columns[column_index].cards.push(card);
                } else {
                    let column_index = columns.len();
                    columns.push(ViewByCategoryColumn {
                        name: tag.value(),
                        cards: vec![card],
                    });
                    value_to_column_index.insert(tag.value().to_owned(), column_index);
                }
            }
        }

        columns.sort_by(|a, b| a.name.cmp(b.name));

        ViewByCategory {
            name: &board.name,
            columns,
        }
    }
}

#[derive(Debug)]
pub struct ViewByCategoryColumn<'a> {
    pub name: &'a str,
    pub cards: Vec<&'a Card>,
}

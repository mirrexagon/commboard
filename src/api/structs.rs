use std::collections::HashMap;

use serde::Serialize;

use crate::state::{
    board::{Board, BoardId, Card, CardId, Tag},
    boards::Boards,
    AppState,
};

#[derive(Debug, Serialize)]
pub struct ApiBoards<'a> {
    boards: Vec<ApiBoardInfo<'a>>,
}

impl<'a> ApiBoards<'a> {
    pub fn new(boards: &'a Boards) -> Self {
        Self {
            boards: boards
                .get_boards()
                .iter()
                .map(|board| ApiBoardInfo::new(board))
                .collect(),
        }
    }
}

#[derive(Debug, Serialize)]
pub struct ApiBoardViewDefault<'a> {
    board: ApiBoard<'a>,
    card_order: Vec<CardId>,
}

impl<'a> ApiBoardViewDefault<'a> {
    pub fn new(board: &'a Board, filter: Option<&str>) -> Self {
        Self {
            board: ApiBoard::new(board),
            card_order: board.get_view_default(filter).card_order,
        }
    }
}

#[derive(Debug, Serialize)]
pub struct ApiBoardViewByCategory<'a> {
    board: ApiBoard<'a>,
    columns: Vec<ApiViewByCategoryColumn>,
}

impl<'a> ApiBoardViewByCategory<'a> {
    pub fn new(board: &'a Board, by_category: &str, filter: Option<&str>) -> Self {
        let view = board.get_view_by_category(filter);

        // If there is no category with the desired name, return no columns.
        let mut columns = Vec::new();

        for category in view.categories {
            if category.name == by_category {
                columns = category
                    .columns
                    .iter()
                    .map(|column| ApiViewByCategoryColumn {
                        name: column.name.clone(),
                        cards: column.cards.clone(),
                    })
                    .collect()
            }
        }

        Self {
            board: ApiBoard::new(board),
            columns,
        }
    }
}

#[derive(Debug, Serialize)]
pub struct ApiViewByCategoryColumn {
    name: String,
    cards: Vec<CardId>,
}

#[derive(Debug, Serialize)]
struct ApiBoard<'a> {
    id: BoardId,
    name: &'a str,
    cards: HashMap<CardId, ApiCard<'a>>,
}

impl<'a> ApiBoard<'a> {
    pub fn new(board: &'a Board) -> Self {
        Self {
            id: board.id(),
            name: board.name(),
            cards: board
                .cards()
                .iter()
                .map(|(card_id, card)| (*card_id, ApiCard::new(card)))
                .collect(),
        }
    }
}

#[derive(Debug, Serialize)]
struct ApiBoardInfo<'a> {
    id: BoardId,
    name: &'a str,
}

impl<'a> ApiBoardInfo<'a> {
    pub fn new(board: &'a Board) -> Self {
        Self {
            id: board.id(),
            name: board.name(),
        }
    }
}

#[derive(Debug, Serialize)]
struct ApiCard<'a> {
    id: CardId,
    text: &'a str,
    tags: Vec<ApiTag<'a>>,
}

impl<'a> ApiCard<'a> {
    pub fn new(card: &'a Card) -> Self {
        dbg!(&card.tags);

        Self {
            id: card.id(),
            text: &card.text,
            tags: card.tags.iter().map(|tag| ApiTag::new(tag)).collect(),
        }
    }
}

#[derive(Debug, Serialize)]
struct ApiTag<'a> {
    tag: &'a str,
}

impl<'a> ApiTag<'a> {
    pub fn new(tag: &'a Tag) -> Self {
        Self { tag: tag.tag() }
    }
}

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
            // TODO: Move this logic to the board.
            card_order: board
                .get_view_default()
                .get_filtered(&board.get_cards_with_filter(filter))
                .get_view()
                .to_vec(),
        }
    }
}

#[derive(Debug, Serialize)]
pub struct ApiBoardViewByCategory<'a> {
    board: ApiBoard<'a>,
    columns: Vec<ApiViewByCategoryColumn<'a>>,
}

impl<'a> ApiBoardViewByCategory<'a> {
    pub fn new(board: &'a Board, by_category: &str, filter: Option<&str>) -> Self {
        // TODO: Move this logic to the board.
        let categories = board
            .get_view_by_category()
            .get_filtered(&board.get_cards_with_filter(filter))
            .get_view();

        // If there is no category with the desired name, return no columns.
        let columns = Vec::new();

        for category in categories {
            if category.name == by_category {
                columns = category
                    .columns
                    .iter()
                    .map(|column| ApiViewByCategoryColumn {
                        name: &column.name,
                        cards: &column.cards[..],
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
pub struct ApiViewByCategoryColumn<'a> {
    name: &'a str,
    cards: &'a [CardId],
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

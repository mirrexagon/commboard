use std::collections::HashMap;

use serde::Serialize;

use crate::state::{
    board::{Board, BoardId, Card, CardId, Tag},
    boards::Boards,
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
    default_order: &'a [CardId],
}

impl<'a> ApiBoardViewDefault<'a> {
    pub fn new(board: &'a Board, filter: Option<&str>) -> Self {
        Self {
            board: ApiBoard::new(board),
            default_order: board.default_order(),
        }
    }
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
            name: &board.name,
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
            name: &board.name,
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
            tags: card.get_tags().iter().map(|tag| ApiTag::new(tag)).collect(),
        }
    }
}

#[derive(Debug, Serialize)]
struct ApiTag<'a>(&'a str);

impl<'a> ApiTag<'a> {
    pub fn new(tag: &'a Tag) -> Self {
        Self(tag.tag())
    }
}

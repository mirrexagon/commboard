use std::collections::HashMap;

use serde::Serialize;

use crate::board::{Board, Card, CardId, Category, Tag};

#[derive(Debug, Serialize)]
pub struct ApiBoardViewDefault<'a> {
    board: ApiBoard<'a>,
    default_view: &'a [CardId],
}

impl<'a> ApiBoardViewDefault<'a> {
    pub fn new(board: &'a Board, filter: Option<&str>) -> Self {
        Self {
            board: ApiBoard::new(board),
            default_view: board.default_card_order(),
        }
    }
}

#[derive(Debug, Serialize)]
pub struct ApiBoardViewCategory<'a> {
    board: ApiBoard<'a>,
    category_view: &'a Category,
}

impl<'a> ApiBoardViewCategory<'a> {
    pub fn new(board: &'a Board, category_name: &str, filter: Option<&str>) -> Option<Self> {
        if let Some(category) = board.get_category(category_name) {
            Some(Self {
                board: ApiBoard::new(board),
                category_view: category,
            })
        } else {
            None
        }
    }
}

#[derive(Debug, Serialize)]
struct ApiBoard<'a> {
    name: &'a str,
    cards: HashMap<CardId, ApiCard<'a>>,
    categories: Vec<&'a str>,
}

impl<'a> ApiBoard<'a> {
    pub fn new(board: &'a Board) -> Self {
        Self {
            name: &board.name,
            cards: board
                .cards()
                .iter()
                .map(|(card_id, card)| (*card_id, ApiCard::new(card)))
                .collect(),
            categories: board
                .categories()
                .iter()
                .map(|category| category.name())
                .collect(),
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

use serde::Serialize;

use crate::state::board::{Board

#[derive(Debug, Serialize)]
pub struct ApiBoard<'a> {
    name: &'a str,
    cards: &'a Vec<ApiCard<'a>>,
}

impl<'a> ApiBoard<'a> {
    pub fn new(board: &Board) -> {
    }
}

#[derive(Debug, Serialize)]
pub struct ApiBoardViewByColumn<'a> {
    name: &'a str,
    columns: Vec<ApiBoardColumn<'a>>,
}

#[derive(Debug, Serialize)]
pub struct ApiBoardColumn<'a> {
    name: &'a str,
    cards: Vec<ApiCard<'a>>,
}

#[derive(Debug, Serialize)]
pub struct ApiTag<'a> {
    name: &'a str,
}

#[derive(Debug, Serialize)]
pub struct ApiCard<'a> {
    text: &'a str,
    tags: Vec<ApiTag<'a>>,
}

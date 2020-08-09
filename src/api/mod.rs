use std::sync::Mutex;

use serde::Serialize;

use rocket::{
    delete, get,
    http::RawStr,
    post, put,
    request::{FromParam, Request},
    response::{self, content, status, Responder},
    State,
};

use rocket_contrib::json::Json;

use crate::state::{
    board::{BoardId, CardId, Tag},
    AppState,
};

mod structs;

use structs::*;

#[derive(Debug, Serialize)]
struct BoardInfo<'a> {
    pub id: BoardId,
    pub name: &'a str,
}

#[get("/boards")]
pub fn get_boards(state: State<Mutex<AppState>>) -> Json<ApiBoards> {
    let state = state.lock().unwrap();
    let boards = state.boards_mut();

    Json(ApiBoards::new(boards))
}

#[post("/boards")]
pub fn add_board(state: State<Mutex<AppState>>) -> BoardId {
    let state = state.lock().unwrap();
    let boards = state.boards_mut();

    state.boards_mut().add_board().id()
}

#[delete("/boards/<board_id>")]
pub fn delete_board(state: State<Mutex<AppState>>, board_id: BoardId) -> Option<status::NoContent> {
    let state = state.lock().unwrap();
    let boards = state.boards_mut();

    if boards.delete_board(board_id) {
        Some(status::NoContent)
    } else {
        None
    }
}

#[get("/boards/<board_id>?<filter>")]
pub fn get_board_view_default(
    state: State<Mutex<AppState>>,
    board_id: u64,
    filter: Option<String>,
) -> Option<Json<ApiBoardViewDefault>> {
    let state = state.lock().unwrap();
    let boards = state.boards_mut();

    let board = boards.get_board_mut(BoardId::new(board_id))?;

    Some(Json(ApiBoardViewDefault::new(board, filter.as_deref())))
}

#[put("/boards/<board_id>/name", data = "<new_name>")]
pub fn set_board_name(
    state: State<Mutex<AppState>>,
    board_id: BoardId,
    new_name: String,
) -> Result<(), status::NotFound<&str>> {
    let mut state = state.lock().unwrap();

    let board = state
        .get_board_mut(board_id)
        .ok_or(status::NotFound("No such board"))?;

    board.name = new_name;

    Ok(())
}

#[get("/boards/<board_id>/viewbycategory/<category>?<filter>")]
pub fn get_board_view_by_category(
    state: State<Mutex<AppState>>,
    board_id: BoardId,
    filter: Option<String>,
    category: String,
) -> Option<content::Json<String>> {
    let mut state = state.lock().unwrap();

    let board = state.get_board_mut(board_id)?;

    Some(content::Json(
        serde_json::to_string(&board.get_view_by_category(filter.as_deref(), &category)).unwrap(),
    ))
}

#[post("/boards/<board_id>/cards")]
pub fn add_card(
    state: State<Mutex<AppState>>,
    board_id: BoardId,
) -> Result<CardId, status::NotFound<&str>> {
    let mut state = state.lock().unwrap();

    let board = state
        .get_board_mut(board_id)
        .ok_or(status::NotFound("No such board"))?;

    Ok(board.add_card().id())
}

#[delete("/boards/<board_id>/cards/<card_id>")]
pub fn delete_card(
    state: State<Mutex<AppState>>,
    board_id: BoardId,
    card_id: CardId,
) -> Result<status::NoContent, status::NotFound<&str>> {
    let mut state = state.lock().unwrap();

    let board = state
        .get_board_mut(board_id)
        .ok_or(status::NotFound("No such board"))?;

    if board.delete_card(card_id) {
        Ok(status::NoContent)
    } else {
        Err(status::NotFound("No such card in the specified board"))
    }
}

#[put("/boards/<board_id>/cards/<card_id>/text", data = "<new_text>")]
pub fn set_card_text(
    state: State<Mutex<AppState>>,
    board_id: BoardId,
    card_id: CardId,
    new_text: String,
) -> Result<(), status::NotFound<&str>> {
    let mut state = state.lock().unwrap();

    let board = state
        .get_board_mut(board_id)
        .ok_or(status::NotFound("No such board"))?;

    let card = board
        .get_card_mut(card_id)
        .ok_or(status::NotFound("No such card in the specified board"))?;

    card.text = new_text;

    Ok(())
}

#[derive(Debug, Responder)]
pub enum SetCardsTagsError {
    NotFound(status::NotFound<&'static str>),
    InvalidTag(status::BadRequest<&'static str>),
}

#[put("/boards/<board_id>/cards/<card_id>/tags", data = "<new_tags>")]
pub fn set_card_tags(
    state: State<Mutex<AppState>>,
    board_id: BoardId,
    card_id: CardId,
    new_tags: Json<Vec<String>>,
) -> Result<(), SetCardsTagsError> {
    let mut state = state.lock().unwrap();

    let board = state
        .get_board_mut(board_id)
        .ok_or(SetCardsTagsError::NotFound(status::NotFound(
            "No such board",
        )))?;
    let card = board
        .get_card_mut(card_id)
        .ok_or(SetCardsTagsError::NotFound(status::NotFound(
            "No such card in the specified board",
        )))?;

    let new_tags = new_tags
        .iter()
        .map(|tag_string| Tag::new(tag_string))
        .collect::<Result<Vec<_>, _>>();

    card.tags = new_tags.map_err(|_| {
        SetCardsTagsError::InvalidTag(status::BadRequest(Some("A supplied tag was invalid")))
    })?;

    Ok(())
}

impl<'r> FromParam<'r> for BoardId {
    type Error = <u64 as FromParam<'r>>::Error;

    fn from_param(param: &'r RawStr) -> Result<Self, Self::Error> {
        u64::from_param(param).map(BoardId)
    }
}

impl<'r> FromParam<'r> for CardId {
    type Error = <u64 as FromParam<'r>>::Error;

    fn from_param(param: &'r RawStr) -> Result<Self, Self::Error> {
        u64::from_param(param).map(CardId)
    }
}

impl<'r> Responder<'r> for BoardId {
    fn respond_to(self, request: &Request) -> response::Result<'r> {
        String::respond_to(format!("{}", self.0), request)
    }
}

impl<'r> Responder<'r> for CardId {
    fn respond_to(self, request: &Request) -> response::Result<'r> {
        String::respond_to(format!("{}", self.0), request)
    }
}

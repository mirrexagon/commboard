use std::sync::Mutex;

use serde::Serialize;

use rocket::{
    delete, get,
    http::RawStr,
    post, put,
    request::{FromParam, Request},
    response::{self, content::Json, status, Responder},
    State,
};

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
pub fn get_boards(state: State<Mutex<AppState>>) -> Json<String> {
    let mut state = state.lock().unwrap();
    let boards = state.boards_mut();

    Json(serde_json::to_string(&ApiBoards::new(boards)).unwrap())
}

#[post("/boards")]
pub fn add_board(state: State<Mutex<AppState>>) -> BoardId {
    let mut state = state.lock().unwrap();
    let boards = state.boards_mut();

    boards.add_board().id()
}

#[delete("/boards/<board_id>")]
pub fn delete_board(state: State<Mutex<AppState>>, board_id: BoardId) -> Option<status::NoContent> {
    let mut state = state.lock().unwrap();
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
) -> Option<Json<String>> {
    let mut state = state.lock().unwrap();
    let boards = state.boards_mut();

    let board = boards.get_board_mut(BoardId::new(board_id))?;

    Some(Json(
        serde_json::to_string(&ApiBoardViewDefault::new(board, filter.as_deref())).unwrap(),
    ))
}

#[put("/boards/<board_id>/name", data = "<new_name>")]
pub fn set_board_name(
    state: State<Mutex<AppState>>,
    board_id: BoardId,
    new_name: String,
) -> Result<(), status::NotFound<&str>> {
    let mut state = state.lock().unwrap();
    let boards = state.boards_mut();

    let board = boards
        .get_board_mut(board_id)
        .ok_or(status::NotFound("No such board"))?;

    board.set_name(new_name);

    Ok(())
}

#[get("/boards/<board_id>/viewbycategory/<category>?<filter>")]
pub fn get_board_view_by_category(
    state: State<Mutex<AppState>>,
    board_id: BoardId,
    filter: Option<String>,
    category: String,
) -> Option<Json<String>> {
    let mut state = state.lock().unwrap();
    let boards = state.boards_mut();

    let board = boards.get_board_mut(board_id)?;

    Some(Json(
        serde_json::to_string(&ApiBoardViewByCategory::new(
            board,
            &category,
            filter.as_deref(),
        ))
        .unwrap(),
    ))
}

#[post("/boards/<board_id>/cards")]
pub fn add_card(
    state: State<Mutex<AppState>>,
    board_id: BoardId,
) -> Result<CardId, status::NotFound<&str>> {
    let mut state = state.lock().unwrap();
    let boards = state.boards_mut();

    let board = boards
        .get_board_mut(board_id)
        .ok_or(status::NotFound("No such board"))?;

    Ok(board.add_card())
}

#[delete("/boards/<board_id>/cards/<card_id>")]
pub fn delete_card(
    state: State<Mutex<AppState>>,
    board_id: BoardId,
    card_id: CardId,
) -> Result<status::NoContent, status::NotFound<&str>> {
    let mut state = state.lock().unwrap();
    let boards = state.boards_mut();

    let board = boards
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
    let boards = state.boards_mut();

    let board = boards
        .get_board_mut(board_id)
        .ok_or(status::NotFound("No such board"))?;

    if board.set_card_text(card_id, new_text) {
        Ok(())
    } else {
        Err(status::NotFound("No such card in the specified board"))
    }
}

#[derive(Debug, Responder)]
pub enum CardTagError {
    NotFound(status::NotFound<&'static str>),
    BadRequest(status::BadRequest<&'static str>),
}

#[post("/boards/<board_id>/cards/<card_id>/tags", data = "<new_tag>")]
pub fn add_card_tag(
    state: State<Mutex<AppState>>,
    board_id: BoardId,
    card_id: CardId,
    new_tag: String,
) -> Result<(), CardTagError> {
    let new_tag = match Tag::new(new_tag) {
        Ok(tag) => tag,
        Err(_) => {
            return Err(CardTagError::BadRequest(status::BadRequest(Some(
                "Supplied tag is invalid",
            ))))
        }
    };

    let mut state = state.lock().unwrap();
    let boards = state.boards_mut();

    let board = boards
        .get_board_mut(board_id)
        .ok_or(CardTagError::NotFound(status::NotFound("No such board")))?;

    if board.add_card_tag(card_id, &new_tag) {
        Ok(())
    } else {
        // TODO: Distinguish between different error cases.
        Err(CardTagError::BadRequest(status::BadRequest(Some(
            "Card not found or already has the specified tag",
        ))))
    }
}

#[delete("/boards/<board_id>/cards/<card_id>/tags", data = "<tag_to_delete>")]
pub fn delete_card_tag(
    state: State<Mutex<AppState>>,
    board_id: BoardId,
    card_id: CardId,
    tag_to_delete: String,
) -> Result<(), CardTagError> {
    let new_tag = match Tag::new(tag_to_delete) {
        Ok(tag) => tag,
        Err(_) => {
            return Err(CardTagError::BadRequest(status::BadRequest(Some(
                "Supplied tag is invalid",
            ))))
        }
    };

    let mut state = state.lock().unwrap();
    let boards = state.boards_mut();

    let board = boards
        .get_board_mut(board_id)
        .ok_or(CardTagError::NotFound(status::NotFound("No such board")))?;

    if board.delete_card_tag(card_id, &new_tag) {
        Ok(())
    } else {
        // TODO: Distinguish between different error cases.
        Err(CardTagError::BadRequest(status::BadRequest(Some(
            "Card not found or does not have the specified tag",
        ))))
    }
}

impl<'r> FromParam<'r> for BoardId {
    type Error = <u64 as FromParam<'r>>::Error;

    fn from_param(param: &'r RawStr) -> Result<Self, Self::Error> {
        u64::from_param(param).map(BoardId::new)
    }
}

impl<'r> FromParam<'r> for CardId {
    type Error = <u64 as FromParam<'r>>::Error;

    fn from_param(param: &'r RawStr) -> Result<Self, Self::Error> {
        u64::from_param(param).map(CardId::new)
    }
}

impl<'r> Responder<'r> for BoardId {
    fn respond_to(self, request: &Request) -> response::Result<'r> {
        String::respond_to(format!("{}", self.as_integer()), request)
    }
}

impl<'r> Responder<'r> for CardId {
    fn respond_to(self, request: &Request) -> response::Result<'r> {
        String::respond_to(format!("{}", self.as_integer()), request)
    }
}

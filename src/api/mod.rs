use std::sync::Mutex;

use serde::Serialize;

use rocket::{
    delete, get,
    http::RawStr,
    http::Status,
    post, put,
    request::{FromParam, Request},
    response::{self, content::Json, status, Responder},
    State,
};

use crate::state::{
    board::{BoardId, CardId, Tag},
    Boards,
};

mod structs;

use structs::*;

#[derive(Debug, Serialize)]
struct BoardInfo<'a> {
    pub id: BoardId,
    pub name: &'a str,
}

#[get("/boards")]
pub fn get_boards(boards: State<Mutex<Boards>>) -> Json<String> {
    let boards = boards.lock().unwrap();

    Json(serde_json::to_string(&ApiBoards::new(&*boards)).unwrap())
}

#[post("/boards")]
pub fn add_board(boards: State<Mutex<Boards>>) -> BoardId {
    let mut boards = boards.lock().unwrap();

    boards.new_board()
}

#[delete("/boards/<board_id>")]
pub fn delete_board(
    boards: State<Mutex<Boards>>,
    board_id: BoardId,
) -> Result<(), status::NotFound<String>> {
    let mut boards = boards.lock().unwrap();

    boards
        .delete_board(board_id)
        .map_err(|err| status::NotFound(err.to_string()))
}

#[put("/boards/<board_id>/name", data = "<new_name>")]
pub fn set_board_name(
    boards: State<Mutex<Boards>>,
    board_id: BoardId,
    new_name: String,
) -> Result<(), status::NotFound<&str>> {
    let mut boards = boards.lock().unwrap();

    let board = boards
        .get_board_mut(board_id)
        .ok_or(status::NotFound("no such board"))?;

    board.name = new_name;

    Ok(())
}

#[get("/boards/<board_id>?<filter>")]
pub fn get_board_view_default(
    boards: State<Mutex<Boards>>,
    board_id: u64,
    filter: Option<String>,
) -> Option<Json<String>> {
    let mut boards = boards.lock().unwrap();

    let board = boards.get_board_mut(BoardId::new(board_id))?;

    Some(Json(
        serde_json::to_string(&ApiBoardViewDefault::new(board, filter.as_deref())).unwrap(),
    ))
}

#[get("/boards/<board_id>/bycategory/<category>?<filter>")]
pub fn get_board_view_by_category(
    boards: State<Mutex<Boards>>,
    board_id: BoardId,
    filter: Option<String>,
    category: String,
) -> status::Custom<()> {
    status::Custom(Status::NotImplemented, ())
}

#[post("/boards/<board_id>/cards")]
pub fn add_card(
    boards: State<Mutex<Boards>>,
    board_id: BoardId,
) -> Result<CardId, status::NotFound<&str>> {
    let mut boards = boards.lock().unwrap();

    let board = boards
        .get_board_mut(board_id)
        .ok_or(status::NotFound("No such board"))?;

    Ok(board.new_card())
}

#[delete("/boards/<board_id>/cards/<card_id>")]
pub fn delete_card(
    boards: State<Mutex<Boards>>,
    board_id: BoardId,
    card_id: CardId,
) -> Result<status::NoContent, status::NotFound<String>> {
    let mut boards = boards.lock().unwrap();

    let board = boards
        .get_board_mut(board_id)
        .ok_or(status::NotFound("No such board".to_owned()))?;

    board
        .delete_card(card_id)
        .map(|_| status::NoContent)
        .map_err(|err| status::NotFound(err.to_string()))
}

#[put("/boards/<board_id>/cards/<card_id>/text", data = "<new_text>")]
pub fn set_card_text(
    boards: State<Mutex<Boards>>,
    board_id: BoardId,
    card_id: CardId,
    new_text: String,
) -> Result<(), status::NotFound<String>> {
    let mut boards = boards.lock().unwrap();

    let board = boards
        .get_board_mut(board_id)
        .ok_or(status::NotFound("no such board".to_owned()))?;

    board
        .set_card_text(card_id, new_text)
        .map_err(|err| (status::NotFound(err.to_string())))
}

#[derive(Debug, Responder)]
pub enum CardTagError {
    NotFound(status::NotFound<String>),
    BadRequest(status::BadRequest<String>),
}

#[post("/boards/<board_id>/cards/<card_id>/tags", data = "<new_tag>")]
pub fn add_card_tag(
    boards: State<Mutex<Boards>>,
    board_id: BoardId,
    card_id: CardId,
    new_tag: String,
) -> Result<(), CardTagError> {
    let new_tag = match Tag::new(new_tag) {
        Ok(tag) => tag,
        Err(_) => {
            return Err(CardTagError::BadRequest(status::BadRequest(Some(
                "Supplied tag is invalid".to_owned(),
            ))))
        }
    };

    let mut boards = boards.lock().unwrap();

    let board = boards
        .get_board_mut(board_id)
        .ok_or(CardTagError::NotFound(status::NotFound(
            "no such board".to_owned(),
        )))?;

    board
        .add_card_tag(card_id, &new_tag)
        .map_err(|err| CardTagError::BadRequest(status::BadRequest(Some(err.to_string()))))
}

#[delete("/boards/<board_id>/cards/<card_id>/tags", data = "<tag_to_delete>")]
pub fn delete_card_tag(
    boards: State<Mutex<Boards>>,
    board_id: BoardId,
    card_id: CardId,
    tag_to_delete: String,
) -> Result<(), CardTagError> {
    let new_tag = match Tag::new(tag_to_delete) {
        Ok(tag) => tag,
        Err(_) => {
            return Err(CardTagError::BadRequest(status::BadRequest(Some(
                "Supplied tag is invalid".to_owned(),
            ))))
        }
    };

    let mut boards = boards.lock().unwrap();

    let board = boards
        .get_board_mut(board_id)
        .ok_or(CardTagError::NotFound(status::NotFound(
            "no such board".to_owned(),
        )))?;

    board
        .delete_card_tag(card_id, &new_tag)
        .map_err(|err| CardTagError::BadRequest(status::BadRequest(Some(err.to_string()))))
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

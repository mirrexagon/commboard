use std::sync::Mutex;

use rocket::{
    delete, get,
    http::RawStr,
    http::Status,
    post, put,
    request::{FromParam, Request},
    response::{self, content::Json, status, Responder},
    State,
};

use crate::board::{Board, CardId, Tag};

mod structs;
use structs::*;

#[put("/board/name", data = "<new_name>")]
pub fn set_board_name(
    board: State<Mutex<Board>>,
    new_name: String,
) -> Result<(), status::NotFound<&str>> {
    let mut board = board.lock().unwrap();

    board.name = new_name;

    Ok(())
}

#[get("/board?<filter>")]
pub fn get_board_view_default(
    board: State<Mutex<Board>>,
    filter: Option<String>,
) -> Option<Json<String>> {
    let board = board.lock().unwrap();

    Some(Json(
        serde_json::to_string(&ApiBoardViewDefault::new(&*board, filter.as_deref())).unwrap(),
    ))
}

#[get("/board/category/<category>?<filter>")]
pub fn get_board_view_by_category(
    board: State<Mutex<Board>>,
    filter: Option<String>,
    category: String,
) -> Option<Json<String>> {
    let mut board = board.lock().unwrap();

    if let Some(api_board_view_by_category) =
        ApiBoardViewCategory::new(&*board, &category, filter.as_deref())
    {
        Some(Json(
            serde_json::to_string(&api_board_view_by_category).unwrap(),
        ))
    } else {
        None
    }
}

#[post("/board/cards")]
pub fn add_card(board: State<Mutex<Board>>) -> Result<CardId, status::NotFound<&str>> {
    let mut board = board.lock().unwrap();

    Ok(board.new_card())
}

#[delete("/board/cards/<card_id>")]
pub fn delete_card(
    board: State<Mutex<Board>>,
    card_id: CardId,
) -> Result<status::NoContent, status::NotFound<String>> {
    let mut board = board.lock().unwrap();

    board
        .delete_card(card_id)
        .map(|_| status::NoContent)
        .map_err(|err| status::NotFound(err.to_string()))
}

#[put("/board/cards/<card_id>/text", data = "<new_text>")]
pub fn set_card_text(
    board: State<Mutex<Board>>,
    card_id: CardId,
    new_text: String,
) -> Result<(), status::NotFound<String>> {
    let mut board = board.lock().unwrap();

    board
        .set_card_text(card_id, new_text)
        .map_err(|err| (status::NotFound(err.to_string())))
}

#[derive(Debug, Responder)]
pub enum CardTagError {
    NotFound(status::NotFound<String>),
    BadRequest(status::BadRequest<String>),
}

#[post("/board/cards/<card_id>/tags", data = "<new_tag>")]
pub fn add_card_tag(
    board: State<Mutex<Board>>,
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

    let mut board = board.lock().unwrap();

    board
        .add_card_tag(card_id, &new_tag)
        .map_err(|err| CardTagError::BadRequest(status::BadRequest(Some(err.to_string()))))
}

#[delete("/board/cards/<card_id>/tags", data = "<tag_to_delete>")]
pub fn delete_card_tag(
    board: State<Mutex<Board>>,
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

    let mut board = board.lock().unwrap();

    board
        .delete_card_tag(card_id, &new_tag)
        .map_err(|err| CardTagError::BadRequest(status::BadRequest(Some(err.to_string()))))
}

impl<'r> FromParam<'r> for CardId {
    type Error = <u64 as FromParam<'r>>::Error;

    fn from_param(param: &'r RawStr) -> Result<Self, Self::Error> {
        u64::from_param(param).map(CardId::new)
    }
}

impl<'r> Responder<'r> for CardId {
    fn respond_to(self, request: &Request) -> response::Result<'r> {
        String::respond_to(format!("{}", self.as_integer()), request)
    }
}

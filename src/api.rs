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
    board::BoardId,
    card::{CardId, Tag},
    AppState,
};

#[derive(Debug, Serialize)]
struct BoardInfo<'a> {
    pub id: BoardId,
    pub name: &'a str,
}

#[get("/board")]
pub fn get_boards(state: State<Mutex<AppState>>) -> content::Json<String> {
    let state = state.lock().unwrap();

    let boards_info_only: Vec<_> = state
        .get_boards()
        .iter()
        .map(|board| BoardInfo {
            id: board.id(),
            name: &board.name,
        })
        .collect();

    content::Json(serde_json::to_string(&boards_info_only).unwrap())
}

#[post("/board")]
pub fn add_board(state: State<Mutex<AppState>>) -> BoardId {
    let mut state = state.lock().unwrap();

    state.add_board().id()
}

#[delete("/board/<board_id>")]
pub fn delete_board(state: State<Mutex<AppState>>, board_id: BoardId) -> Option<status::NoContent> {
    let mut state = state.lock().unwrap();

    if state.delete_board(board_id) {
        Some(status::NoContent)
    } else {
        None
    }
}

#[put("/board/<board_id>/name", data = "<new_name>")]
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

#[get("/board/<board_id>/view?<filter>")]
pub fn get_board_view(
    state: State<Mutex<AppState>>,
    board_id: u64,
    filter: Option<String>,
) -> Option<content::Json<String>> {
    let mut state = state.lock().unwrap();

    let board = state.get_board_mut(BoardId(board_id))?;

    Some(content::Json(
        serde_json::to_string(&board.get_view(filter.as_deref())).unwrap(),
    ))
}

#[get("/board/<board_id>/viewbycategory/<category>?<filter>")]
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

#[post("/board/<board_id>/card")]
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

#[delete("/board/<board_id>/card/<card_id>")]
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

#[put("/board/<board_id>/card/<card_id>/text", data = "<new_text>")]
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

#[put("/board/<board_id>/card/<card_id>/tags", data = "<new_tags>")]
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
        .map(|tag_string| Tag::from_tag_string(tag_string))
        .collect::<Option<Vec<_>>>();

    card.tags = new_tags.ok_or(SetCardsTagsError::InvalidTag(status::BadRequest(Some(
        "A supplied tag was invalid",
    ))))?;

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

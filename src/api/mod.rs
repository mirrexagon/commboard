use std::sync::Mutex;

use rocket::{
    get, post,
    response::{content, status},
    State,
};

use rocket_contrib::json::Json;

use crate::board::{self, Tag};

#[get("/tags/validate/<tag>")]
pub fn validate_tag(tag: String) -> &'static str {
    match Tag::new(tag) {
        Ok(_) => "true",
        Err(_) => "false",
    }
}

#[get("/state")]
pub fn get_current_state(board: State<Mutex<board::Board>>) -> content::Json<String> {
    let board = board.lock().unwrap();

    content::Json(board.get_state_as_json().to_string())
}

#[post("/mutate", data = "<action>")]
pub fn mutate(
    board: State<Mutex<board::Board>>,
    action: Json<board::Action>,
) -> Result<(), status::BadRequest<String>> {
    let mut board = board.lock().unwrap();

    board
        .mutate(&action.0)
        .map_err(|e| status::BadRequest(Some(format!("{}", e))))
}

use std::sync::Mutex;

use rocket::{get, post, response::status, State};

use rocket_contrib::json::Json;

use crate::board::{self, Tag};

#[get("/tags/validate/<tag>")]
pub fn validate_tag(tag: String) -> &'static str {
    match Tag::new(tag) {
        Ok(_) => "true",
        Err(_) => "false",
    }
}

#[post("/perform_action", data = "<action>")]
pub fn perform_action(
    board: State<Mutex<board::Board>>,
    action: Json<board::Action>,
) -> Result<(), status::BadRequest<String>> {
    let mut board = board.lock().unwrap();

    board
        .perform_action(&action.0)
        .map_err(|e| status::BadRequest(Some(format!("{}", e))))
}

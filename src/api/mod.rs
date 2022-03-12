use std::time::Instant;
use std::sync::Mutex;

use log::info;

use rocket::{
    get, post,
    response::{content, status},
    serde::json::Json,
    State,
};

use crate::board::{self, Tag};

#[get("/validatetag/<tag>")]
pub fn validate_tag(tag: String) -> &'static str {
    match Tag::new(tag) {
        Ok(_) => "true",
        Err(_) => "false",
    }
}

#[get("/state")]
pub fn get_current_state(board: &State<Mutex<board::Board>>) -> content::Json<String> {
    let start = Instant::now();

    let board = board.lock().unwrap();
    let result = content::Json(board.get_state_as_json().to_string());

    let duration = start.elapsed();
    info!("/state took {} ms", duration.as_millis());

    result
}

#[post("/action", data = "<action>")]
pub fn perform_action(
    board: &State<Mutex<board::Board>>,
    action: Json<board::Action>,
) -> Result<(), status::BadRequest<String>> {
    let start = Instant::now();

    let mut board = board.lock().unwrap();

    let result = board
        .perform_action(&action.0)
        .map_err(|e| status::BadRequest(Some(format!("{}", e))));

    let duration = start.elapsed();
    info!("/action took {} ms ", duration.as_millis());

    result
}

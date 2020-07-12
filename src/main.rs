#![feature(proc_macro_hygiene, decl_macro)]

mod board;

use rocket::{get, http::RawStr, response::content, routes, State};

use board::{Board, BoardId, Tag};

#[get("/")]
fn index() -> &'static str {
    "TODO: UI"
}

#[get("/board/<id>?<filter>&<groupby>")]
fn get_board_view(
    board: State<Board>,
    id: Result<u64, &RawStr>,
    filter: Option<String>,
    groupby: Option<String>,
) -> content::Json<String> {
    // let view = if let Some(group_by_category) = groupby {
    //     board.get_board_view_by_category(filter.as_deref(), &groupby.unwrap())
    // } else {
    //     board.get_board_view(filter.as_deref(), groupby.as_deref())

    // };

    content::Json("".to_owned())
}

fn main() {
    // rocket::ignite()
    //     .mount("/", routes![get_board_view])
    //     .manage(board)
    //     .launch();
}

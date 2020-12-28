#![feature(proc_macro_hygiene, decl_macro)]

use std::sync::Mutex;
use std::path::{Path, PathBuf};

use rocket::{get, response::content, routes};
use clap::{App, Arg};

use board::{Board, Tag};

mod api;
mod board;

#[get("/")]
fn index() -> content::Html<&'static str> {
    content::Html(include_str!("../ui/dist/index.html"))
}

#[get("/bundle.js")]
fn index_bundle() -> content::JavaScript<&'static str> {
    content::JavaScript(include_str!("../ui/dist/bundle.js"))
}

fn main() {
    env_logger::init();

    let arg_matches = App::new("Commboard")
        .arg(
            Arg::with_name("FILE")
            .help("The board .json file to use. It will be created if it doesn't exist.")
            .required(true))
        .get_matches();

    let board_file_path = Path::new(arg_matches.value_of("FILE").unwrap()).to_owned();

    let board;
    if board_file_path.is_file() {
        board = Board::load_from_file(&board_file_path).expect("Couldn't load board file");
    } else {
        board = Board::new(&board_file_path);
        board.save_to_file(&board_file_path).expect("Couldn't save new board file");
    }

    let board = Mutex::new(board);

    rocket::ignite()
        .mount("/", routes![index, index_bundle])
        .mount(
            "/api",
            routes![
                api::validate_tag,
                api::set_board_name,
                api::get_board_view_default,
                api::get_board_view_by_category,
                api::add_card,
                api::delete_card,
                api::set_card_text,
                api::add_card_tag,
                api::delete_card_tag,
                api::move_card_within_default_card_order,
                api::move_card_in_column,
                api::move_column_in_category,
            ],
        )
        .manage(board)
        .launch();
}

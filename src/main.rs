#![feature(proc_macro_hygiene, decl_macro)]

use std::sync::Mutex;

use rocket::{get, response::content, routes};

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

    let board = Mutex::new(Board::new());
    {
        let mut board = board.lock().unwrap();

        {
            let card1 = board.new_card();
            board.set_card_text(card1, "Task 1").unwrap();

            board
                .add_card_tag(card1, &Tag::new("status:todo").unwrap())
                .unwrap();
            board
                .add_card_tag(card1, &Tag::new("artist:tester").unwrap())
                .unwrap();
            board
                .add_card_tag(card1, &Tag::new("rating:bad").unwrap())
                .unwrap();
        }

        {
            let card1 = board.new_card();
            board.set_card_text(card1, "Task 2").unwrap();

            board
                .add_card_tag(card1, &Tag::new("status:in-progress").unwrap())
                .unwrap();
            board
                .add_card_tag(card1, &Tag::new("artist:tester").unwrap())
                .unwrap();
            board
                .add_card_tag(card1, &Tag::new("rating:bad").unwrap())
                .unwrap();
        }

        {
            let card1 = board.new_card();
            board.set_card_text(card1, "Task 3").unwrap();

            board
                .add_card_tag(card1, &Tag::new("status:in-progress").unwrap())
                .unwrap();
            board
                .add_card_tag(card1, &Tag::new("rating:good").unwrap())
                .unwrap();
        }
    }

    rocket::ignite()
        .mount(
            "/",
            routes![
                index,
                index_bundle,
                api::validate_tag,
                api::set_board_name,
                api::get_board_view_default,
                api::get_board_view_by_category,
                api::add_card,
                api::delete_card,
                api::set_card_text,
                api::add_card_tag,
                api::delete_card_tag,
            ],
        )
        .manage(board)
        .launch();
}

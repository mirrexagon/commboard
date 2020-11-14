#![feature(proc_macro_hygiene, decl_macro)]

use std::sync::Mutex;

use rocket::{get, response::content, routes};

use state::{board::Tag, boards::Boards};

mod api;
mod state;

#[get("/")]
fn index() -> content::Html<&'static str> {
    content::Html(include_str!("../ui/build/index.html"))
}

// TODO: Try rust-embed to embed the whole build directory in the binary.
// https://github.com/pyros2097/rust-embed/issues/111#issuecomment-633823642
#[get("/bundle.js")]
fn index_bundle() -> content::JavaScript<&'static str> {
    content::JavaScript(include_str!("../ui/build/bundle.js"))
}

fn main() {
    let boards = Mutex::new(Boards::new());
    {
        let mut boards = boards.lock().unwrap();
        let board = boards.new_board();

        {
            let card1 = board.add_card();
            board.set_card_text(card1, "Task 1");

            board.add_card_tag(card1, &Tag::new("status:todo").unwrap());
            board.add_card_tag(card1, &Tag::new("artist:tester").unwrap());
            board.add_card_tag(card1, &Tag::new("rating:bad").unwrap());
        }

        {
            let card1 = board.add_card();
            board.set_card_text(card1, "Task 2");

            board.add_card_tag(card1, &Tag::new("status:in-progress").unwrap());
            board.add_card_tag(card1, &Tag::new("artist:tester").unwrap());
            board.add_card_tag(card1, &Tag::new("rating:bad").unwrap());
        }

        {
            let card1 = board.add_card();
            board.set_card_text(card1, "Task 3");

            board.add_card_tag(card1, &Tag::new("status:in-progress").unwrap());
            board.add_card_tag(card1, &Tag::new("rating:good").unwrap());
        }
    }

    rocket::ignite()
        .mount(
            "/",
            routes![
                index,
                index_bundle,
                api::get_boards,
                api::add_board,
                api::delete_board,
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
        .manage(state)
        .launch();
}

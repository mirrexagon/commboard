#![feature(proc_macro_hygiene, decl_macro)]

use std::sync::Mutex;

use rocket::{get, response::content, routes};

use state::{board::Tag, AppState};

//mod api;
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
    /*
    let state = Mutex::new(AppState::new());
    {
        let mut state = state.lock().unwrap();
        let board = state.add_board();

        {
            let card1 = board.add_card();
            card1.text = "Task 1".to_owned();
            card1.tags = vec![
                Tag::new("status:todo").unwrap(),
                Tag::new("artist:tester").unwrap(),
                Tag::new("rating:bad").unwrap(),
            ];
        }

        {
            let card2 = board.add_card();
            card2.text = "Task 2".to_owned();
            card2.tags = vec![
                Tag::new("status:in-progress").unwrap(),
                Tag::new("artist:tester").unwrap(),
                Tag::new("rating:bad").unwrap(),
            ];
        }

        {
            let card3 = board.add_card();
            card3.text = "Task 3".to_owned();
            card3.tags = vec![
                Tag::new("status:in-progress").unwrap(),
                Tag::new("rating:good").unwrap(),
            ];
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
                api::get_board,
                api::get_board_view_by_category,
                api::add_card,
                api::delete_card,
                api::set_card_text,
                api::set_card_tags,
            ],
        )
        .manage(state)
        .launch();
        */
}

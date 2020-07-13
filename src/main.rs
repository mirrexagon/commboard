#![feature(proc_macro_hygiene, decl_macro)]

mod board;

use rocket::{get, http::RawStr, response::content, routes, State};

use board::{Boards, Board, BoardId, Tag, ViewAll, ViewByCategory};

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

#[get("/board/<id>/view?<filter>")]
fn get_board_view(
    board: State<Board>,
    id: Result<u64, &RawStr>,
    filter: Option<String>,
) -> Option<content::Json<String>> {
    content::Json(serde_json::to_string(&board.get_view(filter.as_deref())).unwrap())
}

#[get("/board/<id>/viewbycategory?<filter>&<groupby>")]
fn get_board_view_by_category(
    board: State<Board>,
    id: Result<u64, &RawStr>,
    filter: Option<String>,
    groupby: String,
) -> Option<content::Json<String>> {
    content::Json(
        serde_json::to_string(&board.get_view_by_category(filter.as_deref(), &groupby)).unwrap(),
    )
}

fn main() {
    let mut boards = Boards::new();
    let mut board_id = Boards::add_board;

    let card1 = board.add_card();
    board.set_card_text(card1, "Task 1");
    board.set_card_tags(
        card1,
        &[
            Tag::from_tag_string("status:todo").unwrap(),
            Tag::from_tag_string("artist:tester").unwrap(),
            Tag::from_tag_string("rating:bad").unwrap(),
        ],
    );

    let card2 = board.add_card();
    board.set_card_text(card2, "Task 2");
    board.set_card_tags(
        card2,
        &[
            Tag::from_tag_string("status:in-progress").unwrap(),
            Tag::from_tag_string("artist:tester").unwrap(),
            Tag::from_tag_string("rating:bad").unwrap(),
        ],
    );

    let card3 = board.add_card();
    board.set_card_text(card3, "Task 3");
    board.set_card_tags(
        card3,
        &[
            Tag::from_tag_string("status:in-progress").unwrap(),
            Tag::from_tag_string("rating:good").unwrap(),
        ],
    );

    rocket::ignite()
        .mount(
            "/",
            routes![
                index,
                index_bundle,
                get_board_view,
                get_board_view_by_category
            ],
        )
        .manage(board)
        .launch();
}

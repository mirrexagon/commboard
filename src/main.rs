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
    let json_output;

    if let Some(group_by_category) = groupby {
        let view = board.get_view_by_category(filter.as_deref(), &group_by_category);
        json_output = serde_json::to_string(&view).unwrap();
    } else {
        let view = board.get_view(filter.as_deref());
        json_output = serde_json::to_string(&view).unwrap();
    };

    content::Json(json_output)
}

fn main() {
    // TODO: Use Boards, with multiple boards
    let mut board = Board::new(BoardId(0));

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
        .mount("/", routes![index, get_board_view])
        .manage(board)
        .launch();
}

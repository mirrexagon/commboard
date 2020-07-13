#![feature(proc_macro_hygiene, decl_macro)]

use std::sync::Mutex;

use rocket::{get, response::content, routes, State};

use state::{board::BoardId, card::Tag, AppState};

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

#[get("/board/<id>/view?<filter>")]
fn get_board_view(
    state: State<Mutex<AppState>>,
    id: Option<u64>,
    filter: Option<String>,
) -> Option<content::Json<String>> {
    let mut state = state.lock().unwrap();

    let id = BoardId(id?);
    let board = state.get_board_mut(id)?;

    Some(content::Json(
        serde_json::to_string(&board.get_view(filter.as_deref())).unwrap(),
    ))
}

#[get("/board/<id>/viewbycategory?<filter>&<groupby>")]
fn get_board_view_by_category(
    state: State<Mutex<AppState>>,
    id: Option<u64>,
    filter: Option<String>,
    groupby: String,
) -> Option<content::Json<String>> {
    let mut state = state.lock().unwrap();

    let id = BoardId(id?);
    let board = state.get_board_mut(id)?;

    Some(content::Json(
        serde_json::to_string(&board.get_view_by_category(filter.as_deref(), &groupby)).unwrap(),
    ))
}

fn main() {
    let state = Mutex::new(AppState::new());
    {
        let mut state = state.lock().unwrap();
        let board = state.add_board();

        {
            let card1 = board.add_card();
            card1.text = "Task 1".to_owned();
            card1.tags = vec![
                Tag::from_tag_string("status:todo").unwrap(),
                Tag::from_tag_string("artist:tester").unwrap(),
                Tag::from_tag_string("rating:bad").unwrap(),
            ];
        }

        {
            let card2 = board.add_card();
            card2.text = "Task 2".to_owned();
            card2.tags = vec![
                Tag::from_tag_string("status:in-progress").unwrap(),
                Tag::from_tag_string("artist:tester").unwrap(),
                Tag::from_tag_string("rating:bad").unwrap(),
            ];
        }

        {
            let card3 = board.add_card();
            card3.text = "Task 3".to_owned();
            card3.tags = vec![
                Tag::from_tag_string("status:in-progress").unwrap(),
                Tag::from_tag_string("rating:good").unwrap(),
            ];
        }
    }

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
        .manage(state)
        .launch();
}

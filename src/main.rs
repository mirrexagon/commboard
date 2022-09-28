use std::path::Path;
use std::sync::Mutex;

use clap::Parser;
use rocket::{get, launch, response::content, routes};

use env_logger::Env;

use board::Board;

mod api;
mod board;

#[derive(Parser, Debug)]
#[clap(author, version, about, long_about = None)]
struct Args {
    file: String,
}

#[get("/")]
fn index() -> content::RawHtml<&'static str> {
    content::RawHtml(include_str!("../ui/dist/index.html"))
}

#[get("/bundle.js")]
fn index_bundle() -> content::RawJavaScript<&'static str> {
    content::RawJavaScript(include_str!("../ui/dist/bundle.js"))
}

#[launch]
fn rocket() -> _ {
    // Set default log level to info.
    env_logger::Builder::from_env(Env::default().default_filter_or("info")).init();

    let args = Args::parse();

    let board_file_path = Path::new(&args.file);

    let board;
    if board_file_path.is_file() {
        board = Board::load(board_file_path).expect("Couldn't load board file");
    } else {
        board = Board::new(board_file_path);
        board.save().expect("Couldn't save new board file");
    }

    let board = Mutex::new(board);

    rocket::build()
        .mount("/", routes![index, index_bundle])
        .mount(
            "/api",
            routes![
                api::validate_tag,
                api::get_current_state,
                api::perform_action
            ],
        )
        .manage(board)
}

use std::fs;
use std::path::Path;
use std::sync::Mutex;

use clap::Parser;
use rocket::{get, launch, response::content, routes};

use env_logger::Env;

use board::Board;

mod api;
mod board;
mod config;

#[derive(Parser, Debug)]
#[clap(author, version, about, long_about = None)]
struct Args {
    file: String,
}

#[get("/")]
fn index() -> content::RawHtml<&'static str> {
    content::RawHtml(include_str!("../ui/dist/index.html"))
}

#[get("/index.js")]
fn index_bundle() -> content::RawJavaScript<&'static str> {
    content::RawJavaScript(include_str!("../ui/dist/index.js"))
}

#[get("/index.css")]
fn index_css() -> content::RawCss<&'static str> {
    content::RawCss(include_str!("../ui/dist/index.css"))
}

#[launch]
fn rocket() -> _ {
    // Set default log level to info.
    env_logger::Builder::from_env(Env::default().default_filter_or("info")).init();

    let args = Args::parse();

    let xdg_dirs = xdg::BaseDirectories::with_prefix("commboard").unwrap();
    let config_path = xdg_dirs
        .place_config_file("config.toml")
        .expect("Couldn't create configuration directory");

    let config: config::Config = {
        let contents = fs::read_to_string(&config_path)
            .expect(&format!("Couldn't read config file {config_path:?}"));
        toml::from_str(&contents).expect(&format!("Couldn't load config file {config_path:?}"))
    };

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
        .mount("/", routes![index, index_bundle, index_css])
        .mount(
            "/api",
            routes![
                api::validate_tag,
                api::get_current_state,
                api::perform_action
            ],
        )
        .manage(board)
        .manage(config)
}

use std::path::Path;
use std::sync::Mutex;

use clap::{App, Arg};

use board::Board;

mod board;

fn main() {
    let arg_matches = App::new("Commboard")
        .arg(
            Arg::with_name("FILE")
                .help("The board .json file to use. It will be created if it doesn't exist.")
                .required(true),
        )
        .get_matches();

    let board_file_path = Path::new(arg_matches.value_of("FILE").unwrap()).to_owned();

    let board;
    if board_file_path.is_file() {
        board = Board::load(&board_file_path).expect("Couldn't load board file");
    } else {
        board = Board::new(&board_file_path);
        board.save().expect("Couldn't save new board file");
    }
}

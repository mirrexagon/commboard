use std::{fs, path};

use super::*;

fn new_board() -> Board {
    let file_path = path::Path::new("/tmp/board-test.json");

    if file_path.exists() {
        fs::remove_file(file_path).unwrap();
    }

    Board::new(file_path)
}

#[test]
fn add_card_to_empty_board() -> Result<(), BoardError> {
    let mut board = new_board();

    board.perform_action(&Action::NewCard)?;

    assert_eq!(board.cards.len(), 1);
    assert_eq!(board.card_order, vec![CardId::new(0)]);

    Ok(())
}

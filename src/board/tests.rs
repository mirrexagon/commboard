use std::{fs, path};

use super::*;

fn new_board() -> Board {
    let file_path = path::Path::new("/tmp/board-test.json");
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

#[test]
fn move_card_within_order() -> Result<(), BoardError> {
    let mut board = new_board();

    board.perform_action(&Action::NewCard)?;
    board.perform_action(&Action::NewCard)?;
    board.perform_action(&Action::NewCard)?;

    assert_eq!(
        board.card_order,
        vec![CardId::new(0), CardId::new(1), CardId::new(2)]
    );

    // Move last card up.
    board.perform_action(&Action::MoveCurrentCardVerticalOffset { offset: -1 })?;

    assert_eq!(
        board.card_order,
        vec![CardId::new(0), CardId::new(2), CardId::new(1)]
    );

    Ok(())
}

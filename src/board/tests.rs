use super::*;

#[test]
fn normal_view() {
    let board = make_test_board_1();
    let view = board.get_board_view(None);

    assert_eq!(view.cards.len(), 3);
    // TODO: Check more of contents.
}

#[test]
fn grouped_view() {
    let board = make_test_board_1();
    let view = board.get_board_view_by_category(None, "status");

    assert_eq!(view.columns.len(), 2);
    // TODO: Check more of contents.
}

fn make_test_board_1() -> Board {
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

    board
}

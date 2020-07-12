use super::*;

#[test]
fn grouped_view() {
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

    let view = board.get_board_view(None, Some("status"));
}

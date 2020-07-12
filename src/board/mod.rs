use serde::{Deserialize, Serialize};
use std::collections::HashMap;

mod card;

pub use card::{Card, CardId, Tag};

#[cfg(test)]
mod tests;

#[derive(Debug, Clone)]
pub struct Boards {
    boards: Vec<Board>,
}

#[derive(Debug, Clone, Copy, PartialOrd, Ord, PartialEq, Eq)]
pub struct BoardId(pub u64);

#[derive(Debug, Clone)]
pub struct Board {
    id: BoardId,
    cards: Vec<Card>,
    next_card_id: CardId,
}

#[derive(Debug)]
pub struct BoardView<'a> {
    pub cards: Vec<&'a Card>,
}

#[derive(Debug)]
pub struct BoardViewByCategory<'a> {
    pub columns: Vec<BoardViewColumn<'a>>,
}

#[derive(Debug)]
pub struct BoardViewColumn<'a> {
    pub name: &'a str,
    pub cards: Vec<&'a Card>,
}

impl Board {
    pub fn new(id: BoardId) -> Self {
        Self {
            id,
            cards: Vec::new(),
            next_card_id: CardId(0),
        }
    }

    pub fn add_card(&mut self) -> CardId {
        let id = self.get_next_card_id();
        self.cards.push(Card::new(id));
        id
    }

    /// Returns `false` if no card with the given ID exists in the board.
    pub fn delete_card(&mut self, id: CardId) -> bool {
        let mut index = None;

        for (i, card) in self.cards.iter().enumerate() {
            if card.id == id {
                index = Some(i);
                break;
            }
        }

        if let Some(index) = index {
            self.cards.remove(index);
            true
        } else {
            false
        }
    }

    /// Returns `false` if no card with the given ID exists in the board.
    pub fn set_card_text(&mut self, id: CardId, text: &str) -> bool {
        self.modify_card(id, |card| card.text = text.to_owned())
    }

    /// Returns `false` if no card with the given ID exists in the board.
    pub fn set_card_tags(&mut self, id: CardId, tags: &[Tag]) -> bool {
        self.modify_card(id, |card| card.tags = tags.to_vec())
    }

    pub fn get_board_view_by_category(
        &self,
        filter: Option<&str>,
        group_by_category: &str,
    ) -> BoardViewByCategory {
        // TODO: Save custom order of columns for each category, instead of using alphabetical order.

        let mut columns: Vec<BoardViewColumn> = Vec::new();
        let mut value_to_column_index: HashMap<String, usize> = HashMap::new();

        for card in self.get_cards(filter) {
            let matching_tags = card.get_tags_with_category(group_by_category);

            for tag in matching_tags {
                if let Some(&column_index) = value_to_column_index.get(&tag.value) {
                    columns[column_index].cards.push(card);
                } else {
                    let column_index = columns.len();
                    columns.push(BoardViewColumn {
                        name: &tag.value,
                        cards: vec![card],
                    });
                    value_to_column_index.insert(tag.value.clone(), column_index);
                }
            }
        }

        columns.sort_by(|a, b| a.name.cmp(b.name));

        BoardViewByCategory { columns }
    }

    pub fn get_board_view(&self, filter: Option<&str>) -> BoardView {
        BoardView {
            cards: self.get_cards(filter),
        }
    }

    fn get_cards(&self, filter: Option<&str>) -> Vec<&Card> {
        // TODO: Implement filtering.
        self.cards.iter().collect()
    }

    /// Runs a function or closure on a card, if it exists.
    ///
    /// Returns `false` if no card with the given ID exists in the board.
    /// Otherwise, the function has been applied.
    fn modify_card<F: FnOnce(&mut Card)>(&mut self, id: CardId, func: F) -> bool {
        if let Some(card) = self.get_card_mut(id) {
            func(card);
            true
        } else {
            false
        }
    }

    fn get_card_mut(&mut self, id: CardId) -> Option<&mut Card> {
        for card in &mut self.cards {
            if card.id == id {
                return Some(card);
            }
        }

        None
    }

    fn get_next_card_id(&mut self) -> CardId {
        let next_card_id = self.next_card_id;
        self.next_card_id = self.next_card_id.next();
        next_card_id
    }
}

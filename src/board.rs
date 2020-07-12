use std::collections::HashMap;

use serde::{Deserialize, Serialize};

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

    /// Get a read-only view of the board, based on an optional filter
    /// string and an optional category to group by.
    pub fn get_board_view(
        &self,
        filter: Option<&str>,
        group_by_category: Option<&str>,
    ) -> BoardView {
        match group_by_category {
            Some(group_by_category) => self.get_board_view_by_category(filter, group_by_category),
            None => self.get_board_view_all(filter),
        }
    }

    fn get_board_view_by_category(
        &self,
        filter: Option<&str>,
        group_by_category: &str,
    ) -> BoardView {
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

        BoardView::ByCategory { columns }
    }

    fn get_board_view_all(&self, filter: Option<&str>) -> BoardView {
        BoardView::All {
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

#[derive(Debug)]
pub enum BoardView<'a> {
    All { cards: Vec<&'a Card> },
    ByCategory { columns: Vec<BoardViewColumn<'a>> },
}

#[derive(Debug)]
pub struct BoardViewColumn<'a> {
    pub name: &'a str,
    pub cards: Vec<&'a Card>,
}

#[derive(Debug, Clone, Copy, PartialOrd, Ord, PartialEq, Eq)]
pub struct CardId(pub u64);

impl CardId {
    pub fn next(&self) -> CardId {
        CardId(self.0 + 1)
    }
}

#[derive(Debug, Clone)]
pub struct Card {
    pub id: CardId,
    pub text: String,
    pub tags: Vec<Tag>,
}

impl Card {
    pub fn new(id: CardId) -> Self {
        Self {
            id,
            text: String::new(),
            tags: Vec::new(),
        }
    }

    pub fn has_category(&self, category: &str) -> bool {
        for tag in &self.tags {
            if tag.category == category {
                return true;
            }
        }

        false
    }

    pub fn get_tags_with_category(&self, category: &str) -> Vec<&Tag> {
        let mut tags_with_category = Vec::new();

        for tag in &self.tags {
            if tag.category == category {
                tags_with_category.push(tag)
            }
        }

        tags_with_category
    }
}

#[derive(Debug, Clone)]
pub struct Tag {
    pub category: String,
    pub value: String,
}

impl Tag {
    pub fn new(category: &str, value: &str) -> Self {
        Self {
            category: category.to_owned(),
            value: value.to_owned(),
        }
    }

    /// Returns `None` if there is no `:` in the string.
    pub fn from_tag_string(tag_string: &str) -> Option<Self> {
        tag_string.find(':').map(|index| {
            let (category, value) = tag_string.split_at(index);
            Self::new(category, &value[1..])
        })
    }
}

#[derive(Debug, thiserror::Error)]
pub enum Error {}

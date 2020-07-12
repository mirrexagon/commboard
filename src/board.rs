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

    fn get_card(&mut self, id: CardId) -> Option<&mut Card> {
        for card in &mut self.cards {
            if card.id == id {
                return Some(card);
            }
        }

        None
    }

    /// Returns `false` if no card with the given ID exists in the board.
    pub fn set_card_text(&mut self, id: CardId, text: &str) -> bool {
        self.modify_card(id, |card| card.text = text.to_owned())
    }

    /// Returns `false` if no card with the given ID exists in the board.
    pub fn set_card_tags(&mut self, id: CardId, tags: &[Tag]) -> bool {
        self.modify_card(id, |card| card.tags = tags.to_vec())
    }

    /// Runs a function or closure on a card, if it exists.
    ///
    /// Returns `false` if no card with the given ID exists in the board.
    /// Otherwise, the function has been applied.
    fn modify_card<F: FnOnce(&mut Card)>(&mut self, id: CardId, func: F) -> bool {
        if let Some(card) = self.get_card(id) {
            func(card);
            true
        } else {
            false
        }
    }

    pub fn get_board_view(
        &self,
        filter: Option<&str>,
        group_by_category: Option<&str>,
    ) -> BoardView {
        BoardView::All { cards: Vec::new() }
    }

    fn get_next_card_id(&mut self) -> CardId {
        let next_card_id = self.next_card_id;
        self.next_card_id = self.next_card_id.next();
        next_card_id
    }
}

pub enum BoardView<'a> {
    All { cards: Vec<&'a Card> },
    ByCategory { columns: Vec<BoardViewColumn<'a>> },
}

pub struct BoardViewColumn<'a> {
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

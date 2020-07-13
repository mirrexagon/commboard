#[derive(Debug, Clone, Copy, PartialOrd, Ord, PartialEq, Eq, Serialize, Deserialize)]
pub struct BoardId(pub u64);

impl BoardId {
    pub fn next(&self) -> BoardId {
        BoardId(self.0 + 1)
    }
}

// TODO: Keep track of order of columns for each category, and keep track of
// order of cards in each column for each category - the single all card order
// can't express all possible sets of orders between categories

#[derive(Debug, Serialize, Deserialize)]
pub struct Board {
    id: BoardId,
    pub name: String,
    cards: Vec<Card>,
    next_card_id: CardId,
}

impl Board {
    pub fn new(id: BoardId) -> Self {
        Self {
            id,
            name: format!("Board {}", id),
            cards: Vec::new(),
            next_card_id: CardId(0),
        }
    }

    pub fn id(&self) -> BoardId {
        self.id
    }

    // -- Cards --
    pub fn add_card(&mut self) -> &mut Card {
        let id = self.get_next_card_id();
        self.cards.push(Card::new(id));

        &mut self.cards[self.cards.len() - 1]
    }

    /// Returns `false` if no card with the given ID exists in the board.
    pub fn delete_card(&mut self, id: CardId) -> bool {
        let mut index = None;

        for (i, card) in self.cards.iter().enumerate() {
            if card.id() == id {
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

    /// Returns `None` if the specified card doesn't exist in the board.
    pub fn get_card_mut(&mut self, id: CardId) -> Option<&mut Card> {
        for card in &mut self.cards {
            if card.id() == id {
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

    // -- Views --
    pub fn get_view(&self, filter: Option<&str>) -> view::ViewAll {
        view::ViewAll::new(self, filter)
    }

    pub fn get_view_by_category(
        &self,
        filter: Option<&str>,
        category: &str,
    ) -> view::ViewByCategory {
        view::ViewByCategory::new(self, filter, category)
    }

    fn get_cards_with_filter(&self, filter: Option<&str>) -> Vec<&Card> {
        // TODO: Implement filtering.
        self.cards.iter().collect()
    }
}

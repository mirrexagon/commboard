pub mod board;
pub mod card;

use serde::{Deserialize, Serialize};

use board::{Board, BoardId};

#[cfg(test)]
mod tests;

#[derive(Debug, Serialize, Deserialize)]
pub struct AppState {
    boards: Vec<Board>,
    next_board_id: BoardId,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            boards: Vec::new(),
            next_board_id: BoardId(0),
        }
    }

    pub fn add_board(&mut self) -> &mut Board {
        let id = self.get_next_board_id();
        self.boards.push(Board::new(id));

        let index = self.boards.len() - 1;
        &mut self.boards[index]
    }

    /// Returns `false` if no board with the given ID exists.
    pub fn delete_board(&mut self, id: BoardId) -> bool {
        let mut index = None;

        for (i, board) in self.boards.iter().enumerate() {
            if board.id() == id {
                index = Some(i);
                break;
            }
        }

        if let Some(index) = index {
            self.boards.remove(index);
            true
        } else {
            false
        }
    }

    pub fn get_boards(&self) -> &[Board] {
        &self.boards[..]
    }

    /// Returns `None` if the specified board does not exist.
    pub fn get_board_mut(&mut self, id: BoardId) -> Option<&mut Board> {
        for board in &mut self.boards {
            if board.id() == id {
                return Some(board);
            }
        }

        None
    }

    fn get_next_board_id(&mut self) -> BoardId {
        let next_board_id = self.next_board_id;
        self.next_board_id = self.next_board_id.next();
        next_board_id
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}

use serde::{Deserialize, Serialize};
use thiserror::Error;

use super::board::{Board, BoardId};

#[derive(Debug, Serialize, Deserialize)]
pub struct Boards {
    /// The list of boards.
    boards: Vec<Board>,

    /// The ID that will be assigned to the next new board.
    next_board_id: BoardId,
}

impl Boards {
    /// Create a new `Boards`.
    pub fn new() -> Self {
        Self {
            boards: Vec::new(),
            next_board_id: BoardId::new(0),
        }
    }

    // Create a new board. Returns the ID of the new board, which can be used
    // to retrieve it.
    pub fn new_board(&mut self) -> BoardId {
        let id = self.get_next_board_id();
        self.boards.push(Board::new(id));
        id
    }

    fn get_next_board_id(&mut self) -> BoardId {
        let next_board_id = self.next_board_id;
        self.next_board_id = self.next_board_id.next();
        next_board_id
    }

    /// Delete the board with the specified ID.
    pub fn delete_board(&mut self, id: BoardId) -> Result<(), BoardsError> {
        if let Some(index) = self.get_index_of_board(id) {
            self.boards.remove(index);
            Ok(())
        } else {
            Err(BoardsError::NoSuchBoard)
        }
    }

    /// Returns a reference to the board with the specified ID, or `None` if
    /// the specified board does not exist.
    pub fn get_board(&self, id: BoardId) -> Option<&Board> {
        if let Some(index) = self.get_index_of_board(id) {
            Some(&self.boards[index])
        } else {
            None
        }
    }

    /// Returns a mutable reference to the board with the specified ID, or
    /// `None` if the specified board does not exist.
    pub fn get_board_mut(&mut self, id: BoardId) -> Option<&mut Board> {
        if let Some(index) = self.get_index_of_board(id) {
            Some(&mut self.boards[index])
        } else {
            None
        }
    }

    /// Given a `BoardId`, return the index of the corresponding board in the
    /// `boards` vector, or `None` if there is no such board.
    fn get_index_of_board(&self, id: BoardId) -> Option<usize> {
        for (i, board) in self.boards.iter().enumerate() {
            if board.id() == id {
                return Some(i);
            }
        }

        None
    }
}

#[derive(Debug, Error)]
pub enum BoardsError {
    #[error("no such board was found")]
    NoSuchBoard,
}

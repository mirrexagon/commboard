pub mod board;
pub mod boards;

use serde::{Deserialize, Serialize};

use boards::Boards;

#[derive(Debug, Serialize, Deserialize)]
pub struct AppState {
    boards: Boards,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            boards: Boards::new(),
        }
    }

    pub fn boards_mut(&mut self) -> &mut Boards {
        &mut self.boards
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}

use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
pub struct Config {
    #[serde(rename = "editor-command")]
    editor_command: String,
}

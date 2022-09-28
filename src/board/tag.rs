use serde::{Deserialize, Serialize};
use std::convert::TryFrom;

#[derive(Debug, PartialEq, Eq, PartialOrd, Ord, Clone, Hash, Serialize, Deserialize)]
#[serde(try_from = "String")]
pub struct Tag(String);

impl Tag {
    /// Creates a new `Tag` from a string, taking ownership of the string.
    /// Returns ownership of the string if it does not contain a `:`.
    pub fn new<S: Into<String>>(tag: S) -> Result<Self, String> {
        let tag = tag.into().to_lowercase();

        // Make sure the string has a colon.
        if let None = tag.find(':') {
            return Err(tag);
        }

        Ok(Self(tag))
    }

    /// Returns a reference to the inner string.
    pub fn tag(&self) -> &str {
        &self.0[..]
    }

    /// Returns a reference to the category part of the inner string.
    pub fn category(&self) -> &str {
        &self.0[..self.get_colon_index()]
    }

    /// Returns a reference to the column part of the inner string.
    pub fn column(&self) -> &str {
        &self.0[self.get_colon_index() + 1..]
    }

    fn get_colon_index(&self) -> usize {
        self.0.find(':').unwrap()
    }
}

impl TryFrom<String> for Tag {
    type Error = &'static str;

    fn try_from(value: String) -> Result<Self, Self::Error> {
        Tag::new(value).map_err(|_| "string is not a valid tag (no colon)")
    }
}

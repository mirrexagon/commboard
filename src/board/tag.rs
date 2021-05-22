use serde::{Deserialize, Serialize};

#[derive(Debug, PartialEq, Eq, PartialOrd, Ord, Clone, Hash, Serialize, Deserialize)]
pub struct Tag(String);

impl Tag {
    /// Creates a new `Tag` from a string, taking ownership of the string.
    /// Returns ownership of the string if it does not contain a `:`.
    pub fn new<S: Into<String>>(tag: S) -> Result<Self, String> {
        let tag = tag.into();

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

    /// Returns a reference to the value part of the inner string.
    pub fn value(&self) -> &str {
        &self.0[self.get_colon_index() + 1..]
    }

    fn get_colon_index(&self) -> usize {
        self.0.find(':').unwrap()
    }
}

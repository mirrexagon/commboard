use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord, Clone)]
pub struct Tag {
    tag: String,
    colon_index: usize,
}

impl Tag {
    /// Returns ownership of the string if it does not contain a `:`.
    pub fn new<S: Into<String>>(tag: S) -> Result<Self, String> {
        let tag = tag.into();

        let colon_index = match tag.find(':') {
            Some(index) => index,
            None => return Err(tag),
        };

        Ok(Self { tag, colon_index })
    }

    pub fn tag(&self) -> &str {
        &self.tag[..]
    }

    pub fn category(&self) -> &str {
        &self.tag[..self.colon_index]
    }

    pub fn value(&self) -> &str {
        &self.tag[self.colon_index + 1..]
    }
}

#[derive(Debug, PartialEq, Eq, PartialOrd, Ord, Clone, Hash)]
pub struct Tag {
    tag: String,
    colon_index: usize,

    /// Position of the owning card within the column this tag represents.
    pub column_index: usize,
}

impl Tag {
    /// Creates a new `Tag` from a string, taking ownership of the string.
    /// Returns ownership of the string if it does not contain a `:`.
    pub fn new<S: Into<String>>(tag: S) -> Result<Self, String> {
        let tag = tag.into();

        let colon_index = match tag.find(':') {
            Some(index) => index,
            None => return Err(tag),
        };

        Ok(Self { tag, colon_index })
    }

    /// Returns a reference to the inner string.
    pub fn tag(&self) -> &str {
        &self.tag[..]
    }

    /// Returns a reference to the category part of the inner string.
    pub fn category(&self) -> &str {
        &self.tag[..self.colon_index]
    }

    /// Returns a reference to the value part of the inner string.
    pub fn value(&self) -> &str {
        &self.tag[self.colon_index + 1..]
    }
}

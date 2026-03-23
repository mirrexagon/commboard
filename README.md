# Commboard
A multi-dimensional Kanban board.

**Note:** This is a tool created for a specific personal use-case, and **the code is almost entirely LLM-written**. Use at your peril!

## Usage

### Prerequisites

Install [Deno](https://deno.com/).

### Running from source

If you have the repository cloned locally:

```bash
deno task start path/to/board.json
```

### Usage notes

- The board file will be created if it doesn't exist.
- The server starts on http://localhost:8080 - navigate there in a web browser to see the UI.
- There are example board files in the `example-boards/` directory to try out.

## Basics

A board is a collection of cards. A card is a block of Markdown text, with any number of tags.

Tags are of the form `category:value`, eg. `status:in-progress`. Any character up to the first `:` is treated as the category name, and the rest is the value. Both parts of the tag (category and value) are required.

Tags are always ordered alphabetically where displayed, ie. on cards in the category grouping list, and in the order of columns in a category view/grouping.

## Grouping

By default, all cards are displayed without any grouping.

Cards can be arranged grouped by a single category. This is like treating the category as a Kanban board and the values as columns. While grouping is active, any cards without the selected category are hidden.

Cards can have multiple tags with the same category and different values. This will make a card show in two different columns when cards are grouped by that category. They are the same card, so updates to one will be reflected in the other

# Commboard
A multi-dimensional Kanban board.

**Note:** This is a tool created for a specific personal use-case, and as a learning experience. The code is messy, and the program is buggy and non-intuitive to use. I only work on this when I feel like it, so I am not actively maintaining it (only as much as needed for my use-case).

## Building
1. In `ui/`, run `npm install`.
2. In the repo root, run `cargo build`.

## Usage
Run `commboard <name>.json`, where the JSON file is the boards file. If it doesn't exist, it will be created.

Every modification to the board will write this file, so you can exit the application at any point and everything will be saved.

## Basics
- A board is a collection of cards.
- A card is a block of Markdown text, with any number of tags.

Tags are of the form `category:value`, eg. `status:in-progress`. Any character up to the first `:` is treated as the category name, and the rest is the value. Both parts of the tag (category and value) are required.

Tags are always ordered alphabetically where displayed, ie. on cards in the category grouping list, and in the order of columns in a category view/grouping.

## Grouping
By default, all cards are displayed without any grouping.

Cards can be arranged grouped by a single category. This is like treating the category as a Kanban board and the values as columns. While grouping is active, any cards without the selected category are hidden.

Cards can have multiple tags with the same category and different values. This will make a card show in two different columns when cards are grouped by that category. They are the same card, so updates to one will be reflected in the other.

## Feature status
### Done
- Cards
    - Add, delete
    - Move up and down in both default and category view
    - Tags
        - Add and remove
        - List displayed on card
- All cards in default order view
- Category view
    - Select category to view, or go back to default view

### Todo
- Body text
    - Render as Markdown
- Proper autocomplete
    - Tags when adding or removing
    - Categories when selecting for category view
- Tag colors based on category
- Fetch and render embeds for links in card bodies
- Better appearance
- Use external editor (configure via TOML config file) instead of web one
    - Requires server to notify UI when editing is done, so it can update state. Maybe rewrite to use bidirectional comms, eg. WebSockets
    - Server can also send smaller updates that way


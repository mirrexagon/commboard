# Commboard
Boards of category-tagged cards.


## TODO
- Remove babel-runtime which react-drag-listview needs for some reason
- Implement board mutation as a single `mutate()` function which takes an enum for the mutation action, and dispatches to the specific actions function. Single place to save JSON file, and possibly save undo history.
- Instead of card drag-drop within a column, have a box that says the current index in the column, and you can type +n to move down n, -n to move up n, or n to move the card to index n
- Stop `colon_index` from being serialized into the board file.
    - Write out file in "cards have tags, tags have index format", separate from internal representation


## Building
1. In `ui/`, run `npm install`.
2. In the repo root, run `cargo build`.


## Usage
Run `commboard <name>.json`, where the JSON file is the boards file. If it doesn't exist, it will be created.

Every modification to the boards will write this file. TODO: Is this okay for performance and disk health?


## Basics
A board is a collection of cards. Boards are completely separate from each other. Only one board can be viewed at a time.

A card is a block of text (TODO: Markdown rendering, including embedding images), with any number of tags.

Tags are of the form `category:value`, eg. `status:in-progress`. Any character up to the first `:` is treated as the category name, and the rest is the value. Both parts of the tag (category and value) are required.

Tags are always ordered alphabetically where displayed, ie. on cards and in the category grouping list.

TODO: Tags have colors that are based on category. Initial color is generated from category name, but can be changed. Color is shown on tags on cards, and next to categories in the sidebar.


## Filtering
You can filter cards by substring match on body text and tags. TODO: Implement


## Grouping
By default, all cards are displayed without any grouping.

Cards can be arranged grouped by a single category. This is like treating the category as a Kanban board and the values as columns. While grouping is active, any cards without the selected category are hidden.

Cards can have multiple tags with the same category and different values. This will make a card show in two different columns when cards are grouped by that category. They are the same card, so updates to one will be reflected in the other.

# Commboard
Boards of category-tagged cards.

## Building
1. In `ui/`, run `npm install`.
2. In the repo root, run `cargo build`.

## Usage
Run `commboard <name>.json`, where the JSON file is the boards file. If it doesn't exist, it will be created.

Every modification to the boards will write this file, so you can exit the application at any point and everything will be saved.

## Basics
A board is a collection of cards. Boards are completely separate from each other. Only one board can be viewed at a time.

A card is a block of Markdown text, with any number of tags.

Tags are of the form `category:value`, eg. `status:in-progress`. Any character up to the first `:` is treated as the category name, and the rest is the value. Both parts of the tag (category and value) are required.

Tags are always ordered alphabetically where displayed, ie. on cards and in the category grouping list.

## Filtering
You can filter cards by substring match on body text and tags.

## Grouping
By default, all cards are displayed without any grouping.

Cards can be arranged grouped by a single category. This is like treating the category as a Kanban board and the values as columns. While grouping is active, any cards without the selected category are hidden.

Cards can have multiple tags with the same category and different values. This will make a card show in two different columns when cards are grouped by that category. They are the same card, so updates to one will be reflected in the other.

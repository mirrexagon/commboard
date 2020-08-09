# Commboard
Boards of category-tagged cards.


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

TODO: Tags have colors that are based on category. Initial color is generated from category name, but can be changed?


## Filtering
By default, all cards are visible. Which cards are visible can be filtered using a query based on tags.

- `status`: Show only cards with at least one tag with the `status` category.
- `!status`: Show only cards that do not have any tags with the `status` category.
- `status:done`: Show only cards that have the exact tag `status:done`.
- `!status:done`: Show only cards that do not have the exact tag `status:done`.

These can be combined with `&&` and `||`, and grouped with parentheses.

TODO: Also add text filtering


## Grouping
By default, all cards are displayed without any grouping.

Cards can be arranged grouped by a single category. This is like treating the category as a Kanban board and the values as columns.

While grouping is active:
- Any cards without the selected category are hidden.
- Cards can be dragged between columns.

Cards can have multiple tags with the same category and different values. This will make a card show in two different columns when cards are grouped by that category. They are the same card, so updates to one will be reflected in the other.

However, dragging an instance of a multiply-columned card to a differen column will only modify the tag corresponding to the column it was dragged from. A multiply-columned card instance cannot be dragged into a column that another instance is occupying.

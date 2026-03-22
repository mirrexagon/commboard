# Commboard

A multi-dimensional Kanban board.

## User-facing design

### Basics

A board is a collection of cards. A card is a block of Markdown text, with any number of tags.

Tags are of the form `category:value`, eg. `status:in-progress`. Any character up to the first `:` is treated as the category name, and the rest is the value. Both parts of the tag (category and value) are required.

Tags are always ordered alphabetically where displayed, ie. on cards in the category grouping list, and in the order of columns in a category view/grouping.

### Grouping

By default, all cards are displayed without any grouping, effectively in one long list (but displayed wrapped so it's not just a big vertical line of cards).

The view can be changed to show cards grouped by a single category. This is like treating the category as a Kanban board and the values as columns. While grouping is active, any cards without the selected category are hidden.

Cards can have multiple tags with the same category and different values. This will make a card show in two different columns when cards are grouped by that category. They are the same card, so updates to one will be reflected in the other.

### Usage

Run `commboard <path to board file>` or equivalent. If the board file doesn't exist, it will be created.

The UI will be displayed or served. Changes to the board are saved automatically to the specified board file.

The user can exit the program at any time with Ctrl-C in the terminal and all changes will be saved.

## Open questions

- Is it sufficient to have a single total ordering for all cards, and moving the card in any view moves it in the total ordering? Or would I like to be able to have different orders in different category views?
    - Initially, just do a single total ordering and see how it goes.

## File format

In a previous incarnation, Commboard wrote JSON files that looked like this:

```json
{
    "name": "Ideas",
    "cards": {
        "1": {
            "id": 1,
            "text": "# Clothing idea\n\nSome words about the idea.",
            "tags": [
                "idea:clothing"
            ]
        },
        "2": {
            "id": 2,
            "text": "# The types of cheese\n\nHere is a good link: https://en.wikipedia.org/wiki/Cheese",
            "tags": [
                "legacy:reference"
            ]
        },
    },
    "next_card_id": 3,
    "card_order": [ 2, 1 ]

}
```

## Feature tracking

- [x] Application that can be run and creates or opens a board file

- [x] Default global order view

- Cards
    - [x] Add, delete cards
    - Body text
        - [x] Edit
        - [x] Render body text as Markdown
        - [x] Fetch and render embeds for links inline in card bodies
    - [x] Move card up and down in both default and category view (drag-and-drop in global order)

- Tags
    - [x] Add and remove
        - [x] Autocomplete existing tags
    - [x] Displayed on card
    - [x] Tag colors based on category - autogenerate based on the category text


- [x] Category view
- [x] Select category to view, or go back to default view
    - [x] Autocomplete categories when selecting for category view
- [x] Change the value (probably by removing and adding tags) of a card's tag of the shown category by dragging it to another column. If a card has multiple tags with the same category, remove the tag corresponding to the source column and add the one corresponding to the destination column, and don't allow dragging a card to a column for a tag it already has.

- [x] Search/filter - search box to filter displayed cards on tag or body content text

- Embedded files
    - [x] Add embedded files in virtual filesystem global to the board served by main executable webserver alongside UI, linked by relative path with Markdown - saved as base64 like fetched embed images
        - Directories don't need to really exist, just save full path of files including slashes in a top level list - files should just be referenced by full path
    - [x] File browser for all embedded files, allowing uploading, deleting, renaming files - should have link to direct file URL from the server
        - Renames should just be for editing the entire full file path, slashes included - one operation for renames and logically moving files
        - [x] Renames update all references to the file in cards
        - [x] Drag a file from the browser into a card being edited to put a link to it at the text cursor
    - [x] Show linked files inline
        - show any embedded file linked as a embed card that has some indication it is an embedded file than a fetched embed
        - Images as images, audio as an audio player, other files as just a card with the path listed
        - Images linked with `![]()` should just show inline without an embed card, images and anything else linked by `[]()` should be in an embed card
        - Update fetched embeds to have a little subtle "Embed" text and file ones can have "File"
        - This logic should also apply to links directly to files outside the embedded filesystem, eg. embedded links
    - [x] Paste images and possibly other files that can be put into a clipboard into a card to add them as embedded files

- [ ] Use external editor (configure via config file) instead of web one
    - Requires server to notify UI when editing is done, so it can update state


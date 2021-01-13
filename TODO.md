# TODO
- Remove babel-runtime which react-drag-listview needs for some reason
- Implement board mutation as a single `mutate()` function which takes an enum for the mutation action, and dispatches to the specific actions function. Single place to save JSON file, and possibly save undo history.
- Instead of card drag-drop within a column, have a box that says the current index in the column, and you can type +n to move down n, -n to move up n, or n to move the card to index n
- Stop `colon_index` from being serialized into the board file.
    - Write out file in "cards have tags, tags have index format", separate from internal representation
- Guard every mutation call on its preconditions, so it can be rejected before it changes anything

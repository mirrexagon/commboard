# TODO
- Remove babel-runtime which react-drag-listview needs for some reason
- Implement board mutation as a single `mutate()` function which takes an enum for the mutation action, and dispatches to the specific actions function. Single place to save JSON file, and possibly save undo history.
- Stop `colon_index` from being serialized into the board file.
    - Write out file in "cards have tags, tags have index format", separate from internal representation
- Guard every mutation call on its preconditions, so it can be rejected before it changes anything
- Card text Markdown rendering, including embedding images
    - Try https://github.com/remarkjs/react-markdown to render Markdown.
    - Store files (eg. images), that the UI can request from a certain subdirectory in the URL path, so it can display images based on Markdown image tags. UI shows other kinds of files as just the link to download.
    - Store files as base64 strings in JSON?
- Make it so tags have colors that are based on category. Initial color is generated from category name, but can be changed. Color is shown on tags on cards, and next to categories in the sidebar.
- Try https://github.com/contiamo/restful-react for API calls
- Own inline input based on https://dev.to/joelmturner/build-an-inline-edit-text-input-with-react-hooks-4nah

## Vim keys/keyboard workflow
hjkl to move which card is selected, shift-hjkl to move current card

Enter to edit card, Esc to go back


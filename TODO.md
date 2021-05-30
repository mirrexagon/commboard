"Client defines the interface" - rewrite the UI, try out ideas, figure out good JSON representation that the UI would like to consume.

# TODO
- Card text Markdown rendering, including embedding images
    - Try https://github.com/remarkjs/react-markdown to render Markdown.
    - Store files (eg. images), that the UI can request from a certain subdirectory in the URL path, so it can display images based on Markdown image tags. UI shows other kinds of files as just the link to download.
    - Store files as base64 strings in JSON?
- Make it so tags have colors that are based on category. Initial color is generated from category name, but can be changed. Color is shown on tags on cards, and next to categories in the sidebar.

## Vim keys/keyboard workflow
- hjkl to move which card is selected, shift-hjkl to move current card
- Enter to view card, Esc to go back
    - Enter again to edit text, Esc to go back
- t to add tag to selected card - how to delete/edit existing tags?


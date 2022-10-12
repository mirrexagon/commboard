export type CardId = number;
export type Tag = string; // A string like "category:value".
export type CategoryName = string; // The "category" part of a tag.

export interface AppState {
    board_name: string;
    cards: Cards;
    card_order: CardId[];
    categories: CategoryName[];
    tags: Tag[];
    interaction_state: InteractionState;
    current_category_view: null | CategoryView;
}

export interface Cards {
    [card_id: CardId]: Card;
}

export interface CategoryView {
    [tag: Tag]: CardId[];
}

export interface Card {
    id: CardId;
    text: string;
    tags: Tag[];
}

export interface InteractionState {
    selection: CardSelection;
    filter: string;
}

export interface CardSelection {
    card_id: null | CardId;
    tag: null | Tag;
}

export interface Action {
    type:
        | "Save"
        | "SetBoardName"
        | "NewCard"
        | "DeleteCurrentCard"
        | "SelectCardVerticalOffset"
        | "SelectCardHorizontalOffset"
        | "MoveCurrentCardVerticalOffset"
        | "MoveCurrentCardHorizontalInCategory"
        | "SetCurrentCardText"
        | "AddTagToCurrentCard"
        | "DeleteTagFromCurrentCard"
        | "ViewDefault"
        | "ViewCategory";

    name?: string;
    offset?: number;
    text?: string;
    tag?: Tag;
    category?: CategoryName;
}

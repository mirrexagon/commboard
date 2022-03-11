export interface AppState {
    board_name: string;
    cards: Card[];
    card_order: number[];
    categories: string[];
    tags: string[];
    interaction_state: InteractionState;
}

export interface Card {
    id: number;
    text: string;
    tags: string[];
}

export interface InteractionState {
    selection: CardSelection;
    filter: string;
}

export interface CardSelection {
    card_id: null | number;
    tag: null | string;
}

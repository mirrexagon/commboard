import type { Component } from "solid-js";

import "./BoardViewDefault.module.css";

import * as API from "../ApiTypes";

import CardColumn from "./CardColumn";

interface BoardViewDefaultProps {
    cards: API.Cards;
    cardOrder: API.CardId[];
    selectedCardId: API.CardId;
}

const BoardViewDefault: Component<BoardViewDefaultProps> = (props) => {
    const cards = props.cardOrder.map((cardId) => props.cards[cardId]);

    return <CardColumn cards={cards} selectedCardId={props.selectedCardId} />;
};

export default BoardViewDefault;

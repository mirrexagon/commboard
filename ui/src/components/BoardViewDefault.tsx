import type { Component } from "solid-js";
import type { PerformActionFunction } from "../App";

import "./BoardViewDefault.module.css";

import * as API from "../ApiTypes";

import CardColumn from "./CardColumn";

interface BoardViewDefaultProps {
    cards: API.Cards;
    cardOrder: API.CardId[];
    selectedCardId: API.CardId;
    performAction: PerformActionFunction;
}

const BoardViewDefault: Component<BoardViewDefaultProps> = (props) => {
    return (
        <CardColumn
            cards={props.cardOrder.map((cardId) => props.cards[cardId])}
            selectedCardId={props.selectedCardId}
            tag={null}
            performAction={props.performAction}
        />
    );
};

export default BoardViewDefault;

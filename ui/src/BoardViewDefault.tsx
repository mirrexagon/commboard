import React from "react";
import "./BoardViewDefault.css";

import CardColumn from "./CardColumn";

const BoardViewDefault = (props) => {
    const cards = props.cardOrder.map(
        (cardId) => props.cards[cardId]
    );

    return (
        <CardColumn
            cards={cards}
            selectedCardId={props.selectedCardId}
        />
    );
}

export default BoardViewDefault;

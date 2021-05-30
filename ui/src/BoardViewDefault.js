import React from "react";
import "./BoardViewDefault.css";

import CardColumn from "./CardColumn.js";

const BoardViewDefault = (props) => {
    const cards = props.cardOrder.map(
        (cardId) => props.cards[cardId]
    );

    console.log("Selected card: " + props.selectedCardId);

    return (
        <CardColumn
            cards={cards}
            selectedCardId={props.selectedCardId}
        />
    );
}

export default BoardViewDefault;

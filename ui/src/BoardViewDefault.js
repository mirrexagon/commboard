import React from "react";
import "./BoardViewDefault.css";

import CardColumn from "./CardColumn.js";

const BoardViewDefault = (props) => {
    const cards = props.defaultCardOrder.map(
        (cardId) => props.cards[cardId]
    );

    return (
        <CardColumn
            cards={cards}
        />
    );
}

export default BoardViewDefault;

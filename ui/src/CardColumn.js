import React from "react";
import "./CardColumn.css";

import Card from "./Card.js";

const CardColumn = () => {
    const cards = this.props.cards.map((card) => (
        <li className="card-column-item" key={card.id}>
            <Card
                id={card.id}
                text={card.text}
                tags={card.tags}
            />
        </li>
    ));

    return (
        <ul className="card-column">{cards}</ul>
    );
}

export default CardColumn;

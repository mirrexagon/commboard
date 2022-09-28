import React, { FC } from "react";
import "./CardColumn.css";

import * as API from "./ApiTypes";

import Card from "./Card";

interface CardColumnProps {
    cards: API.Card[];
    selectedCardId: API.CardId | null;
}

const CardColumn: FC<CardColumnProps> = (props) => {
    const cards = props.cards.map((card) => (
        <li className="card-column-item" key={card.id}>
            <Card
                id={card.id}
                text={card.text}
                tags={card.tags}
                selected={props.selectedCardId == card.id}
            />
        </li>
    ));

    return <ul className="card-column">{cards}</ul>;
};

export default CardColumn;

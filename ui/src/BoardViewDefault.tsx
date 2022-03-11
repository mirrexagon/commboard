import React, { FC } from "react";
import "./BoardViewDefault.css";

import * as API from "./ApiTypes";
import { UiMode, SetUiModeFunction, BindKeyFunction } from "./App";

import CardColumn from "./CardColumn";

interface BoardViewDefaultProps {
    cards: API.Cards;
    cardOrder: API.CardId[];
    selectedCardId: API.CardId;
}

const BoardViewDefault: FC<BoardViewDefaultProps> = (props) => {
    const cards = props.cardOrder.map((cardId) => props.cards[cardId]);

    return <CardColumn cards={cards} selectedCardId={props.selectedCardId} />;
};

export default BoardViewDefault;

import type { Component } from "solid-js";
import { For } from "solid-js";

import styles from "./CardColumn.module.css";

import * as API from "../ApiTypes";

import Card from "./Card";

interface CardColumnProps {
    cards: API.Card[];
    tag: null | API.Tag;
    selectedCardId: null | API.CardId;
    performAction: PerformActionFunction;
}

const CardColumn: Component<CardColumnProps> = (props) => {
    return (
        <ul class={styles.cardColumn}>
            <For each={props.cards}>
                {(card, i) => (
                    <li class={styles.cardColumnItem}>
                        <Card
                            id={card.id}
                            text={card.text}
                            tags={card.tags}
                            selected={props.selectedCardId == card.id}
                            onMouseDown={(e, cardId) => {
                                props.performAction({
                                    type: "SelectCard",
                                    selection: {
                                        card_id: cardId,
                                        tag: props.tag,
                                    },
                                });
                            }}
                        />
                    </li>
                )}
            </For>
        </ul>
    );
};

export default CardColumn;

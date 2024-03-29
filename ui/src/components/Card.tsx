import type { Component } from "solid-js";
import { createEffect, JSX } from "solid-js";

import styles from "./Card.module.css";

import * as API from "../ApiTypes";

import TagList from "./TagList";

interface TextProps {
    text: string;
}

const Text: Component<TextProps> = (props) => {
    return (
        <div class={styles.cardText}>
            <p>{props.text}</p>
        </div>
    );
};

interface CardProps {
    id: API.CardId;
    text: string;
    tags: API.Tag[];
    selected: boolean;
    onMouseDown?: (e: MouseEvent, cardId: API.CardId) => void;
}

const Card: Component<CardProps> = (props) => {
    // Scroll this card into view if it is selected.
    let ref: HTMLDivElement;

    createEffect(() => {
        if (props.selected) {
            ref?.scrollIntoView({ block: "nearest" });
        }
    });

    return (
        <div
            ref={ref}
            classList={{
                [styles.cardContainer]: true,
                [styles.cardContainerSelected]: props.selected,
            }}
            onMouseDown={(e) =>
                props.onMouseDown && props.onMouseDown(e, props.id)
            }
        >
            <p>{props.id}</p>

            <Text text={props.text} />
            <TagList tags={props.tags} />
        </div>
    );
};

export default Card;

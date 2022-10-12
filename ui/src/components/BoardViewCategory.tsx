import type { Component } from "solid-js";
import { For } from "solid-js";

import styles from "./BoardViewCategory.module.css";

import * as API from "../ApiTypes";

import CardColumn from "./CardColumn";

interface CategoryColumnProps {
    name: API.CategoryName;
    cards: API.Card[];
    selectedCardId: API.CardId | null;
}

const CategoryColumn: Component<CategoryColumnProps> = (props) => {
    return (
        <div>
            <h2>{props.name}</h2>
            <CardColumn
                cards={props.cards}
                selectedCardId={props.selectedCardId}
            />
        </div>
    );
};

interface BoardViewCategoryProps {
    cards: API.Cards;
    categoryView: API.CategoryView;
    selectedCardId: API.CardId;
    selectedTag: API.Tag;
}

const BoardViewCategory: Component<BoardViewCategoryProps> = (props) => {
    const [selectedCategoryName, selectedColumnName] =
        props.selectedTag.split(":");

    // In alphabetical order for consistency.
    const columnNames = Object.keys(props.categoryView);
    columnNames.sort();

    return (
        <ul class={styles.categoryView}>
            <For each={columnNames}>
                {(columnName, i) => {
                    const column = props.categoryView[columnName];
                    const cards = column.map((cardId) => props.cards[cardId]);

                    return (
                        <li class={styles.categoryViewColumn}>
                            <CategoryColumn
                                name={columnName}
                                cards={cards}
                                selectedCardId={
                                    columnName == selectedColumnName
                                        ? props.selectedCardId
                                        : null
                                }
                            />
                        </li>
                    );
                }}
            </For>
        </ul>
    );
};

export default BoardViewCategory;

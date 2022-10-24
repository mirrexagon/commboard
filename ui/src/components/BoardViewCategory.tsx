import type { Component } from "solid-js";
import { For } from "solid-js";

import styles from "./BoardViewCategory.module.css";

import type * as API from "../ApiTypes";
import type { PerformActionFunction } from "../App";

import CardColumn from "./CardColumn";

interface CategoryColumnProps {
    name: API.CategoryName;
    tag: API.Tag;
    cards: API.Card[];
    selectedCardId: API.CardId | null;
    performAction: PerformActionFunction;
}

const CategoryColumn: Component<CategoryColumnProps> = (props) => {
    return (
        <>
            <h2>{props.name}</h2>
            <CardColumn
                cards={props.cards}
                selectedCardId={props.selectedCardId}
                tag={props.tag}
                performAction={props.performAction}
            />
        </>
    );
};

interface BoardViewCategoryProps {
    cards: API.Cards;
    categoryView: API.CategoryView;
    selectedCardId: API.CardId;
    selectedTag: API.Tag;
    performAction: PerformActionFunction;
}

const BoardViewCategory: Component<BoardViewCategoryProps> = (props) => {
    const selectedCategoryName = () => props.selectedTag.split(":")[0];
    const selectedColumnName = () => props.selectedTag.split(":")[1];

    // In alphabetical order for consistency.
    const columnNames = () => {
        let columnNames = Object.keys(props.categoryView);
        columnNames.sort();
        return columnNames;
    };

    return (
        <ul>
            <For each={columnNames()}>
                {(columnName, i) => {
                    const column = props.categoryView[columnName];
                    const cards = column.map((cardId) => props.cards[cardId]);

                    return (
                        <li class={styles.categoryViewColumn}>
                            <CategoryColumn
                                name={columnName}
                                tag={`${selectedCategoryName()}:${columnName}`}
                                cards={cards}
                                selectedCardId={
                                    columnName == selectedColumnName()
                                        ? props.selectedCardId
                                        : null
                                }
                                performAction={props.performAction}
                            />
                        </li>
                    );
                }}
            </For>
        </ul>
    );
};

export default BoardViewCategory;

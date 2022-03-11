import React, { FC } from "react";
import "./BoardViewCategory.css";

import * as API from "./ApiTypes";
import { UiMode, SetUiModeFunction, BindKeyFunction } from "./App";

import CardColumn from "./CardColumn";

interface CategoryColumnProps {
    name: API.CategoryName;
    cards: API.Card[];
    selectedCardId: API.CardId | null;
}

const CategoryColumn: FC<CategoryColumnProps> = (props) => {
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

const BoardViewCategory: FC<BoardViewCategoryProps> = (props) => {
    const [selectedCategoryName, selectedColumnName] =
        props.selectedTag.split(":");

    // In alphabetical order for consistency.
    const columnNames = Object.keys(props.categoryView);
    columnNames.sort();

    const columns = columnNames.map((columnName) => {
        const column = props.categoryView[columnName];

        const cards = column.map((cardId) => props.cards[cardId]);

        return (
            <li
                className="category-view-column"
                key={selectedCategoryName + ":" + columnName}
            >
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
    });

    return <ul className="category-view">{columns}</ul>;
};

export default BoardViewCategory;

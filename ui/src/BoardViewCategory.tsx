import React from "react";
import "./BoardViewCategory.css";

import CardColumn from "./CardColumn";

const CategoryColumn = (props) => {
    return (
        <div>
            <h2>{props.name}</h2>
            <CardColumn
                cards={props.cards}
                selectedCardId={props.selectedCardId}
            />
        </div>
    );
}

const BoardViewCategory = (props) => {
    const [selectedCategoryName, selectedColumnName] = props.selectedTag.split(":");

    // In alphabetical order for consistency.
    let columnNames = Object.keys(props.categoryView);
    columnNames.sort();

    const columns = columnNames.map(
        (columnName) => {
            const column = props.categoryView[columnName];

            const cards = column.map(
                (cardId) => props.cards[cardId]
            );

            return (
                <li
                    className="category-view-column"
                    key={selectedCategoryName + ":" + columnName}
                >
                    <CategoryColumn
                        name={columnName}
                        tag={`${selectedCategoryName}:${columnName}`}
                        cards={cards}
                        selectedCardId={columnName == selectedColumnName ? props.selectedCardId : null}
                    />
                </li>
            );
        }
    );

    return (
        <ul className="category-view">{columns}</ul>
    );
}

export default BoardViewCategory;

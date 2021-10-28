import React from "react";
import "./Board.css";

import BoardViewDefault from "./BoardViewDefault.js";
import BoardViewCategory from "./BoardViewCategory.js";
import CardFull from "./CardFull.js";

const BoardPanel = (props) => {
    const categories = props.categories.map((categoryName) => <li key={categoryName}>{categoryName}</li>);

    return (
        <div className="board-panel">
            <h1>
                {props.boardName}
            </h1>

            <h2>UI mode</h2>
            <p>
                {props.uiMode}
            </p>

            <h2>Categories</h2>
            <ul>
                {categories}
            </ul>
        </div>
    );
};

const Board = (props) => {
    const boardView = props.appState.current_category_view
    ? (
        <BoardViewCategory
            cards={props.appState.cards}
            selectedCardId={props.appState.interaction_state.selection.card_id}
            selectedTag={props.appState.interaction_state.selection.tag}
            categoryView={props.appState.current_category_view}
        />
    )
    : (
        <BoardViewDefault
            cards={props.appState.cards}
            cardOrder={props.appState.card_order}
            selectedCardId={props.appState.interaction_state.selection.card_id}
        />
    );

    const cardFull = props.uiMode == "ViewCard"
        ? (
            <CardFull
                card={props.appState.cards[props.appState.interaction_state.selection.card_id]}
            />
        ) : null;

    return (
        <div>
            <BoardPanel
                boardName={props.appState.board_name}
                categories={props.appState.categories}
                uiMode={props.uiMode}
            />

            <div className="board-view-container">{boardView}</div>

            {cardFull}
        </div>
    );
};

export default Board;

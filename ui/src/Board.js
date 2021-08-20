import React from "react";
import "./Board.css";

import BoardViewDefault from "./BoardViewDefault.js";
import BoardViewCategory from "./BoardViewCategory.js";

const BoardPanel = (props) => {
    const categories = props.categories.map((categoryName) => <li key={categoryName}>{categoryName}</li>);

    return (
        <div className="board-panel">
            <h1>
                {props.boardName}
            </h1>

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

    return (
        <div>
            <BoardPanel
                boardName={props.appState.board_name}
                categories={props.appState.categories}
            />

            <div className="board-view-container">{boardView}</div>
        </div>
    );
};

export default Board;

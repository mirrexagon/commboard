import React from "react";
import "./Board.css";

import BoardViewDefault from "./BoardViewDefault.js";
// import BoardViewCategory from "./BoardViewCategory.js";

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
    const boardView = (
        <BoardViewDefault
            cards={props.appState.cards}
            cardOrder={props.appState.default_card_order}
            selectedCardId={props.appState.interaction_state.view.selected_card_id}
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

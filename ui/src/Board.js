import React from "react";
import "./Board.css";

import BoardViewDefault from "./BoardViewDefault.js";
// import BoardViewCategory from "./BoardViewCategory.js";

const BoardPanel = (props) => {
    return (
        <div className="board-panel">
            <h1>
                props.boardName
            </h1>
        </div>
    );
};

const Board = (props) => {
    const boardView = (
        <BoardViewDefault
            cards={props.appState.cards}
            defaultCardOrder={props.appState.default_card_order}
        />
    );

    return (
        <div>
            <BoardPanel
                boardName={props.appState.boardName}
            />

            <div className="board-view-container">{boardView}</div>
        </div>
    );
};

export default Board;

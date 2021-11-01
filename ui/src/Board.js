import React, { useState, useEffect, useRef } from "react";
import "./Board.css";

import BoardViewDefault from "./BoardViewDefault.js";
import BoardViewCategory from "./BoardViewCategory.js";
import CardFull from "./CardFull.js";
import Selector from "./Selector.js";

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

    const showCardFull = props.uiMode == "ViewCard"
      || props.uiMode == "EditCardText"
      || props.uiMode == "AddTagFromViewCard"
      || props.uiMode == "DeleteTagFromViewCard";

    const cardFull = showCardFull
        ? (
            <CardFull
                card={props.appState.cards[props.appState.interaction_state.selection.card_id]}
                allTags={props.appState.tags}
                uiMode={props.uiMode}
                bindKey={props.bindKey}
                setUiMode={props.setUiMode}
            />
        ) : null;

    props.bindKey(["ViewBoard", "ViewCard"], "j", () => ({
        "type": "SelectCardVerticalOffset",
        "offset": 1,
    }));

    props.bindKey(["ViewBoard", "ViewCard"], "k", () => ({
        "type": "SelectCardVerticalOffset",
        "offset": -1,
    }));

    props.bindKey(["ViewBoard", "ViewCard"], "J", (appState, uiMode, e) => {
        e.preventDefault();
        return {
            "type": "MoveCurrentCardVerticalOffset",
            "offset": 1,
        };
    });

    props.bindKey(["ViewBoard", "ViewCard"], "K", (appState, uiMode, e) => {
        e.preventDefault();
        return {
            "type": "MoveCurrentCardVerticalOffset",
            "offset": -1,
        };
    });

    props.bindKey(["ViewBoard", "ViewCard"], "h", () => ({
        "type": "SelectCardHorizontalOffset",
        "offset": -1,
    }));

    props.bindKey(["ViewBoard", "ViewCard"], "l", () => ({
        "type": "SelectCardHorizontalOffset",
        "offset": 1,
    }));

    props.bindKey(["ViewBoard"], "a", () => ({
        "type": "NewCard",
    }));

    props.bindKey(["ViewBoard"], "d", (appState, uiMode, e) => {
        if (e.ctrlKey) {
            e.preventDefault();
            return {
                "type": "SelectCardVerticalOffset",
                "offset": 5,
            };
        } else {
            return {
                "type": "DeleteCurrentCard",
            };
        }
    });

    props.bindKey(["ViewBoard"], "u", (appState, uiMode, e) => {
        if (e.ctrlKey) {
            e.preventDefault();
            return {
                "type": "SelectCardVerticalOffset",
                "offset": -5,
            };
        }
    });

    props.bindKey(["ViewBoard"], "Enter", (appState, uiMode) => {
        if (appState.interaction_state.selection.card_id != null) {
            props.setUiMode("ViewCard");
        }
    });

    props.bindKey(["ViewCard"], "Escape", (appState, uiMode) => {
        props.setUiMode("ViewBoard");
    });

    const isSelectingCategory = props.uiMode == "SelectCategory";
    const [categorySelectText, setCategorySelectText] = useState("");
    const categorySelectorElement = useRef(null);

    props.bindKey(["ViewBoard"], "c", (appState, uiMode, e) => {
        setCategorySelectText("");

        // Prevent from entering newline in the input we are about to focus.
        e.preventDefault();

        props.setUiMode("SelectCategory");
        categorySelectorElement.current.focus();
    });

    props.bindKey(["SelectCategory"], "Enter", (appState, uiMode, e) => {
        props.setUiMode("ViewBoard");

        return {
            "type": "ViewCategory",
            "category": categorySelectText,
        };
    });

    props.bindKey(["SelectCategory"], "Escape", (appState, uiMode, e) => {
        // Cancel selecting category.
        props.setUiMode("ViewCard");
    });

    // While viewing category, press Escape to go back to default view.
    props.bindKey(["ViewBoard"], "Escape", () => ({
        "type": "ViewDefault",
    }));

    return (
        <div>
            <BoardPanel
                boardName={props.appState.board_name}
                categories={props.appState.categories}
                uiMode={props.uiMode}
            />

            <div className="board-view-container">{boardView}</div>

            {cardFull}

            <Selector
                inputRef={categorySelectorElement}
                visible={isSelectingCategory}
                value={categorySelectText}
                suggestions={props.appState.categories}
                onChange={(e) => setCategorySelectText(e.target.value)}
                />
        </div>
    );
};

export default Board;

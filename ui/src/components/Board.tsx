import type { Component } from "solid-js";
import { Show, For, createSignal } from "solid-js";

import styles from "./Board.module.css";

import * as API from "../ApiTypes";
import { UiMode, SetUiModeFunction, BindKeyFunction } from "../App";

import BoardViewDefault from "./BoardViewDefault";
import BoardViewCategory from "./BoardViewCategory";
import CardFull from "./CardFull";
import Selector from "./Selector";

interface BoardPanelProps {
    boardName: string;
    categories: API.CategoryName[];
    uiMode: UiMode;
}

const BoardPanel: Component<BoardPanelProps> = (props) => {
    return (
        <div class={styles.boardPanel}>
            <h1>{props.boardName}</h1>

            <h2>UI mode</h2>
            <p>{props.uiMode}</p>

            <h2>Categories</h2>
            <ul>
                <For each={props.categories}>
                    {(categoryName, i) => <li>{categoryName}</li>}
                </For>
            </ul>
        </div>
    );
};

interface BoardProps {
    appState: API.AppState;
    uiMode: UiMode;
    setUiMode: SetUiModeFunction;
    bindKey: BindKeyFunction;
}

const Board: Component<BoardProps> = (props) => {
    const boardView = props.appState.current_category_view ? (
        <BoardViewCategory
            cards={props.appState.cards}
            selectedCardId={props.appState.interaction_state.selection.card_id!}
            selectedTag={props.appState.interaction_state.selection.tag!}
            categoryView={props.appState.current_category_view}
        />
    ) : (
        <BoardViewDefault
            cards={props.appState.cards}
            cardOrder={props.appState.card_order}
            selectedCardId={props.appState.interaction_state.selection.card_id!}
        />
    );

    props.bindKey(["ViewBoard"], ["w"], () => ({
        type: "Save",
    }));

    props.bindKey(["ViewBoard", "ViewCard"], ["j"], () => ({
        type: "SelectCardVerticalOffset",
        offset: 1,
    }));

    props.bindKey(["ViewBoard", "ViewCard"], ["k"], () => ({
        type: "SelectCardVerticalOffset",
        offset: -1,
    }));

    props.bindKey(
        ["ViewBoard", "ViewCard"],
        ["Shift", "j"],
        (appState, uiMode) => {
            let offset = 1;

            return {
                type: "MoveCurrentCardVerticalOffset",
                offset: offset,
            };
        }
    );

    props.bindKey(
        ["ViewBoard", "ViewCard"],
        ["Shift", "k"],
        (appState, uiMode) => {
            let offset = 1;

            return {
                type: "MoveCurrentCardVerticalOffset",
                offset: -offset,
            };
        }
    );

    props.bindKey(["ViewBoard", "ViewCard"], ["h"], (appState, uiMode) => {
        return {
            type: "SelectCardHorizontalOffset",
            offset: -1,
        };
    });

    props.bindKey(["ViewBoard", "ViewCard"], ["l"], (appState, uiMode) => {
        return {
            type: "SelectCardHorizontalOffset",
            offset: 1,
        };
    });

    props.bindKey(
        ["ViewBoard", "ViewCard"],
        ["Shift", "h"],
        (appState, uiMode) => {
            return {
                type: "MoveCurrentCardHorizontalInCategory",
                offset: -1,
            };
        }
    );

    props.bindKey(
        ["ViewBoard", "ViewCard"],
        ["Shift", "l"],
        (appState, uiMode) => {
            return {
                type: "MoveCurrentCardHorizontalInCategory",
                offset: 1,
            };
        }
    );

    props.bindKey(["ViewBoard"], ["a"], () => ({
        type: "NewCard",
    }));

    props.bindKey(["ViewBoard"], ["d"], (appState, uiMode) => {
        return {
            type: "DeleteCurrentCard",
        };
    });

    props.bindKey(["ViewBoard"], ["Enter"], (appState, uiMode) => {
        if (appState.interaction_state.selection.card_id != null) {
            props.setUiMode("ViewCard");
        }
    });

    props.bindKey(["ViewCard"], ["Escape"], (appState, uiMode) => {
        props.setUiMode("ViewBoard");
    });

    const isSelectingCategory = props.uiMode == "SelectCategory";
    const [categorySelectText, setCategorySelectText] = createSignal("");
    let categorySelectorElement: HTMLInputElement;

    props.bindKey(["ViewBoard"], ["c"], (appState, uiMode) => {
        setCategorySelectText("");

        props.setUiMode("SelectCategory");
        categorySelectorElement?.focus();
    });

    props.bindKey(["SelectCategory"], ["Enter"], (appState, uiMode) => {
        props.setUiMode("ViewBoard");

        return {
            type: "ViewCategory",
            category: categorySelectText(),
        };
    });

    props.bindKey(["SelectCategory"], ["Escape"], (appState, uiMode) => {
        // Cancel selecting category.
        props.setUiMode("ViewBoard");
    });

    // While viewing category, press Escape to go back to default view.
    props.bindKey(["ViewBoard"], ["Escape"], () => ({
        type: "ViewDefault",
    }));

    return (
        <div>
            <BoardPanel
                boardName={props.appState.board_name}
                categories={props.appState.categories}
                uiMode={props.uiMode}
            />

            <div class={styles.boardViewContainer}>{boardView}</div>

            <Show
                when={
                    props.appState.interaction_state.selection.card_id &&
                    (props.uiMode == "ViewCard" ||
                        props.uiMode == "EditCardText" ||
                        props.uiMode == "AddTagFromViewCard" ||
                        props.uiMode == "DeleteTagFromViewCard")
                }
            >
                <CardFull
                    card={
                        props.appState.cards[
                            props.appState.interaction_state.selection.card_id!
                        ]
                    }
                    allTags={props.appState.tags}
                    uiMode={props.uiMode}
                    bindKey={props.bindKey}
                    setUiMode={props.setUiMode}
                />
            </Show>

            <Selector
                inputRef={categorySelectorElement}
                visible={isSelectingCategory}
                value={categorySelectText()}
                suggestions={props.appState.categories}
                onInput={(e) => setCategorySelectText(e.currentTarget.value)}
            />
        </div>
    );
};

export default Board;

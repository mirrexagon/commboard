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
    props.bindKey(["ViewBoard"], ["w"], () => ({
        type: "Save",
    }));

    props.bindKey(
        ["ViewBoard", "ViewCard"],
        ["j"],
        (appState, uiMode, preventDefault) => {
            return {
                type: "SelectCardVerticalOffset",
                offset: 1,
            };
        }
    );

    props.bindKey(
        ["ViewBoard", "ViewCard"],
        ["k"],
        (appState, uiMode, preventDefault) => {
            return {
                type: "SelectCardVerticalOffset",
                offset: -1,
            };
        }
    );

    props.bindKey(
        ["ViewBoard", "ViewCard"],
        ["Shift", "j"],
        (appState, uiMode, preventDefault) => {
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
        (appState, uiMode, preventDefault) => {
            let offset = 1;

            return {
                type: "MoveCurrentCardVerticalOffset",
                offset: -offset,
            };
        }
    );

    props.bindKey(
        ["ViewBoard", "ViewCard"],
        ["h"],
        (appState, uiMode, preventDefault) => {
            return {
                type: "SelectCardHorizontalOffset",
                offset: -1,
            };
        }
    );

    props.bindKey(
        ["ViewBoard", "ViewCard"],
        ["l"],
        (appState, uiMode, preventDefault) => {
            return {
                type: "SelectCardHorizontalOffset",
                offset: 1,
            };
        }
    );

    props.bindKey(
        ["ViewBoard", "ViewCard"],
        ["Shift", "h"],
        (appState, uiMode, preventDefault) => {
            return {
                type: "MoveCurrentCardHorizontalInCategory",
                offset: -1,
            };
        }
    );

    props.bindKey(
        ["ViewBoard", "ViewCard"],
        ["Shift", "l"],
        (appState, uiMode, preventDefault) => {
            return {
                type: "MoveCurrentCardHorizontalInCategory",
                offset: 1,
            };
        }
    );

    props.bindKey(["ViewBoard"], ["a"], () => ({
        type: "NewCard",
    }));

    props.bindKey(["ViewBoard"], ["d"], (appState, uiMode, preventDefault) => {
        return {
            type: "DeleteCurrentCard",
        };
    });

    props.bindKey(
        ["ViewBoard"],
        ["Enter"],
        (appState, uiMode, preventDefault) => {
            if (appState.interaction_state.selection.card_id != null) {
                props.setUiMode("ViewCard");
            }
        }
    );

    props.bindKey(
        ["ViewCard"],
        ["Escape"],
        (appState, uiMode, preventDefault) => {
            props.setUiMode("ViewBoard");
        }
    );

    const [categorySelectText, setCategorySelectText] = createSignal("");
    let categorySelectorElement: HTMLInputElement;

    props.bindKey(["ViewBoard"], ["c"], (appState, uiMode, preventDefault) => {
        // Prevent from entering newline in the input we are about to focus.
        preventDefault();

        setCategorySelectText("");
        props.setUiMode("SelectCategory");
    });

    props.bindKey(
        ["SelectCategory"],
        ["Enter"],
        (appState, uiMode, preventDefault) => {
            props.setUiMode("ViewBoard");

            return {
                type: "ViewCategory",
                category: categorySelectText(),
            };
        }
    );

    props.bindKey(
        ["SelectCategory"],
        ["Escape"],
        (appState, uiMode, preventDefault) => {
            // Cancel selecting category.
            props.setUiMode("ViewBoard");
        }
    );

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
            <div class={styles.boardViewContainer}>
                <Show
                    when={props.appState.current_category_view != null}
                    fallback={
                        <BoardViewDefault
                            cards={props.appState.cards}
                            cardOrder={props.appState.card_order}
                            selectedCardId={
                                props.appState.interaction_state.selection
                                    .card_id!
                            }
                        />
                    }
                >
                    <BoardViewCategory
                        cards={props.appState.cards}
                        selectedCardId={
                            props.appState.interaction_state.selection.card_id!
                        }
                        selectedTag={
                            props.appState.interaction_state.selection.tag!
                        }
                        categoryView={props.appState.current_category_view!}
                    />
                </Show>
            </div>
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
                ref={categorySelectorElement}
                visible={props.uiMode == "SelectCategory"}
                value={categorySelectText()}
                suggestions={props.appState.categories}
                onInput={(e) => setCategorySelectText(e.currentTarget.value)}
            />
        </div>
    );
};

export default Board;

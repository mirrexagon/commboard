import React, { useState, useEffect, useCallback } from "react";

import { useGet, useMutate } from "restful-react";

import Board from "./Board.js";

const App = () => {
    // -- Getting app state --
    const base = "/api";

    const { data: appState, refetch: refetchAppState } = useGet({
        path: "/state",
        base
    });

    // -- UI mode --
    // ViewBoard
    //   SelectCategory
    //   AddTagFromViewBoard
    //   DeleteTagFromViewBoard
    // ViewCard
    //   EditCardText
    //   AddTagFromViewCard
    //   DeleteTagFromViewCard
    const [uiMode, setUiMode] = useState("ViewBoard");

    // -- Manipulating app state --
    const { mutate: performActionBase } = useMutate({
        verb: "POST",
        path: "/action",
        base
    });

    const performAction = (action) => performActionBase(action).then(() => refetchAppState());

    // -- Key bindings --
    const bindKey = (modes, key, action) => {
        let keyPressed = false;

        const onKeyDown = useCallback((e) => {
            if (!keyPressed && e.key == key) {
                keyPressed = true;

                for (let mode of modes) {
                    if (uiMode == mode) {
                        const boardAction = action(appState, uiMode);
                        if (boardAction) {
                            performAction(boardAction);
                        }
                        return;
                    }
                }
            }
        }, [appState, uiMode, action]);

        const onKeyUp = useCallback((e) => {
            if (e.key == key) {
                keyPressed = false;
            }
        }, [appState, uiMode, action]);

        useEffect(() => {
            window.addEventListener("keydown", onKeyDown);
            window.addEventListener("keyup", onKeyUp);

            return () => {
                window.removeEventListener("keydown", onKeyDown);
                window.removeEventListener("keyup", onKeyUp);
            };
        }, [onKeyDown, onKeyUp]);
    };

    bindKey(["ViewBoard", "ViewCard"], "j", () => ({
        "type": "SelectCardBelow",
    }));

    bindKey(["ViewBoard", "ViewCard"], "k", () => ({
        "type": "SelectCardAbove",
    }));

    bindKey(["ViewBoard"], "a", () => ({
        "type": "NewCard",
    }));

    bindKey(["ViewBoard"], "d", () => ({
        "type": "DeleteCurrentCard",
    }));

    bindKey(["ViewBoard"], "Enter", (appState, uiMode) => {
        if (appState.interaction_state.selection.card_id != null) {
            setUiMode("ViewCard");
        }
    });

    bindKey(["ViewCard"], "Escape", (appState, uiMode) => {
        setUiMode("ViewBoard");
    });

    bindKey(["ViewBoard"], "t", () => ({
        "type": "AddTagToCurrentCard",
        "tag": "fruit:apple",
    }));

    bindKey(["ViewBoard"], "r", () => ({
        "type": "DeleteTagFromCurrentCard",
        "tag": "fruit:apple",
    }));

    bindKey(["ViewBoard"], "v", () => ({
        "type": "ViewDefault",
    }));

    bindKey(["ViewBoard"], "c", () => ({
        "type": "ViewCategory",
        "category": "fruit",
    }));

    // -- Render --
    if (appState) {
        return (
            <div>
                <Board
                    appState={appState}
                    uiMode={uiMode}
                    bindKey={bindKey}
                    setUiMode={setUiMode}
                />
            </div>
        );
    } else {
        return <p>Waiting for state from server</p>;
    }
};

export default App;

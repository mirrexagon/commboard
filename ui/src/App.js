import React, { useState, useEffect, useCallback } from "react";

import { useGet, useMutate } from "restful-react";
import useKeyPress from "./useKeyPress.js";

import Board from "./Board.js";

const App = () => {
    // -- Getting app state --
    const base = "/api";

    const { data: appState, refetch: refetchAppState } = useGet({
        path: "/state",
        base
    });

    // -- UI mode --
    // board (normal board view) | card (viewing selected card) | edit (editing text of selected card)
    const [uiMode, setUiMode] = useState("board");

    // -- Manipulating app state --
    const { mutate: performActionBase } = useMutate({
        verb: "POST",
        path: "/action",
        base
    });

    const performAction = (action) => performActionBase(action).then(() => refetchAppState());

    // -- Key bindings --
    const bindKey = (mode, key, action) => {
        const onKeyDown = useCallback((e) => {
            if (uiMode == mode && e.key == key) {
                const boardAction = action();
                if (boardAction) {
                    performAction(boardAction);
                }
            }
        }, [uiMode]);

        useEffect(() => {
            window.addEventListener("keydown", onKeyDown);

            return () => {
                window.removeEventListener("keydown", onKeyDown);
            };
        }, [onKeyDown]);
    };

    bindKey("board", "m", () => {
        setUiMode("card");
    });

    bindKey("card", "m", () => {
        setUiMode("board");
    });

    bindKey("board", "a", () => ({
        "type": "NewCard",
    }));

    bindKey("board", "d", () => ({
        "type": "DeleteCurrentCard",
    }));

    bindKey("board", "j", () => ({
        "type": "SelectCardBelow",
    }));

    bindKey("board", "k", () => ({
        "type": "SelectCardAbove",
    }));

    bindKey("board", "t", () => ({
        "type": "AddTagToCurrentCard",
        "tag": "fruit:apple",
    }));

    bindKey("board", "r", () => ({
        "type": "DeleteTagFromCurrentCard",
        "tag": "fruit:apple",
    }));

    bindKey("board", "v", () => ({
        "type": "ViewDefault",
    }));

    bindKey("board", "c", () => ({
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
                />
            </div>
        );
    } else {
        return null;
    }
};

export default App;

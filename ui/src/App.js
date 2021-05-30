import React, { useState, useRef } from "react";

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

    // -- UI local state --
    // board (normal board view) | card (viewing selected card) | edit (editing text of selected card)
    const uiLocalState = useState("board");
    const uiLocalStateRef = useRef(uiLocalState);

    // -- Manipulating app state --
    const { mutate: performActionBase } = useMutate({
        verb: "POST",
        path: "/action",
        base
    });

    const performAction = (action) => performActionBase(action).then(() => refetchAppState());

    const bindKeyBoard = (key, action) => {
        useKeyPress(key, () => {
            if (uiLocalStateRef.current) {
                performAction(action);
            }
        });
    };

    bindKeyBoard("a", {
        "type": "NewCard",
    });

    bindKeyBoard("d", {
        "type": "DeleteCurrentCard",
    });

    bindKeyBoard("j", {
        "type": "SelectCardBelow",
    });

    bindKeyBoard("k", {
        "type": "SelectCardAbove",
    });

    bindKeyBoard("t", {
        "type": "AddTagToCurrentCard",
        "tag": "fruit:apple",
    });

    bindKeyBoard("r", {
        "type": "DeleteTagFromCurrentCard",
        "tag": "fruit:apple",
    });

    // -- Render --
    uiLocalStateRef.current = uiLocalState;

    if (appState) {
        return (
            <div>
                <Board
                    appState={appState}
                    uiLocalState={uiLocalState}
                />
            </div>
        );
    } else {
        return null;
    }
};

export default App;

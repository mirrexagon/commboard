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
    const isViewingCurrentCard = useRef(false);

    // -- Manipulating app state --
    const { mutate: performActionBase } = useMutate({
        verb: "POST",
        path: "/action",
        base
    });

    const performAction = (action) => performActionBase(action).then(() => refetchAppState());

    const bindKeyNormal = (key, action) => {
        useKeyPress(key, () => {
            if (!isViewingCurrentCard.current) {
                performAction(action);
            }
        });
    };

    bindKeyNormal("a", {
        "type": "NewCard",
    });

    bindKeyNormal("d", {
        "type": "DeleteCurrentCard",
    });

    bindKeyNormal("j", {
        "type": "SelectCardBelow",
    });

    bindKeyNormal("k", {
        "type": "SelectCardAbove",
    });

    // -- Render --
    if (appState) {
        return (
            <div>
                <Board
                    appState={appState}
                    isViewingCurrentCard={isViewingCurrentCard}
                />
            </div>
        );
    } else {
        return null;
    }
};

export default App;

import React, { useState } from "react";

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
    const [isViewingCurrentCard, setIsViewingCurrentCard] = useState(false);

    // -- Manipulating app state --
    const { mutate: performActionBase } = useMutate({
        verb: "POST",
        path: "/action",
        base
    });

    const performAction = (action) => performActionBase(action).then(() => refetchAppState());

    useKeyPress("a", () => {
        performAction({
            "type": "NewCard",
        });
    });

    useKeyPress("d", () => {
        performAction({
            "type": "DeleteCurrentCard",
        });
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

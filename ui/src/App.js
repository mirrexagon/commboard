import React from "react";

import { useGet, useMutate } from "restful-react";
import useKeyPress from "./useKeyPress.js";

import Board from "./Board.js";

const App = () => {
    const base = "/api";

    const { data: appState, refetch: refetchAppState } = useGet({
        path: "/state",
        base
    });

    // ---

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

    // ---

    if (appState) {
        return (
            <div>
                <Board
                    appState={appState}
                />
            </div>
        );
    } else {
        return "Loading...";
    }
};

export default App;

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

    const { mutate: mutateBoardBase } = useMutate({
        verb: "POST",
        path: "/mutate",
        base
    });

    const mutateBoard = (action) => mutateBoardBase(action).then(() => refetchAppState());

    useKeyPress("a", () => {
        mutateBoard({
            "type": "NewCard",
        });
    });

    useKeyPress("d", () => {
        mutateBoard({
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

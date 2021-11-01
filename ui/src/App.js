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
        const onKeyDown = useCallback((e) => {
            if (!e.repeat && e.key == key) {
                for (let mode of modes) {
                    if (uiMode == mode) {
                        const boardAction = action(appState, uiMode, e);
                        if (boardAction) {
                            performAction(boardAction);
                        }
                        return;
                    }
                }
            }
        }, [appState, uiMode, action]);

        useEffect(() => {
            window.addEventListener("keydown", onKeyDown);

            return () => {
                window.removeEventListener("keydown", onKeyDown);
            };
        }, [onKeyDown]);
    };

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

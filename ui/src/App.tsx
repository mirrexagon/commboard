import React, { FC, useState, useEffect, useCallback } from "react";
import { useGet, useMutate } from "restful-react";

import * as API from "./ApiTypes";
import Board from "./Board";

export type UiMode =
    | "ViewBoard"
    | "SelectCategory"
    | "ViewCard"
    | "EditCardText"
    | "AddTagFromViewCard"
    | "DeleteTagFromViewCard";

export type BindKeyFunction = (
    modes: UiMode[],
    key: string,
    action: (
        appState: API.AppState,
        uiMode: string,
        e: KeyboardEvent
    ) => void | API.Action
) => void;

export type SetUiModeFunction = React.Dispatch<React.SetStateAction<UiMode>>;

const App: FC = () => {
    // -- Getting app state --
    const base = "/api";

    const { data: appState, refetch: refetchAppState } = useGet({
        path: "/state",
        base,
    });

    // -- UI mode --
    const [uiMode, setUiMode] = useState<UiMode>("ViewBoard");

    // -- Manipulating app state --
    const { mutate: performActionBase } = useMutate({
        verb: "POST",
        path: "/action",
        base,
    });

    const performAction = (action: API.Action) =>
        performActionBase(action).then(() => refetchAppState());

    // -- Key bindings --
    const bindKey: BindKeyFunction = (modes, key, action) => {
        const onKeyDown = useCallback(
            (e) => {
                if (!e.repeat && e.key == key) {
                    for (const mode of modes) {
                        if (uiMode == mode) {
                            const boardAction = action(appState, uiMode, e);
                            if (boardAction) {
                                performAction(boardAction);
                            }
                            return;
                        }
                    }
                }
            },
            [appState, uiMode, action]
        );

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

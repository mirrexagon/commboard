import type { Component, Accessor, Setter, Resource } from "solid-js";
import { Show, createSignal, createResource } from "solid-js";

import { createShortcut } from "@solid-primitives/keyboard";

import Board from "./components/Board";

import * as API from "./ApiTypes";

export type UiMode =
    | "ViewBoard"
    | "SelectCategory"
    | "ViewCard"
    | "EditCardText"
    | "AddTagFromViewCard"
    | "DeleteTagFromViewCard";

export type BindKeyFunction = (
    modes: UiMode[],
    keys: string[],
    action: (appState: API.AppState, uiMode: string) => void | API.Action
) => void;

export type SetUiModeFunction = (newMode: UiMode) => void;

export interface UiState {
    appState: Resource<API.AppState>;
    refetchAppState: () => void;
    uiMode: Accessor<UiMode>;
    setUiMode: SetUiModeFunction;
    performAction: (action: API.Action) => Promise<void>;
    bindKey: BindKeyFunction;
}

const App: Component = () => {
    // -- Getting app state --
    const fetchAppState = async () => (await fetch("/api/state")).json();

    const [appState, { refetch: refetchAppState }] =
        createResource(fetchAppState);

    // -- UI mode --
    const [uiMode, setUiModeBase] = createSignal<UiMode>("ViewBoard");
    const setUiMode: SetUiModeFunction = (newMode) => setUiModeBase(newMode);

    // -- Manipulating app state --
    const performActionBase = async (action: API.Action) =>
        await fetch("/api/action", {
            method: "POST",
            body: JSON.stringify(action),
        });

    const performAction = (action: API.Action) =>
        performActionBase(action).then(() => refetchAppState());

    // -- Key bindings --
    const bindKey: BindKeyFunction = (modes, keys, action) => {
        createShortcut(keys, () => {
            for (const mode of modes) {
                if (uiMode() == mode) {
                    const boardAction = action(appState(), uiMode());
                    if (boardAction) {
                        performAction(boardAction);
                    }
                    return;
                }
            }
        });
    };

    return (
        <Show
            when={appState() != null}
            fallback={<h1>Waiting for data from the server</h1>}
        >
            <Board
                appState={appState()}
                uiMode={uiMode()}
                setUiMode={setUiMode}
                bindKey={bindKey}
            />
        </Show>
    );
};

export default App;

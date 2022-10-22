import type { Component, Accessor, Setter, Resource } from "solid-js";
import { Show, createSignal, createResource, createEffect, on } from "solid-js";

import {
    createShortcut,
    useKeyDownList,
    useKeyDownSequence,
} from "@solid-primitives/keyboard";

import { arrayEquals } from "@solid-primitives/utils";

import Board from "./components/Board";

import * as API from "./ApiTypes";

export type UiMode =
    | "ViewBoard"
    | "SelectCategory"
    | "ViewCard"
    | "EditCardText"
    | "AddTagFromViewCard"
    | "DeleteTagFromViewCard";

export type KeyBindingAction = (
    appState: API.AppState,
    uiMode: string,
    preventDefault: () => void
) => void | API.Action;

export type BindKeyFunction = (
    modes: UiMode[],
    keys: string[],
    action: KeyBindingAction
) => void;

export type SetUiModeFunction = (newMode: UiMode) => void;

export type PerformActionFunction = (action: API.Action) => void;

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

    const performAction: PerformActionFunction = (action) =>
        performActionBase(action).then(() => refetchAppState());

    // -- Key bindings --
    const [keyBindings, setKeyBindings] = createSignal<
        {
            keys: string[];
            bindings: { modes: UiMode[]; action: KeyBindingAction }[];
        }[]
    >([]);

    const bindKey: BindKeyFunction = (modes, keys, action) => {
        keys = keys.map((key) => key.toUpperCase());

        const keyBindingsLocal = keyBindings();

        for (const keyBinding of keyBindingsLocal) {
            if (arrayEquals(keys, keyBinding.keys)) {
                keyBinding.bindings.push({ modes, action });
                setKeyBindings(keyBindingsLocal);
                return;
            }
        }

        keyBindingsLocal.push({ keys: keys, bindings: [{ modes, action }] });
        setKeyBindings(keyBindingsLocal);
    };

    const [, { event: keyEvent }] = useKeyDownList();
    const keyDownSequence = useKeyDownSequence();

    const handleSequence = (sequence: string[][]) => {
        const currentAppState = appState();
        const currentUiMode = uiMode();

        const last = sequence.at(-1);
        if (!last) return;

        for (const keyBinding of keyBindings()) {
            if (arrayEquals(last, keyBinding.keys)) {
                const prev = sequence.at(-2);
                if (
                    !prev ||
                    arrayEquals(
                        prev,
                        keyBinding.keys.slice(0, keyBinding.keys.length - 1)
                    )
                ) {
                    const preventDefault = () => keyEvent()!.preventDefault();

                    for (const binding of keyBinding.bindings) {
                        if (binding.modes.includes(currentUiMode)) {
                            const boardAction = binding.action(
                                currentAppState,
                                currentUiMode,
                                preventDefault
                            );
                            if (boardAction) {
                                performAction(boardAction);
                            }
                        }
                    }
                }
            }
        }
    };

    createEffect(on(keyDownSequence, handleSequence));

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
                performAction={performAction}
            />
        </Show>
    );
};

export default App;

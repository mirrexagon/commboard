import type { Component, JSX } from "solid-js";
import { Show, For, createSignal, createEffect } from "solid-js";

import styles from "./Selector.module.css";

interface SelectorProps {
    visible: boolean;
    value: string;
    suggestions: string[];
    onInput: JSX.EventHandler<HTMLInputElement, InputEvent>;
}

const Selector: Component<SelectorProps> = (props) => {
    let inputRef: HTMLInputElement;

    createEffect(() => {
        if (props.visible) {
            inputRef?.focus();
        }
    });

    return (
        <div
            class={styles.selectorFullscreenContainer}
            style={{ visibility: props.visible ? "visible" : "hidden" }}
        >
            <div class={styles.selector}>
                <input
                    ref={inputRef}
                    class={styles.selectorText}
                    value={props.value}
                    onInput={props.onInput}
                />

                <ul class={styles.selectorSuggestions}>
                    <For
                        each={props.suggestions.filter((s) =>
                            s.toLowerCase().includes(props.value.toLowerCase())
                        )}
                    >
                        {(s, i) => (
                            <li class={styles.selectorSuggestion}>{s}</li>
                        )}
                    </For>
                </ul>
            </div>
        </div>
    );
};

export default Selector;

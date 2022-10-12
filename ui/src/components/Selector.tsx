import type { Component, JSX } from "solid-js";
import { Show, For, createSignal } from "solid-js";

import styles from "./Selector.module.css";

interface SelectorProps {
    inputRef: HTMLInputElement;
    visible: boolean;
    value: string;
    suggestions: string[];
    onInput: JSX.EventHandler<HTMLInputElement, InputEvent>;
}

const Selector: Component<SelectorProps> = (props) => {
    const filteredSuggestions = props.suggestions.filter((s) =>
        s.toLowerCase().includes(props.value.toLowerCase())
    );

    return (
        <div
            class={styles.selectorFullscreenContainer}
            style={{ visibility: props.visible ? "visible" : "hidden" }}
        >
            <div class={styles.selector}>
                <input
                    ref={props.inputRef}
                    class={styles.selectorText}
                    value={props.value}
                    onInput={props.onInput}
                />

                <ul class={styles.selectorSuggestions}>
                    <For each={filteredSuggestions}>
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

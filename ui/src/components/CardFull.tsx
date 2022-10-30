import type { Component } from "solid-js";
import { createSignal, createEffect, Show } from "solid-js";

import styles from "./CardFull.module.css";

import * as API from "../ApiTypes";
import { UiMode, SetUiModeFunction, BindKeyFunction } from "../App";

import TagList from "./TagList";
import Selector from "./Selector";

interface CardFullProps {
    uiMode: UiMode;
    setUiMode: SetUiModeFunction;
    bindKey: BindKeyFunction;
    card: API.Card;
    allTags: API.Tag[];
}

const CardFull: Component<CardFullProps> = (props) => {
    const isEditingText = () => props.uiMode == "EditCardText";
    const [editedText, setEditedText] = createSignal(props.card.text);
    let inputElement: HTMLTextAreaElement;

    createEffect(() => {
        if (isEditingText()) {
            inputElement?.focus();
        } else {
            setEditedText(props.card.text);
        }
    });

    props.bindKey(
        ["ViewCard"],
        ["Enter"],
        (appState, uiMode, preventDefault) => {
            // Prevent from entering newline in the textarea we are about to focus.
            preventDefault();

            props.setUiMode("EditCardText");
        }
    );

    props.bindKey(
        ["EditCardText"],
        ["Escape"],
        (appState, uiMode, preventDefault) => {
            props.setUiMode("ViewCard");

            return {
                type: "SetCurrentCardText",
                text: editedText(),
            };
        }
    );

    const [tagSelectText, setTagSelectText] = createSignal("");

    props.bindKey(["ViewCard"], ["a"], (appState, uiMode, preventDefault) => {
        // Prevent from entering newline in the textarea we are about to focus.
        preventDefault();

        setTagSelectText("");
        props.setUiMode("AddTagFromViewCard");
    });

    props.bindKey(
        ["AddTagFromViewCard"],
        ["Enter"],
        (appState, uiMode, preventDefault) => {
            props.setUiMode("ViewCard");

            return {
                type: "AddTagToCurrentCard",
                tag: tagSelectText(),
            };
        }
    );

    props.bindKey(
        ["AddTagFromViewCard"],
        ["Escape"],
        (appState, uiMode, preventDefault) => {
            // Cancel adding tag.
            props.setUiMode("ViewCard");
        }
    );

    props.bindKey(["ViewCard"], ["d"], (appState, uiMode, preventDefault) => {
        // Prevent from entering newline in the input we are about to focus.
        preventDefault();

        setTagSelectText("");
        props.setUiMode("DeleteTagFromViewCard");
    });

    props.bindKey(
        ["DeleteTagFromViewCard"],
        ["Enter"],
        (appState, uiMode, preventDefault) => {
            props.setUiMode("ViewCard");

            return {
                type: "DeleteTagFromCurrentCard",
                tag: tagSelectText(),
            };
        }
    );

    props.bindKey(
        ["DeleteTagFromViewCard"],
        ["Escape"],
        (appState, uiMode, preventDefault) => {
            // Cancel deleting tag.
            props.setUiMode("ViewCard");
        }
    );

    return (
        <div class={styles.cardFull}>
            <div class={styles.cardFullContent}>
                <h3>{props.card.id}</h3>

                <Show
                    when={isEditingText()}
                    fallback={
                        <div class={styles.cardFullTextStatic}>
                            {props.card.text}
                        </div>
                    }
                >
                    <textarea
                        ref={inputElement!}
                        style={{
                            visibility: isEditingText() ? "visible" : "hidden",
                        }}
                        class={styles.cardFullTextTextarea}
                        value={editedText()}
                        onInput={(e) => setEditedText(e.currentTarget.value)}
                    />
                </Show>

                <TagList tags={props.card.tags} />

                <Selector
                    visible={
                        props.uiMode == "AddTagFromViewCard" ||
                        props.uiMode == "DeleteTagFromViewCard"
                    }
                    value={tagSelectText()}
                    suggestions={
                        props.uiMode == "DeleteTagFromViewCard"
                            ? props.card.tags
                            : props.allTags
                    }
                    onInput={(e) => setTagSelectText(e.currentTarget.value)}
                />
            </div>
        </div>
    );
};

export default CardFull;

import type { Component } from "solid-js";
import { createSignal, createEffect } from "solid-js";

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

    props.bindKey(["ViewCard"], ["Enter"], (appState, uiMode) => {
        props.setUiMode("EditCardText");
        inputElement?.focus();
    });

    props.bindKey(["EditCardText"], ["Escape"], (appState, uiMode) => {
        props.setUiMode("ViewCard");

        return {
            type: "SetCurrentCardText",
            text: editedText(),
        };
    });

    const [tagSelectText, setTagSelectText] = createSignal("");

    props.bindKey(["ViewCard"], ["a"], (appState, uiMode) => {
        setTagSelectText("");

        props.setUiMode("AddTagFromViewCard");
    });

    props.bindKey(["AddTagFromViewCard"], ["Enter"], (appState, uiMode) => {
        props.setUiMode("ViewCard");

        return {
            type: "AddTagToCurrentCard",
            tag: tagSelectText(),
        };
    });

    props.bindKey(["AddTagFromViewCard"], ["Escape"], (appState, uiMode) => {
        // Cancel adding tag.
        props.setUiMode("ViewCard");
    });

    props.bindKey(["ViewCard"], ["d"], (appState, uiMode) => {
        setTagSelectText("");

        // Prevent from entering newline in the input we are about to focus.
        e.preventDefault();

        props.setUiMode("DeleteTagFromViewCard");
    });

    props.bindKey(["DeleteTagFromViewCard"], ["Enter"], (appState, uiMode) => {
        props.setUiMode("ViewCard");

        return {
            type: "DeleteTagFromCurrentCard",
            tag: tagSelectText(),
        };
    });

    props.bindKey(["DeleteTagFromViewCard"], ["Escape"], (appState, uiMode) => {
        // Cancel deleting tag.
        props.setUiMode("ViewCard");
    });

    return (
        <div class={styles.cardFull}>
            <div class={styles.cardFullContent}>
                <h3>{props.card.id}</h3>

                <div
                    style={{
                        visibility: isEditingText() ? "hidden" : "visible",
                    }}
                    class={styles.cardFullTextStatic}
                >
                    {props.card.text}
                </div>

                <textarea
                    ref={inputElement}
                    style={{
                        visibility: isEditingText() ? "visible" : "hidden",
                    }}
                    class={styles.cardFullTextTextarea}
                    value={editedText()}
                    onInput={(e) => setEditedText(e.currentTarget.value)}
                />

                <TagList tags={props.card.tags} />

                <Selector
                    visible={
                        props.uiMode == "AddTagFromViewCard" ||
                        props.uiMode == "DeleteTagFromViewCard"
                    }
                    value={tagSelectText()}
                    suggestions={props.allTags}
                    onInput={(e) => setTagSelectText(e.currentTarget.value)}
                />
            </div>
        </div>
    );
};

export default CardFull;

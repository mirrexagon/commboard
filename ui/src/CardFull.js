import React, { useState, useEffect, useRef } from "react";
import "./CardFull.css";

import TagList from "./TagList.js";
import Selector from "./Selector.js";

const CardFull = (props) => {
    const isEditingText = props.uiMode == "EditCardText";
    const inputElement = useRef(null);
    const [editedText, setEditedText] = useState(props.card.text);

    useEffect(() => {
        if (!isEditingText) {
            setEditedText(props.card.text);
        }
    }, [isEditingText, props.card.text]);

    props.bindKey(["ViewCard"], "Enter", (appState, uiMode, e) => {
        // Prevent from entering newline in the textarea we are about to focus.
        e.preventDefault();

        props.setUiMode("EditCardText");
        inputElement.current.focus()
    });

    props.bindKey(["EditCardText"], "Escape", (appState, uiMode, e) => {
        props.setUiMode("ViewCard");

        return {
            "type": "SetCurrentCardText",
            "text": editedText,
        };
    });

    const isAddingTag = props.uiMode == "AddTagFromViewCard";
    const isDeletingTag = props.uiMode == "DeleteTagFromViewCard";

    const [tagSelectText, setTagSelectText] = useState("");

    const tagSelectorElement = useRef(null);

    props.bindKey(["ViewCard"], "a", (appState, uiMode, e) => {
        // Prevent from entering newline in the input we are about to focus.
        e.preventDefault();

        props.setUiMode("AddTagFromViewCard");
        tagSelectorElement.current.focus();
    });

    props.bindKey(["AddTagFromViewCard"], "Enter", (appState, uiMode, e) => {
        props.setUiMode("ViewCard");

        setTagSelectText("");

        return {
            "type": "AddTagToCurrentCard",
            "tag": tagSelectText,
        };
    });

    props.bindKey(["AddTagFromViewCard"], "Escape", (appState, uiMode, e) => {
        // Cancel adding tag.
        props.setUiMode("ViewCard");
        setTagSelectText("");
    });

    props.bindKey(["ViewCard"], "d", (appState, uiMode, e) => {
        // Prevent from entering newline in the input we are about to focus.
        e.preventDefault();

        props.setUiMode("DeleteTagFromViewCard");
        tagSelectorElement.current.focus();
    });

    props.bindKey(["DeleteTagFromViewCard"], "Enter", (appState, uiMode, e) => {
        props.setUiMode("ViewCard");

        setTagSelectText("");

        return {
            "type": "DeleteTagFromCurrentCard",
            "tag": tagSelectText,
        };
    });

    props.bindKey(["DeleteTagFromViewCard"], "Escape", (appState, uiMode, e) => {
        // Cancel deleting tag.
        props.setUiMode("ViewCard");
        setTagSelectText("");
    });

    return (
        <div className="card-full">
            <div className="card-full-content">
                <h3>{props.card.id}</h3>

                <p className={`card-full-text_static--${isEditingText ? "hidden" : "active"}`}>
                    {props.card.text}
                </p>

                <textarea
                    ref={inputElement}
                    className={`card-full-text_textarea--${isEditingText ? "active" : "hidden"}`}
                    value={editedText}
                    onChange={(e) => setEditedText(e.target.value)}
                />

                <TagList tags={props.card.tags} />

                <Selector
                    inputRef={tagSelectorElement}
                    visible={isAddingTag || isDeletingTag}
                    value={tagSelectText}
                    suggestions={["event:party", "event:lunch", "color:blue", "color:green"]}
                    onChange={(e) => setTagSelectText(e.target.value)}
                    />
            </div>
        </div>
    );
}

export default CardFull;

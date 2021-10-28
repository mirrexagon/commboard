import React, { useState, useEffect, useRef } from "react";
import "./CardFull.css";

import TagList from "./TagList.js";

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

    props.bindKey(["EditCardText"], "Escape", (appState, uiMode) => {
        props.setUiMode("ViewCard");

        return {
            "type": "SetCurrentCardText",
            "text": editedText,
        };
    });

    return (
        <div className="card-full">
            <div className="card-full-content">
                <h3>{props.card.id}</h3>

                <p className={`card-full-text_static card-full-text_static--${isEditingText ? "hidden" : "active"}`}>
                    {props.card.text}
                </p>

                <textarea
                    ref={inputElement}
                    className={`card-full-text_textarea card-full-text_textarea--${isEditingText ? "active" : "hidden"}`}
                    value={editedText}
                    onChange={(e) => setEditedText(e.target.value)}
                />

                <TagList tags={props.card.tags} />
            </div>
        </div>
    );
}

export default CardFull;

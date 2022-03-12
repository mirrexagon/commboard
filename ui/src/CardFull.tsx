import React, { FC, useState, useEffect, useRef } from "react";
import "./CardFull.css";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import * as API from "./ApiTypes";
import { UiMode, SetUiModeFunction, BindKeyFunction } from "./App";

import TagList from "./TagList";
import Selector from "./Selector";

interface CardFullProps {
    uiMode: UiMode;
    setUiMode: SetUiModeFunction;
    bindKey: BindKeyFunction;
    card: API.Card;
    allTags: API.Tag[];
}

const CardFull: FC<CardFullProps> = (props) => {
    const isEditingText = props.uiMode == "EditCardText";
    const inputElement = useRef<HTMLTextAreaElement>(null);
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
        inputElement.current?.focus();
    });

    props.bindKey(["EditCardText"], "Escape", (appState, uiMode, e) => {
        props.setUiMode("ViewCard");

        return {
            type: "SetCurrentCardText",
            text: editedText,
        };
    });

    const isAddingTag = props.uiMode == "AddTagFromViewCard";
    const isDeletingTag = props.uiMode == "DeleteTagFromViewCard";
    const [tagSelectText, setTagSelectText] = useState("");
    const tagSelectorElement = useRef<HTMLInputElement>(null);

    props.bindKey(["ViewCard"], "a", (appState, uiMode, e) => {
        setTagSelectText("");

        // Prevent from entering newline in the input we are about to focus.
        e.preventDefault();

        props.setUiMode("AddTagFromViewCard");
        tagSelectorElement.current?.focus();
    });

    props.bindKey(["AddTagFromViewCard"], "Enter", (appState, uiMode, e) => {
        props.setUiMode("ViewCard");

        return {
            type: "AddTagToCurrentCard",
            tag: tagSelectText,
        };
    });

    props.bindKey(["AddTagFromViewCard"], "Escape", (appState, uiMode, e) => {
        // Cancel adding tag.
        props.setUiMode("ViewCard");
    });

    props.bindKey(["ViewCard"], "d", (appState, uiMode, e) => {
        setTagSelectText("");

        // Prevent from entering newline in the input we are about to focus.
        e.preventDefault();

        props.setUiMode("DeleteTagFromViewCard");
        tagSelectorElement.current?.focus();
    });

    props.bindKey(["DeleteTagFromViewCard"], "Enter", (appState, uiMode, e) => {
        props.setUiMode("ViewCard");

        return {
            type: "DeleteTagFromCurrentCard",
            tag: tagSelectText,
        };
    });

    props.bindKey(
        ["DeleteTagFromViewCard"],
        "Escape",
        (appState, uiMode, e) => {
            // Cancel deleting tag.
            props.setUiMode("ViewCard");
        }
    );

    return (
        <div className="card-full">
            <div className="card-full-content">
                <h3>{props.card.id}</h3>

                <div
                    style={{ visibility: isEditingText ? "hidden" : "visible" }}
                    className="card-full-text-static"
                >
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {props.card.text}
                    </ReactMarkdown>
                </div>

                <textarea
                    ref={inputElement}
                    style={{ visibility: isEditingText ? "visible" : "hidden" }}
                    className="card-full-text-textarea"
                    value={editedText}
                    onChange={(e) => setEditedText(e.target.value)}
                />

                <TagList tags={props.card.tags} />

                <Selector
                    inputRef={tagSelectorElement}
                    visible={isAddingTag || isDeletingTag}
                    value={tagSelectText}
                    suggestions={props.allTags}
                    onChange={(e) => setTagSelectText(e.target.value)}
                />
            </div>
        </div>
    );
};

export default CardFull;

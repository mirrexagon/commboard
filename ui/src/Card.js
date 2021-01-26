import React, { useState } from "react";
import "./Card.css";

import InlineInput from "react-inline-input";
import MarkdownInlineInput from "./MarkdownInlineInput.js";

function Tag(props) {
    const { value, onInput, onBlur } = useInlineInput(props.tagString, props.onUpdateTag);

    return <InlineInput
        placeholder=""
        value={value}
        onInput={onInput}
        onBlur={onBlur}
        />;
}

function Text(props) {
    const { value, onInput, onBlur } = useInlineInput(props.text, props.onUpdateText);



    return (
        <div className="card-text">
            <MarkdownInlineInput markdown={value} />
        </div>
    );
}

function NewTag(props) {
    const { value, setValue, onInput, onBlur } = useInlineInput("",
        (oldTag, newTag) => {
            setValue("");
            props.onUpdateNewTag(oldTag, newTag);
        });

    return <InlineInput
        placeholder="New tag..."
        value={value}
        labelClasses="card-new-tag-label"
        onInput={onInput}
        onBlur={onBlur}
        />;
}

function Card(props) {
    function onUpdateTag(oldTag, newTag) {
        if (newTag === "") {
            props.onDeleteCardTag(props.id, oldTag);
        } else {
            props.onUpdateCardTag(props.id, oldTag, newTag);
        }
    }

    function onUpdateText(oldText, newText) {
        props.onSetCardText(props.id, newText);
    }

    function onUpdateNewTag(oldTag, newTag) {
        props.onAddCardTag(props.id, newTag);
    }

    function onDeleteCard() {
        props.onDeleteCard(props.id);
    }

    const tags = props.tags.map((tagString) => (
        <li className="card-tag" key={tagString}>
            <Tag tagString={tagString} onUpdateTag={onUpdateTag} />
        </li>
    ));

    return (
        <div className="card-container">
            <a href="#" className="card-drag-handle">
                Drag
            </a>

            <br />
            <br />

            <Text
                text={props.text}
                onUpdateText={onUpdateText}
                placeholder={props.textPlaceholder}
                />

            <ul className="card-tag-list">{tags}</ul>

            <NewTag
                onUpdateNewTag={onUpdateNewTag}
                />
        </div>
    );
}

function useInlineInput(initialValue, onUpdate) {
    const [value, setValue] = useState(initialValue);

    function handleInput(s) {
        setValue(s);
    }

    function handleBlur() {
        if (value !== initialValue) {
            onUpdate(initialValue, value);
        }
    }

    return {
        value,
        onInput: handleInput,
        onBlur: handleBlur,
        setValue,
    };
}

export default Card;

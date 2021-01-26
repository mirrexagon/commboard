import React, { useState } from "react";
import PropTypes from "prop-types";
import "./Card.css";

import InlineInput from "react-inline-input";

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

    return <InlineInput
        type="textarea"
        placeholder={props.placeholder}
        value={value}
        labelClasses="card-text"
        onInput={onInput}
        onBlur={onBlur}
        />;
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

class Card extends React.Component {
    constructor(props) {
        super(props);

        this.onUpdateTag = this.onUpdateTag.bind(this);
        this.onUpdateText = this.onUpdateText.bind(this);
        this.onUpdateNewTag = this.onUpdateNewTag.bind(this);
    }

    onUpdateTag(oldTag, newTag) {
        if (newTag === "") {
            this.props.onDeleteCardTag(this.props.id, oldTag);
        } else {
            this.props.onUpdateCardTag(this.props.id, oldTag, newTag);
        }
    }

    onUpdateText(oldText, newText) {
        this.props.onSetCardText(this.props.id, newText);
    }

    onUpdateNewTag(oldTag, newTag) {
        this.props.onAddCardTag(this.props.id, newTag);
    }

    onDeleteCard() {
        this.props.onDeleteCard(this.props.id);
    }

    render() {
        let tags = this.props.tags.map((tagString) => (
            <li className="card-tag" key={tagString}>
                <Tag tagString={tagString} onUpdateTag={this.onUpdateTag} />
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
                    text={this.props.text}
                    onUpdateText={this.onUpdateText}
                    placeholder={this.props.textPlaceholder}
                    />

                <ul className="card-tag-list">{tags}</ul>

                <NewTag
                    onUpdateNewTag={this.onUpdateNewTag}
                    />
            </div>
        );
    }
}

Card.propTypes = {
    id: PropTypes.number.isRequired,
    text: PropTypes.string.isRequired,
    tags: PropTypes.array.isRequired,

    textPlaceholder: PropTypes.string,

    onAddCardTag: PropTypes.func.isRequired,
    onDeleteCardTag: PropTypes.func.isRequired,
    onUpdateCardTag: PropTypes.func.isRequired,
    onSetCardText: PropTypes.func.isRequired,
    onDeleteCard: PropTypes.func.isRequired,
};

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

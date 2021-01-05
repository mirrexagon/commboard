import React, { useState } from "react";
import PropTypes from "prop-types";
import "./Card.css";

import InlineInput from "react-inline-input";

function Tag(props) {
    const [newTagString, setNewTagString] = useState(props.tagString);

    function onInput(s) {
        setNewTagString(s);
    }

    function onBlur() {
        if (props.tagString !== newTagString) {
            props.onUpdateTag(props.tagString, newTagString);
        }
    }

    return (
        <InlineInput
            placeholder=""
            value={newTagString}
            onInput={onInput}
            onBlur={onBlur}
        />
    );
}

function Text(props) {
    const [newText, setNewText] = useState(props.text);
}

class Card extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            text: props.text,
            newTag: "",
        };

        this.onUpdateTag = this.onUpdateTag.bind(this);

        this.onTextInput = this.onTextInput.bind(this);
        this.onTextBlur = this.onTextBlur.bind(this);
        this.onNewTagInput = this.onNewTagInput.bind(this);
        this.onNewTagBlur = this.onNewTagBlur.bind(this);
    }

    onUpdateTag(oldTag, newTag) {
        if (newTag === "") {
            this.props.onDeleteCardTag(this.props.id, oldTag);
        } else {
            this.props.onUpdateCardTag(this.props.id, oldTag, newTag);
        }
    }

    onDeleteCard() {
        this.props.onDeleteCard(this.props.id);
    }

    onTextInput(s) {
        this.setState({ text: s });
    }

    onTextBlur() {
        if (this.state.text !== this.props.text) {
            this.props.onSetCardText(this.props.id, this.state.text);
        }
    }

    onNewTagInput(s) {
        this.setState({ newTag: s });
    }

    onNewTagBlur() {
        if (this.state.newTag !== "") {
            this.props.onAddCardTag(this.props.id, this.state.newTag);
            this.setState({ newTag: "" });
        }
    }

    render() {
        let tags = this.props.tags.map((tagString) => (
            <li className="card-tag" key={tagString}>
                <Tag tagString={tagString} onUpdateTag={this.onUpdateTag} />
            </li>
        ));

        let placeholder = "";

        if (this.props.textPlaceholder) {
            placeholder = this.props.textPlaceholder;
        }

        return (
            <div className="card-container">
                <a href="#" className="card-drag-handle">
                    Drag
                </a>

                <br />
                <br />

                <InlineInput
                    type="textarea"
                    placeholder={placeholder}
                    value={this.state.text}
                    labelClasses="card-text"
                    onInput={this.onTextInput}
                    onBlur={this.onTextBlur}
                />

                <ul className="card-tag-list">{tags}</ul>

                <InlineInput
                    placeholder="New tag..."
                    value={this.state.newTag}
                    labelClasses="card-new-tag-label"
                    onInput={this.onNewTagInput}
                    onBlur={this.onNewTagBlur}
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

function useInlineInput(initialValue, onBlur) {
    const [value, setValue] = useState(initialValue);

    function handleChange(s) {
        setValue(s);
    }

    function onBlur() {
        if (value !== initialValue) {
            props.onUpdateTag(props.tagString, newTagString);
        }
    }

    return {
        value,
        onChange: handleChange,
    };

}

export default Card;

 import React from 'react';
import PropTypes from 'prop-types';
import './Card.css';

import InlineInput from 'react-inline-input';

class Tag extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            tagString: props.tagString,
        };

        this.onInput = this.onInput.bind(this);
        this.onBlur = this.onBlur.bind(this);
    }

    onInput(s) {
        this.setState({ tagString: s });
    }

    onBlur() {
        if (this.state.tagString !== this.props.tagString) {
            this.props.onUpdateTag(this.props.tagString, this.state.tagString);
        }

    }

    render() {
        return <InlineInput
            placeholder=""
            value={this.state.tagString}

            onInput={this.onInput}
            onBlur={this.onBlur}
            />;
    }
}

Tag.propTypes = {
    tagString: PropTypes.string.isRequired,
    onUpdateTag: PropTypes.func.isRequired,
};

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
        return this.props.actions.onUpdateCardTag(this.props.id, oldTag, newTag);
    }

    onTextInput(s) {
        this.setState({ text: s });
    }

    onTextBlur() {
        if (this.state.text !== this.props.text) {
            this.props.actions.onSetCardText(this.props.id, this.state.text);
        }
    }

    onNewTagInput(s) {
        this.setState({ newTag: s });
    }

    onNewTagBlur() {
        if (this.state.newTag !== "") {
            this.props.actions.onAddCardTag(this.props.id, this.state.newTag);
            this.setState({ newTag: "" });
        }
    }

    render() {
        let tags = this.props.tags.map(
            (tagString) => (<li className="card-tag" key={tagString}>
                <Tag tagString={tagString} onUpdateTag={this.onUpdateTag} />
            </li>));

        return (<div className="card-container">
            <InlineInput
                type="textarea"
                placeholder=""
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
        </div>);
    }
}

Card.propTypes = {
    id: PropTypes.number.isRequired,
    text: PropTypes.string.isRequired,
    tags: PropTypes.array.isRequired,
    actions: PropTypes.object.isRequired,
};

export default Card;

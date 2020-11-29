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
        };

        this.onUpdateTag = this.onUpdateTag.bind(this);

        this.onInput = this.onInput.bind(this);
        this.onBlur = this.onBlur.bind(this);
    }

    onUpdateTag(oldTag, newTag) {
        return this.props.actions.onUpdateCardTag(this.props.id, oldTag, newTag);
    }

    onInput(s) {
        this.setState({ text: s });
    }

    onBlur() {
        if (this.state.text !== this.props.text) {
            this.props.actions.onSetCardText(this.props.id, this.state.text);
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

                onInput={this.onInput}
                onBlur={this.onBlur}
                />

            <ul className="card-tag-list">{tags}</ul>
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

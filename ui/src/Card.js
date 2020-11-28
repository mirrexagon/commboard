 import React from 'react';
import PropTypes from 'prop-types';
import './Card.css';

import InlineInput from 'react-inline-input';

class Tag extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            newInput: "",
        };

        this.onInput = this.onInput.bind(this);
        this.onBlur = this.onBlur.bind(this);
    }

    onInput(s) {
        this.setState({ newInput: s });
    }

    onBlur() {
        if (this.state.newInput !== this.props.tagString) {
            this.props.onUpdateTag(this.props.tagString, this.state.newInput);
        }
    }

    render() {
        return <InlineInput
            onInput={this.onInput}
            onBlur={this.onBlur}
            placeholder={""}
            value={this.props.tagString}
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

        this.onUpdateTag = this.onUpdateTag.bind(this);
    }

    onUpdateTag(oldTag, newTag) {
        this.props.actions.onUpdateCardTag(this.props.id, oldTag, newTag);
    }

    render() {
        let tags = this.props.tags.map(
            (tagString) => (<li className="card-tag" key={tagString}>
                <Tag tagString={tagString} onUpdateTag={this.onUpdateTag} />
            </li>));

        return (<div className="card-container">
            <p className="card-text">{this.props.text}</p>
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

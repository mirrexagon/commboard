import React from 'react';
import PropTypes from 'prop-types';
import './Card.css';

class Tag extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        return this.props.tagString;
    }
}

Tag.propTypes = {
    tagString: PropTypes.string.isRequired,
};

class Card extends React.Component {
    render() {
        let tags = this.props.tags.map(
            (tagString) => (<li className="card-tag" key={tagString}>
                <Tag tagString={tagString} />
            </li>));

        return (<div className="card-container">
            <p className="card-text">{this.props.text}</p>
            <ul className="card-tag-list">{tags}</ul>
        </div>);
    }
}

Card.propTypes = {
    text: PropTypes.string.isRequired,
    tags: PropTypes.array.isRequired,
    actions: PropTypes.object.isRequired,
};

export default Card

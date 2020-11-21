import React from 'react';
import PropTypes from 'prop-types';
import './Card.css';

class Card extends React.Component {
    render() {
        let tags = this.props.tags.map(
            (tagString) => (<li className="card-tag" key={tagString}>
                {tagString}
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

    onSetCardText: PropTypes.func.isRequired,
    onAddCardTag: PropTypes.func.isRequired,
    onDeleteCardTag: PropTypes.func.isRequired,
    onUpdateCardTag: PropTypes.func.isRequired,
};

export default Card

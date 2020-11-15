import React from 'react';
import PropTypes from 'prop-types';
import './Card.css';

class Card extends React.Component {
    render() {
        let tags = this.props.tags.map((tag) => <li>{tag}</li>);

        return (<div className="card-container">
            <p className="card-text">{this.props.text}</p>
            <ul className="tag-list">{tags}</ul>
        </div>);
    }
}

Card.propTypes = {
    text: PropTypes.string,
    tags: PropTypes.array,
};

export default Card

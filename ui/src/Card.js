import React from 'react';
import PropTypes from 'prop-types';
import styles from './Card.css';

class Card extends React.Component {
    render() {
        return (<div>
            <p>{this.props.text}</p>
        </div>);
    }
}

Card.propTypes = {
    text: PropTypes.string,
    tags: PropTypes.array,
};

export default Card

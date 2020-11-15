import React from 'react';
import PropTypes from 'prop-types';
import './CardColumn.css';

import Card from './Card.js';

class CardColumn extends React.Component {
    render() {
        const cards = this.props.cards.map((card) => <li className="card-column-item" key={card.id}><Card text={card.text} tags={card.tags} /></li>);

        return <ul className="card-column">{cards}</ul>;
    }
}

Card.propTypes = {
    cards: PropTypes.array,
};

export default CardColumn

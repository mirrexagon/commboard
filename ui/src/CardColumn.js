import React from 'react';
import PropTypes from 'prop-types';
import './CardColumn.css';

import Card from './Card.js';

class CardColumn extends React.Component {
    render() {
        const cards = this.props.cards.map((card) => (<li className="card-column-item" key={card.id}>
            <Card
                text={card.text}
                tags={card.tags}
                actions={this.props.actions}
                />
        </li>));

        return <ul className="card-column">{cards}</ul>;
    }
}

CardColumn.propTypes = {
    cards: PropTypes.array.isRequired,
    actions: PropTypes.object.isRequired,
};

export default CardColumn

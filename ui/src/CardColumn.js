import React from 'react';
import PropTypes from 'prop-types';
import './CardColumn.css';

import Card from './Card.js';

class CardColumn extends React.Component {
    render() {
        const cards = this.props.cards.map((card) => (<li className="card-column-item" key={card.id}>
            <Card
                id={card.id}
                text={card.text}
                tags={card.tags}

                onAddCardTag={this.props.actions.onAddCardTag}
                onDeleteCardTag={this.props.actions.onDeleteCardTag}
                onUpdateCardTag={this.props.actions.onUpdateCardTag}
                onSetCardText={this.props.actions.onSetCardText}
                onDeleteCard={this.props.actions.onDeleteCard}
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

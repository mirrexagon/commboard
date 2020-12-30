import React from "react";
import PropTypes from "prop-types";
import "./CardColumn.css";

import ReactDragListView from "react-drag-listview";

import Card from "./Card.js";

class CardColumn extends React.Component {
    render() {
        const cards = this.props.cards.map((card) => (
            <li className="card-column-item" key={card.id}>
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
            </li>
        ));

        return (
            <ReactDragListView
                onDragEnd={(fromIndex, toIndex) => {
                    const cardId = this.props.cards[fromIndex].id;
                    this.props.onMoveCardInColumn(cardId, toIndex);
                }}
                nodeSelector=".card-column-item"
                handleSelector=".card-drag-handle"
            >
                <ul className="card-column">{cards}</ul>
            </ReactDragListView>
        );
    }
}

CardColumn.propTypes = {
    cards: PropTypes.array.isRequired,
    actions: PropTypes.object.isRequired,

    onMoveCardInColumn: PropTypes.func.isRequired,
};

export default CardColumn;

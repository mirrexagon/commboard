import React from 'react';
import PropTypes from 'prop-types';
import './BoardViewCategory.css';

import CardColumn from './CardColumn.js';

class CategoryColumn extends React.Component {
    render() {
        return (<div>
            <h2>{this.props.name}</h2>
            <CardColumn
                cards={this.props.cards}
                actions={this.props.actions}
                onMoveCardInColumn={(cardId, toPos) => this.props.onMoveCardInColumn(cardId, this.props.tag, toPos)}
                />
        </div>);
    }
}

CategoryColumn.propTypes = {
    name: PropTypes.string.isRequired,
    tag: PropTypes.string.isRequired,
    cards: PropTypes.array.isRequired,
    actions: PropTypes.object.isRequired,
    onMoveCardInColumn: PropTypes.func.isRequired,
};

class BoardViewCategory extends React.Component {
    render() {
        const categoryName = this.props.viewData.category_name;

        const columns = this.props.viewData.category_view.columns.map(
            (column) => {
                const cards = column.cards.map(
                    (cardId) => this.props.viewData.board.cards[cardId]);

                return (<div className="category-view-column" key={categoryName + ":" + column.name}>
                    <CategoryColumn
                        name={column.name}
                        tag={`${categoryName}:${column.name}`}
                        cards={cards}
                        actions={this.props.actions}
                        onMoveCardInColumn={this.props.onMoveCardInColumn}
                        />
                </div>);
            });

        return (<div className="category-view">
            <div>
                {columns}
            </div>
        </div>);
    }
}

BoardViewCategory.propTypes = {
    viewData: PropTypes.object.isRequired,
    actions: PropTypes.object.isRequired,
    onMoveCardInColumn: PropTypes.func.isRequired,
};

export default BoardViewCategory;

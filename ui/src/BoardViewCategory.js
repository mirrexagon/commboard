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
                />
        </div>);
    }
}

CategoryColumn.propTypes = {
    name: PropTypes.string.isRequired,
    cards: PropTypes.array.isRequired,
    actions: PropTypes.object.isRequired,
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
                        cards={cards}
                        actions={this.props.actions}
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
};

export default BoardViewCategory;

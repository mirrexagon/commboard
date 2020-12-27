import React from 'react';
import PropTypes from 'prop-types';
import './BoardViewCategory.css';

import ReactDragListView from 'react-drag-listview';
const { DragColumn } = ReactDragListView;

import CardColumn from './CardColumn.js';

class CategoryColumn extends React.Component {
    render() {
        return (<div>
            <a href="#" className="category-view-column-drag-handle">Drag</a>
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

                return (<li className="category-view-column" key={categoryName + ":" + column.name}>
                    <CategoryColumn
                        name={column.name}
                        tag={`${categoryName}:${column.name}`}
                        cards={cards}
                        actions={this.props.actions}
                        onMoveCardInColumn={this.props.onMoveCardInColumn}
                        />
                </li>);
            });

        return (
            <DragColumn
                onDragEnd={(fromIndex, toIndex) => {
                    // TODO: Figure out why `toIndex` is -1 when dragging outside of the column list.
                    if (toIndex < 0) {
                        return;
                    }

                    const columnName = this.props.viewData.category_view.columns[fromIndex].name;
                    const tag = `${categoryName}:${columnName}`;


                    this.props.onMoveColumnInCategory(tag, toIndex);
                }}
                nodeSelector=".category-view-column"
                handleSelector=".category-view-column-drag-handle"
                >
                <ul className="category-view">
                    {columns}
                </ul>
            </DragColumn>
        );
    }
}

BoardViewCategory.propTypes = {
    viewData: PropTypes.object.isRequired,
    actions: PropTypes.object.isRequired,
    onMoveCardInColumn: PropTypes.func.isRequired,
    onMoveColumnInCategory: PropTypes.func.isRequired,
};

export default BoardViewCategory;

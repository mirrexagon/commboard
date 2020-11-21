import React from 'react';
import PropTypes from 'prop-types';
import './Board.css';

import BoardViewDefault from './BoardViewDefault.js';
import BoardViewCategory from './BoardViewCategory.js';

class BoardPanel extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            filter: "",
        };
    }

    handleFilterChange(event) {
        let newFilter = event.target.value;

        this.setState({ filter: newFilter },
            () => this.props.onSetFilter(newFilter));
    }

    render() {
        const categories = this.props.categoryNames
            .map((categoryName) => {
                // Emphasise current.
                let categoryNameElement = categoryName;

                if (categoryName == this.props.currentCategoryName) {
                    categoryNameElement = <strong>{categoryName}</strong>;
                }

                return (<li key={categoryName}>
                    <button onClick={() => this.props.onSetCategoryView(categoryName)}>
                        {categoryNameElement}
                    </button>
                </li>);
            });

        let noCategoryText = "No Category";
        if (this.props.currentCategoryName === null) {
            noCategoryText = <strong>{noCategoryText}</strong>;
        }

        return (<div className="board-panel">
            <h1>{this.props.boardName}</h1>
            <input type="text" value={this.state.filter} onChange={(event) => this.handleFilterChange(event)} />
            <ul>
                <li key={0}>
                    <button onClick={() => this.props.onSetDefaultView()}>
                        {noCategoryText}
                    </button>
                </li>

                {categories}
            </ul>
        </div>);
    }
}

BoardPanel.propTypes = {
    boardName: PropTypes.string.isRequired,
    categoryNames: PropTypes.array.isRequired,
    currentCategoryName: PropTypes.string,

    onSetDefaultView: PropTypes.func.isRequired,
    onSetCategoryView: PropTypes.func.isRequired,
    onSetFilter: PropTypes.func.isRequired,
};

class Board extends React.Component {
    getCurrentCategory() {
        if (this.props.boardViewData.default_view) {
            // null means we are in the default view.
            return null;
        } else if (this.props.boardViewData.category_view) {
            return this.props.boardViewData.category_name;
        }
    }

    render() {
        if (!this.props.boardViewData) {
            return <p>Loading</p>;
        }

        // ---

        const currentCategory = this.getCurrentCategory();
        let boardView = null;

        if (currentCategory === null) {
            boardView = <BoardViewDefault viewData={this.props.boardViewData} />;
        } else if (currentCategory) {
            boardView = <BoardViewCategory viewData={this.props.boardViewData} />;
        }

        return (<div>
            <BoardPanel
                boardName={this.props.boardViewData.board.name}
                categoryNames={this.props.boardViewData.board.categories}
                currentCategoryName={this.getCurrentCategory()}

                onSetDefaultView={() => this.props.onSetDefaultView()}
                onSetCategoryView={(categoryName) => this.props.onSetCategoryView(categoryName)}
                onSetFilter={(filter) => this.props.onSetFilter(filter)}
                />

            <div className="board-view-container">
                {boardView}
            </div>
        </div>);
    }
}

Board.propTypes = {
    boardViewData: PropTypes.object,

    onSetDefaultView: PropTypes.func.isRequired,
    onSetCategoryView: PropTypes.func.isRequired,
    onSetFilter: PropTypes.func.isRequired,
};

export default Board;

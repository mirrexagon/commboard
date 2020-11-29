import React from 'react';
import PropTypes from 'prop-types';
import './Board.css';

import InlineInput from 'react-inline-input';

import BoardViewDefault from './BoardViewDefault.js';
import BoardViewCategory from './BoardViewCategory.js';

class BoardPanel extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            filter: "",
            boardName: props.name,
        };

        this.onBoardNameInput = this.onBoardNameInput.bind(this);
        this.onBoardNameBlur = this.onBoardNameBlur.bind(this);
    }

    handleFilterChange(event) {
        let newFilter = event.target.value;

        this.setState({ filter: newFilter },
            () => this.props.actions.onSetFilter(newFilter));
    }

    onBoardNameInput(s) {
        this.setState({ boardName: s });
    }

    onBoardNameBlur() {
        if (this.state.boardName !== this.props.boardName) {
            this.props.actions.onSetBoardName(this.state.boardName);
        }
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
                    <button onClick={() => this.props.actions.onSetCategoryView(categoryName)}>
                        {categoryNameElement}
                    </button>
                </li>);
            });

        let noCategoryText = "No Category";
        if (this.props.currentCategoryName === null) {
            noCategoryText = <strong>{noCategoryText}</strong>;
        }

        // TODO: Add new card by having a "new card" in the panel, that you
        // can edit and then finally add by pressing a button.
        return (<div className="board-panel">
            <h1><InlineInput
                value={this.props.boardName}
                placeholder=""

                onInput={this.onBoardNameInput}
                onBlur={this.onBoardNameBlur}
                />
            </h1>

            <input type="text" value={this.state.filter} onChange={(event) => this.handleFilterChange(event)} />

            <ul>
                <li key={0}>
                    <button onClick={() => this.props.actions.onSetDefaultView()}>
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
    actions: PropTypes.object.isRequired,
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
            boardView = <BoardViewDefault
                viewData={this.props.boardViewData}
                actions={this.props.actions}
                />;
        } else if (currentCategory) {
            boardView = <BoardViewCategory
                viewData={this.props.boardViewData}
                actions={this.props.actions}
                />;
        }

        return (<div>
            <BoardPanel
                boardName={this.props.boardViewData.board.name}
                categoryNames={this.props.boardViewData.board.categories}
                currentCategoryName={this.getCurrentCategory()}
                actions={this.props.actions}
                />

            <div className="board-view-container">
                {boardView}
            </div>
        </div>);
    }
}

Board.propTypes = {
    boardViewData: PropTypes.object,
    actions: PropTypes.object.isRequired,
};

export default Board;

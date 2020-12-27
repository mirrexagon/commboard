import React from 'react';
import PropTypes from 'prop-types';
import './Board.css';

import InlineInput from 'react-inline-input';

import BoardViewDefault from './BoardViewDefault.js';
import BoardViewCategory from './BoardViewCategory.js';
import Card from './Card.js';

function isTagValid(tag) {
    return fetch("/tags/validate/" + tag)
    .then((response) => {
        if (response.ok) {
            return Promise.resolve(response.json());
        } else {
            return Promise.reject("Failed to check tag validity");
        }
    });
}

class BoardPanel extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            filter: "",
            boardName: props.name,

            newCardText: "",
            newCardTags: [],
        };

        this.onBoardNameInput = this.onBoardNameInput.bind(this);
        this.onBoardNameBlur = this.onBoardNameBlur.bind(this);

        this.onNewCardAddCardTag = this.onNewCardAddCardTag.bind(this);
        this.onNewCardDeleteCardTag = this.onNewCardDeleteCardTag.bind(this);
        this.onNewCardSetCardText = this.onNewCardSetCardText.bind(this);
        this.onNewCardDeleteCard = this.onNewCardDeleteCard.bind(this);
        this.onNewCardCreate = this.onNewCardCreate.bind(this);
    }

    // ---

    handleFilterChange(event) {
        let newFilter = event.target.value;

        this.setState({ filter: newFilter },
            () => this.props.actions.onSetFilter(newFilter));
    }

    // ---

    onBoardNameInput(s) {
        this.setState({ boardName: s });
    }

    onBoardNameBlur() {
        if (this.state.boardName !== this.props.boardName) {
            this.props.actions.onSetBoardName(this.state.boardName);
        }
    }

    // ---

    onNewCardAddCardTag(cardId, tag) {
        isTagValid(tag)
        .then((isValid) => {
            if (isValid) {
                if (this.state.newCardTags.indexOf(tag) == -1) {
                    this.setState((state, props) => {
                        let newCardTags = state.newCardTags.slice();

                        newCardTags.push(tag);
                        newCardTags.sort();

                        return { newCardTags: newCardTags };
                    });
                }
            } else {
                Promise.reject("Tag " + tag + " was not valid");
            }
        })
        .catch(console.log);
    }

    onNewCardDeleteCardTag(cardId, tag) {
        this.setState((state, props) => {
            let newCardTags = state.newCardTags.slice();

            const tagIndex = newCardTags.indexOf(tag);
            newCardTags.splice(tagIndex, 1);

            return { newCardTags: newCardTags };
        });
    }

    onNewCardUpdateCardTag(cardId, oldTag, newTag) {
        this.setState((state, props) => {
            let newCardTags = state.newCardTags.slice();

            const newTagIndex = newCardTags.indexOf(oldTag);
            newCardTags.splice(newTagIndex, 1);

            newCardTags.push(newTag);
            newCardTags.sort();

            return { newCardTags: newCardTags };
        });
    }

    onNewCardSetCardText(cardId, text) {
        this.setState({ newCardText: text });
    }

    onNewCardDeleteCard(cardId) {
        // Do nothing, as this isn't a real card.
    }

    onNewCardCreate() {
        this.props.actions.onAddCard(this.state.newCardText, this.state.newCardTags);
    }

    // ---

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

        return (<div className="board-panel">
            <h1><InlineInput
                value={this.props.boardName}
                placeholder=""

                onInput={this.onBoardNameInput}
                onBlur={this.onBoardNameBlur}
                />
            </h1>

            <input className="board-filter-input" type="text" value={this.state.filter} onChange={(event) => this.handleFilterChange(event)} />

            <Card
                id={-1}
                text={this.state.newCardText}
                tags={this.state.newCardTags}

                textPlaceholder="New card text"

                onAddCardTag={this.onNewCardAddCardTag}
                onDeleteCardTag={this.onNewCardDeleteCardTag}
                onUpdateCardTag={this.onNewCardUpdateCardTag}
                onSetCardText={this.onNewCardSetCardText}
                onDeleteCard={this.onNewCardDeleteCard}
                />

            <button onClick={this.onNewCardCreate}>Add new card</button>

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
                onMoveCardWithinDefaultCardOrder={this.props.onMoveCardWithinDefaultCardOrder}
                />;
        } else if (currentCategory) {
            boardView = <BoardViewCategory
                viewData={this.props.boardViewData}
                actions={this.props.actions}
                onMoveCardInColumn={this.props.onMoveCardInColumn}
                onMoveColumnInCategory={this.props.onMoveColumnInCategory}
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

    onMoveCardWithinDefaultCardOrder: PropTypes.func.isRequired,
    onMoveCardInColumn: PropTypes.func.isRequired,

    onMoveColumnInCategory: PropTypes.func.isRequired,
};

export default Board;

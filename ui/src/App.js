import React from 'react';
import PropTypes from 'prop-types';
import './App.css';

import Board from './Board.js';

class App extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            currentCategoryName: null,
            currentFilter: null,
            isFetching: false,
            currentBoardViewData: null,
        };

        this.fetchCurrentView = this.fetchCurrentView.bind(this);

        this.onSetDefaultView = this.onSetDefaultView.bind(this);
        this.onSetCategoryView = this.onSetCategoryView.bind(this);
        this.onSetFilter = this.onSetFilter.bind(this);

        this.onSetBoardName = this.onSetBoardName.bind(this);
        this.onAddCard = this.onAddCard.bind(this);
        this.onDeleteCard = this.onDeleteCard.bind(this);
        this.onSetCardText = this.onSetCardText.bind(this);
        this.onAddCardTag = this.onAddCardTag.bind(this);
        this.onDeleteCardTag = this.onDeleteCardTag.bind(this);
        this.onUpdateCardTag = this.onUpdateCardTag.bind(this);
    }

    componentDidMount() {
        this.onSetDefaultView();
    }

    // ---

    fetchCurrentView() {
        this.setState({ isFetching: true });

        let url;
        if (this.state.currentCategoryName) {
            url = "/api/board/category/" + this.state.currentCategoryName;
        } else {
            url = "/api/board";
        }


        if (this.state.currentFilter !== null && this.state.currentFilter !== "") {
            url += "?filter=" + this.state.currentFilter;
        }

        return fetch(url)
            .then(res => res.json())
            .then((data) => {
                this.setState({ currentBoardViewData: data, isFetching: false });
            });
    }

    setBoardName(name) {
        return fetch("/api/board/name", {
            method: "PUT",
            headers: {
                "Content-Type": "text/plain",
            },
            body: name,
        });
    }

    addCard() {
        return fetch("/api/board/cards", {
            method: "POST",
        });
    }

    deleteCard(cardId) {
        return fetch("/api/board/cards/" + cardId, {
            method: "DELETE",
        });
    }

    setCardText(cardId, text) {
        return fetch("/api/board/cards/" + cardId + "/text", {
            method: "PUT",
            headers: {
                "Content-Type": "text/plain",
            },
            body: text,
        });
    }

    addCardTag(cardId, tag) {
        return fetch("/api/board/cards/" + cardId + "/tags/" + tag, {
            method: "PUT",
        });
    }

    deleteCardTag(cardId, tag) {
        return fetch("/api/board/cards/" + cardId + "/tags/" + tag, {
            method: "DELETE",
        });
    }

    // ---

    onSetDefaultView() {
        this.setState({ currentCategoryName: null }, this.fetchCurrentView);
    }

    onSetCategoryView(categoryName) {
        this.setState({ currentCategoryName: categoryName }, this.fetchCurrentView);
    }

    onSetFilter(filter) {
        this.setState({ currentFilter: filter }, this.fetchCurrentView);
    }

    // ---

    onSetBoardName(name) {
        console.log("Setting board name to '" + name + "'");

        this.setBoardName(name)
        .finally(this.fetchCurrentView);
    }

    onAddCard(text, tags) {
        console.log("Adding card");

        let cardIdPromise = this.addCard()
        .then((response) => response.text());

        let textPromise = cardIdPromise
        .then((cardId) => {
            if (text) {
                return this.setCardText(cardId, text);
            }
        });

        let tagsPromise = cardIdPromise
        .then((cardId) => {
            if (tags) {
                return Promise.allSettled(
                    tags.map((tag) => this.addCardTag(cardId, tag))
                );
            }
        })

        Promise.allSettled([textPromise, tagsPromise])
        .finally(this.fetchCurrentView);
    }

    onDeleteCard(cardId) {
        console.log("Deleting card " + cardId);

        this.deleteCard(cardId)
        .finally(this.fetchCurrentView);
    }

    onSetCardText(cardId, text) {
        console.log("Setting card " + cardId + "'s text to '" + text + "'");

        this.setCardText(cardId, text)
        .finally(this.fetchCurrentView);
    }

    onAddCardTag(cardId, tag) {
        console.log("Adding tag '" + tag + "' to card " + cardId);

        this.addCardTag(cardId, tag)
        .finally(this.fetchCurrentView);
    }

    onDeleteCardTag(cardId, tag) {
        console.log("Deleting tag '" + tag + "' from card " + cardId);

        this.deleteCardTag(cardId, tag)
        .finally(this.fetchCurrentView);
    }

    onUpdateCardTag(cardId, oldTag, newTag) {
        console.log("Updating tag '" + oldTag + "' to '" + newTag + "' on card " + cardId);

        return this.addCardTag(cardId, newTag)
        .then((response) => {
            if (response.ok) {
                return this.deleteCardTag(cardId, oldTag);
            } else {
                return Promise.reject("Adding card tag while updating failed");
            }
        })
        .finally(this.fetchCurrentView);
    }

    // ---

    render() {
        return (<div>
            <Board
                boardViewData={this.state.currentBoardViewData}
                isFetching={this.state.isFetching}

                actions={{
                    onSetDefaultView: this.onSetDefaultView,
                    onSetCategoryView: this.onSetCategoryView,
                    onSetFilter: this.onSetFilter,

                    onSetBoardName: this.onSetBoardName,

                    onAddCard: this.onAddCard,
                    onDeleteCard: this.onDeleteCard,

                    onSetCardText: this.onSetCardText,
                    onAddCardTag: this.onAddCardTag,
                    onDeleteCardTag: this.onDeleteCardTag,
                    onUpdateCardTag: this.onUpdateCardTag,
                }}
                />
        </div>);
    }
}

export default App;

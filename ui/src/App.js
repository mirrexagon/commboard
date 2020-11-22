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
            url = "/board/category/" + this.state.currentCategoryName;
        } else {
            url = "/board";
        }


        if (this.state.currentFilter !== null && this.state.currentFilter !== "") {
            url += "?filter=" + this.state.currentFilter;
        }

        return fetch(url)
            .then(res => res.json())
            .then((data) => {
                this.setState({ currentBoardViewData: data, isFetching: false });
            })
            .catch(console.log);
    }

    // ---

    onSetDefaultView() {
        this.setState({ currentCategoryName: null }, () => this.fetchCurrentView());
    }

    onSetCategoryView(categoryName) {
        this.setState({ currentCategoryName: categoryName }, () => this.fetchCurrentView());
    }

    onSetFilter(filter) {
        this.setState({ currentFilter: filter }, () => this.fetchCurrentView());
    }

    // ---

    onSetBoardName(name) {
        return fetch("/board/name", {
            method: "PUT",
            headers: {
                "Content-Type": "text/plain",
            },
            body: name,
        })
        .then(this.fetchCurrentView)
        .catch(console.log);
    }

    onAddCard() {
        return fetch("/board/cards", {
            method: "POST",
        })
        .then(this.fetchCurrentView)
        .catch(console.log);
    }

    onDeleteCard(cardId) {
        return fetch("/board/cards/" + cardId, {
            method: "DELETE",
        })
        .then(this.fetchCurrentView)
        .catch(console.log);
    }

    onSetCardText(cardId, text) {
        return fetch("/board/cards/" + cardId + "/text", {
            method: "PUT",
            headers: {
                "Content-Type": "text/plain",
            },
            body: text,
        })
        .then(this.fetchCurrentView)
        .catch(console.log);
    }

    onAddCardTag(cardId, tag) {
        return fetch("/board/cards/" + cardId + "/tags/" + tag, {
            method: "PUT",
        })
        .then(this.fetchCurrentView)
        .catch(console.log);
    }

    onDeleteCardTag(cardId, tag) {
        return fetch("/board/cards/" + cardId + "/tags/" + tag, {
            method: "DELETE",
        })
        .then(this.fetchCurrentView)
        .catch(console.log);
    }

    onUpdateCardTag(cardId, oldTag, newTag) {
        this.onDeleteCardTag(cardId, oldTag)
        .then(() => this.onAddCardTag(cardId, newTag))
        .then(this.fetchCurrentView);
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

                    onSetCardText: this.props.onSetCardText,
                    onAddCardTag: this.props.onAddCardTag,
                    onDeleteCardTag: this.props.onDeleteCardTag,
                    onUpdateCardTag: this.props.onUpdateCardTag,
                }}

                />
        </div>);
    }
}

export default App;

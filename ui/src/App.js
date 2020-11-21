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
    }

    componentDidMount() {
        this.onSetDefaultView();
    }

    onSetDefaultView() {
        this.setState({ currentCategoryName: null }, () => this.fetchCurrentView());
    }

    onSetCategoryView(categoryName) {
        this.setState({ currentCategoryName: categoryName }, () => this.fetchCurrentView());
    }

    onSetFilter(filter) {
        this.setState({ currentFilter: filter }, () => this.fetchCurrentView());
    }

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

        fetch(url)
            .then(res => res.json())
            .then((data) => {
                this.setState({ currentBoardViewData: data, isFetching: false })
            })
            .catch(console.log);
    }

    render() {
        return (<div>
            <Board
                boardViewData={this.state.currentBoardViewData}
                isFetching={this.state.isFetching}
                onSetDefaultView={() => this.onSetDefaultView()}
                onSetCategoryView={(categoryName) => this.onSetCategoryView(categoryName)}
                onSetFilter={(filter) => this.onSetFilter(filter)}
                />
        </div>);
    }
}

export default App;

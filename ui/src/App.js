import React from 'react';
import PropTypes from 'prop-types';
import './App.css';

import Board from './Board.js';

class App extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            currentBoardViewData: null,
            isFetching: false,
        };
    }

    componentDidMount() {
        this.onSetDefaultView();
    }

    onSetDefaultView() {
        this.setState({ isFetching: true });

        fetch('http://localhost:8000/board')
        .then(res => res.json())
        .then((data) => {
            this.setState({ currentBoardViewData: data, isFetching: false })
        })
        .catch(console.log);
    }

    onSetCategoryView(categoryName) {
        this.setState({ isFetching: true });

        fetch('http://localhost:8000/board/category/' + categoryName)
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
                />
        </div>);
    }
}

export default App;

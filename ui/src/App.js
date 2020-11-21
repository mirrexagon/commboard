import React from 'react';
import PropTypes from 'prop-types';
import './App.css';

import Board from './Board.js';

class App extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            currentBoardViewData: null,
        };
    }

    componentDidMount() {
        this.onSetDefaultView();
    }

    onSetDefaultView() {
        fetch('http://localhost:8000/board')
        .then(res => res.json())
        .then((data) => {
            this.setState({ currentBoardViewData: data })
        })
        .catch(console.log);
    }

    onSetCategoryView(categoryName) {
        fetch('http://localhost:8000/board/category/' + categoryName)
        .then(res => res.json())
        .then((data) => {
            this.setState({ currentBoardViewData: data })
        })
        .catch(console.log);
    }

    render() {
        return (<div>
            <Board
                boardViewData={this.state.currentBoardViewData}
                onSetDefaultView={() => this.onSetDefaultView()}
                onSetCategoryView={() => this.onSetCategoryView()}
                />
        </div>);
    }
}

export default App;

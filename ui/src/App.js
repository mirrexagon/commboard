import React from 'react';
import PropTypes from 'prop-types';
import styles from './App.css';

import MainPanel from './MainPanel.js';
import BoardViewDefault from './BoardViewDefault.js';

class App extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            currentBoardView: null
        };
    }

    componentDidMount() {
        fetch('http://localhost:8000/boards')
        .then(res => res.json())
        .then((data) => {
              this.setState({ boards: data })
        })
        .catch(console.log);
    }

    render() {
        return (<div>
            <MainPanel boardView={this.state.currentBoardView} />
        </div>);
    }
}

export default App;

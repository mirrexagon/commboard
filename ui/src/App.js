import React from 'react';
import styles from './App.css';

import BoardViewDefault from './BoardViewDefault.js'

class App extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        return <BoardViewDefault />;
    }
}

export default App;

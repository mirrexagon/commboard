import React from 'react';
import PropTypes from 'prop-types';
import styles from './App.css';

import Card from './Card.js';
import BoardViewDefault from './BoardViewDefault.js';

class App extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        return <BoardViewDefault />;
    }
}

export default App;

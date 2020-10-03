import React from 'react';
import PropTypes from 'prop-types';
import styles from './BoardViewDefault.css';

import Card from './Card.js';

class BoardViewDefault extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            boardViewDefault: null,
        };
    }

    componentDidMount() {
        fetch('http://localhost:8000/boards/0')
        .then(res => res.json())
        .then((data) => {
              this.setState({ boardViewDefault: data })
        })
        .catch(console.log);
    }

    render() {
        const card = this.state.boardViewDefault.board.cards[0];
        return <Card text={card.text} tags={card.tags} />;
    }
}

export default BoardViewDefault;

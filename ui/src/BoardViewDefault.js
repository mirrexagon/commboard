import React from 'react';
import PropTypes from 'prop-types';
import styles from './BoardViewDefault.css';

import CardColumn from './CardColumn.js';

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
        if (this.state.boardViewDefault) {
            const cards = this.state.boardViewDefault.default_card_order
                .map((cardId) => this.state.boardViewDefault.board.cards[cardId]);

            return <CardColumn cards={cards} />
        } else {
            return null;
        }
    }
}

export default BoardViewDefault;

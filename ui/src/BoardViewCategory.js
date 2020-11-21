import React from 'react';
import PropTypes from 'prop-types';
import styles from './BoardViewCategory.css';

import CardColumn from './CardColumn.js';

class BoardViewCategory extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            boardViewCategory: null,
        };
    }

    componentDidMount() {
        fetch('http://localhost:8000/boards/0')
        .then(res => res.json())
        .then((data) => {
              this.setState({ boardViewCategory: data })
        })
        .catch(console.log);
    }

    render() {
        if (this.state.boardViewCategory) {
            const cards = this.state.boardViewCategory.default_card_order
                .map((cardId) => this.state.boardViewCategory.board.cards[cardId]);

            return <CardColumn cards={cards} />
        } else {
            return null;
        }
    }
}

export default BoardViewCategory;

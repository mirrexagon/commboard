import React from 'react';
import PropTypes from 'prop-types';
import './BoardViewDefault.css';

import CardColumn from './CardColumn.js';

class BoardViewDefault extends React.Component {
    render() {
        const cards = this.props.viewData.default_view
            .map((cardId) => this.props.viewData.board.cards[cardId]);

        return <CardColumn
            cards={cards}
            actions={this.props.actions}
            />;
    }
}

BoardViewDefault.propTypes = {
    viewData: PropTypes.object.isRequired,
    actions: PropTypes.object.isRequired,
};

export default BoardViewDefault;

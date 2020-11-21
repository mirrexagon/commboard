import React from 'react';
import PropTypes from 'prop-types';

import BoardViewDefault from './BoardViewDefault.js';
import BoardViewCategory from './BoardViewCategory.js';

class BoardPanel extends React.Component {
    render() {
        return null;
    }
}

class Board extends React.Component {
    render() {
        let boardView = null;

        if (this.props.boardViewData) {
            if (this.props.boardViewData.default_view) {
                boardView = <BoardViewDefault viewData={this.props.boardViewData} />;
            } else if (this.props.boardViewData.category_view) {
                boardView = <BoardViewCategory viewData={this.props.boardViewData} />;
            } else {
                console.log("Board view is not default or category");
            }
        }

        return (<div>
            <BoardPanel />
            {boardView}
        </div>);
    }
}

Board.propTypes = {
    boardViewData: PropTypes.object,
    onSetDefaultView: PropTypes.func.isRequired,
    onSetCategoryView: PropTypes.func.isRequired,
};

export default Board;

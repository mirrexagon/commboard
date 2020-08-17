import React from 'react';
import styles from './BoardViewDefault.css';

class BoardViewDefault extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            boardView: null,
        };
    }

    componentDidMount() {
        fetch('http://localhost:8000/boards/0')
        .then(res => res.text())
        .then((data) => {
              this.setState({ boardView: data })
        })
        .catch(console.log);
    }

    render() {
        return <code>{this.state.boardView}</code>;
    }
}

export default BoardViewDefault

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
        fetch('localhost:8000/boards/0')
        .then(res => res.json())
        .then((data) => {
              this.setState({ boardView: data })
        })
        .catch(console.log);
    }

    render() {
    }
}

export default BoardViewDefault

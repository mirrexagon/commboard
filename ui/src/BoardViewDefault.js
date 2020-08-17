import React from 'react';
import styles from './BoardViewDefault.css';

class BoardViewDefault extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            date: new Date()
        };
    }

    componentDidMount() {
        fetch('localhost:8000/boards/0')
        .then(res => res.json())
        .then((data) => {
              this.setState({ contacts: data })
        })
        .catch(console.log);
    }

    render() {
    }
}

export default BoardViewDefault

import React from 'react';
import PropTypes from 'prop-types';
import styles from './Tag.css';

class Tag extends React.Component {
    render() {
        return <p>{"Tag"}</p>;
    }


}

Tag.propTypes = {
    tag: PropTypes.string,
};

export default Tag;

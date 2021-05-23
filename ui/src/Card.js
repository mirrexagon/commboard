import React, { useState } from "react";
import "./Card.css";

const Tag = (props) => {
    return props.tagString;
}

const Text = (props) => {
    return (
        <div className="card-text">
            {props.text}
        </div>
    );
}

const Card = (props) => {
    const tags = props.tags.map((tagString) => (
        <li className="card-tag" key={tagString}>
            <Tag tagString={tagString} />
        </li>
    ));

    return (
        <div className={`card-container ${props.selected ? "card-container-selected" : ""}`}>
            <Text
                text={props.text}
                />

            <ul className="card-tag-list">{tags}</ul>
        </div>
    );
}

export default Card;

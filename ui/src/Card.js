import React, { useState, useEffect, useRef } from "react";
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
    // Scroll this card into view if it is selected.
    const scrollRef = useRef(null);
    useEffect(() => {
        if (props.selected) {
            scrollRef.current.scrollIntoView({ block: "nearest" });
        }
    }, [props.selected]);

    const tags = props.tags.map((tagString) => (
        <li className="card-tag" key={tagString}>
            <Tag tagString={tagString} />
        </li>
    ));

    return (
        <div ref={scrollRef} className={`card-container ${props.selected ? "card-container-selected" : ""}`}>
            <p>{props.id}</p>
            <Text
                text={props.text}
                />

            <ul className="card-tag-list">{tags}</ul>
        </div>
    );
}

export default Card;

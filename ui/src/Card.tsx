import React, { useState, useEffect, useRef } from "react";
import "./Card.css";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import TagList from "./TagList";

const Text = (props) => {
    return (
        <div className="card-text">
            <p>{props.text}</p>
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

    return (
        <div ref={scrollRef} className={`card-container ${props.selected ? "card-container-selected" : ""}`}>
            <p>{props.id}</p>

            <Text text={props.text} />
            <TagList tags={props.tags} />
        </div>
    );
}

export default Card;

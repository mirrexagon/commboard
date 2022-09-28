import React, { FC, useEffect, useRef } from "react";
import "./Card.css";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import * as API from "./ApiTypes";

import TagList from "./TagList";

interface TextProps {
    text: string;
}

const Text: FC<TextProps> = (props) => {
    return (
        <div className="card-text">
            <p>{props.text}</p>
        </div>
    );
};

interface CardProps {
    id: API.CardId;
    text: string;
    tags: API.Tag[];
    selected: boolean;
}

const Card: FC<CardProps> = (props) => {
    // Scroll this card into view if it is selected.
    const scrollRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (scrollRef.current && props.selected) {
            scrollRef.current.scrollIntoView({ block: "nearest" });
        }
    }, [props.selected]);

    return (
        <div
            ref={scrollRef}
            className={`card-container ${
                props.selected ? "card-container-selected" : ""
            }`}
        >
            <p>{props.id}</p>

            <Text text={props.text} />
            <TagList tags={props.tags} />
        </div>
    );
};

export default Card;

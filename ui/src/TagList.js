import React from "react";
import "./TagList.css";

const Tag = (props) => {
    return props.tagString;
}

const TagList = (props) => {
    const tagElements = props.tags.map((tagString) => (
        <li className="card-tag" key={tagString}>
            <Tag tagString={tagString} />
        </li>
    ));

    return <ul className="card-tag-list">{tagElements}</ul>;
};

export default TagList;

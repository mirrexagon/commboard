import React, { FC } from "react";
import "./TagList.css";

interface TagProps {
    tagString: string;
}

const Tag: FC<TagProps> = (props) => {
    return <p>{props.tagString}</p>;
};

interface TagListProps {
    tags: string[];
}

const TagList: FC<TagListProps> = (props) => {
    const tagElements = props.tags.map((tagString) => (
        <li className="card-tag" key={tagString}>
            <Tag tagString={tagString} />
        </li>
    ));

    return <ul className="card-tag-list">{tagElements}</ul>;
};

export default TagList;

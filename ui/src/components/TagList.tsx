import type { Component } from "solid-js";
import { For } from "solid-js";

import styles from "./TagList.module.css";

interface TagProps {
    tagString: string;
}

const Tag: Component<TagProps> = (props) => {
    return <p>{props.tagString}</p>;
};

interface TagListProps {
    tags: string[];
}

const TagList: Component<TagListProps> = (props) => {
    return (
        <ul class={styles.cardTagList}>
            <For each={props.tags}>
                {(tagString, i) => (
                    <li class={styles.cardTag}>
                        <Tag tagString={tagString} />
                    </li>
                )}
            </For>
        </ul>
    );
};

export default TagList;

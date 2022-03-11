import React, { FC, useState, useEffect, useRef } from "react";
import "./Selector.css";

interface SelectorProps {
    inputRef: React.MutableRefObject<HTMLInputElement | null>;
    visible: boolean;
    value: string;
    suggestions: string[];
    onChange: React.ChangeEventHandler<HTMLInputElement>;
}

const Selector: FC<SelectorProps> = (props) => {
    const filteredSuggestions = props.suggestions.filter((s) =>
        s.includes(props.value)
    );

    return (
        <div
            className="selector-fullscreen-container"
            style={{ visibility: props.visible ? "visible" : "hidden" }}
        >
            <div className="selector">
                <input
                    ref={props.inputRef}
                    className="selector-text"
                    value={props.value}
                    onChange={props.onChange}
                />

                <ul className="selector-suggestions">
                    {filteredSuggestions.map((s) => (
                        <li key={s} className="selector-suggestion">
                            {s}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default Selector;

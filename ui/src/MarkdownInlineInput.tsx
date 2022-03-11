import React, { useState, useEffect, useRef } from "react";
import "./MarkdownInlineInput.css";

import ReactMarkdown from "react-markdown";

import useKeyPress from "./useKeyPress";
import useClickOnOutside from "./useClickOnOutside";

function MarkdownInlineInput(props) {
    const [isInputActive, setIsInputActive] = useState(false);
    const [inputValue, setInputValue] = useState(props.markdown);

    const wrapperRef = useRef(null);
    const textareaRef = useRef(null);

    const esc = useKeyPress("Escape");

    // Focus cursor in the textarea on edit start.
    useEffect(() => {
        if (isInputActive) {
            textareaRef.current.focus();
        }
    }, [isInputActive]);

    useClickOnOutside(wrapperRef, () => {
        if (isInputActive) {
            props.onChange(inputValue);
            setIsInputActive(false);
        }
    });

    useEffect(() => {
        if (isInputActive) {
            if (esc) {
                props.onChange(inputValue);
                setIsInputActive(false);
            }
        }
    }, [esc]);

    return (
        <span className="markdown-inline-input" ref={wrapperRef}>
            <span
                className={`markdown-inline-input_copy markdown-inline-input_copy--${isInputActive ? "hidden" : "active"}`}
                onClick={() => setIsInputActive(true)}
            >
                <ReactMarkdown children={props.markdown} />
            </span>

            <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className={`markdown-inline-input_textarea markdown-inline-input_textarea--${isInputActive ? "active" : "hidden"}`}
                ref={textareaRef}
                />
        </span>
    );
}

export default MarkdownInlineInput;

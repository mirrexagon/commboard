import React, { useState, useEffect, useRef } from "react";
import "./Selector.css";

const Selector = (props) => {
    const filteredSuggestions = props.suggestions.filter(s => s.includes(props.value));

    return (
        <div className="selector-fullscreen-container">
            <div className="selector" style={{visibility: props.visible ? 'visible' : 'hidden' }}>
                <input ref={props.inputRef} className="selector-text" value={props.value} onChange={props.onChange} />

                <ul className="selector-suggestions">
                    {filteredSuggestions.map(s => <li key={s} className="selector-suggestion">{s}</li>)}
                </ul>
            </div>
        </div>
    );
};

export default Selector;

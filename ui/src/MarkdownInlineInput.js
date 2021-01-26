import React, { useState } from "react";
import ReactMarkdown from "react-markdown";

function MarkdownInlineInput(props) {
    return <ReactMarkdown children={props.markdown} />;
}

export default MarkdownInlineInput;

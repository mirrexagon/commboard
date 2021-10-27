import React, { useState, useEffect, useRef } from "react";
import "./CardFull.css";

const CardFull = (props) => {
    return (
        <div className="card-full">
            <div className="card-full-content">
                <h3>{props.card.id}</h3>
                <p>{props.card.text}</p>
            </div>
        </div>
    );
}

export default CardFull;

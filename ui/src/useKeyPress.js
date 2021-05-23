import { useState, useEffect } from "react";

function useKeyPress(targetKey, downAction) {
    let keyPressed = false;

    useEffect(() => {
        const onKeyDown = ({ key }) => {
            if (key === targetKey) {
                if (!keyPressed) {
                    downAction();
                }

                keyPressed = true;
            }
        };

        const onKeyUp = ({ key }) => {
            if (key === targetKey) {
                keyPressed = false;
            }
        };

        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("keyup", onKeyUp);

        return () => {
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("keyup", onKeyUp);
        };
    }, []);
}

export default useKeyPress;

import { useState, useEffect } from "react";

function useKeyPress(targetKey, downAction) {
    const [keyPressed, setKeyPressed] = useState(false);

    useEffect(() => {
        const onKeyDown = ({ key }) => {
            if (key === targetKey) {
                setKeyPressed(true);
            }
        };

        const onKeyUp = ({ key }) => {
            if (key === targetKey) {
                setKeyPressed(false);
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

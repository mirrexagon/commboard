import React from "react";
import { useGet, usePost } from "restful-react";

import Board from "./Board.js";

const App = () => {
    const { data: appState } = useGet({
        path: "/api/state"
    });

    if (appState) {
        return (
            <div>
                <Board
                    appState={appState}
                />
            </div>
        );
    } else {
        return "Loading...";
    }
};

export default App;

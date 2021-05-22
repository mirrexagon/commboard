import React from "react";
import { useGet, usePost } from "restful-react";

import Board from "./Board.js";

const App = () => {
    const { data: appState } = useGet({
        path: "/api/state"
    });

    return (
        <div>
            <Board
                appState={appState}
            />
        </div>
    );
};

export default App;

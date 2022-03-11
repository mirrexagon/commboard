const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
    entry: "./src/index.tsx",

    output: {
        path: path.resolve(__dirname, "./dist"),
        filename: "bundle.js",
    },

    module: {
        rules: [
            {
                test: /\.tsx?$/,
                exclude: /node_modules/,
                use: ["ts-loader"],
            },
            {
                test: /\.css$/,
                use: ["style-loader", "css-loader"],
            },
        ],
    },

    resolve: {
        extensions: [".ts", ".tsx", "..."],
    },

    devtool: "inline-source-map",

    devServer: {
        static: {
            directory: path.join(__dirname, "dist"),
        },
        proxy: {
            "/api": {
                target: "http://localhost:8000",
            },
        },
    },

    plugins: [
        new HtmlWebpackPlugin({
            template: path.join(__dirname, "public/index.html"),
        }),
    ],
};

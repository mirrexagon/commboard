import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";

export default defineConfig({
    plugins: [solidPlugin()],
    server: {
        port: 3000,
        proxy: {
            "/api": "http://localhost:8000",
        },
    },
    build: {
        target: "esnext",
        rollupOptions: {
            output: {
                inlineDynamicImports: true,
                entryFileNames: "[name].js", // currently does not work for the legacy bundle
                assetFileNames: "[name].[ext]", // currently does not work for images
            },
        },
    },
    css: {
        modules: {
            localsConvention: "camelCaseOnly",
        },
    },
});

import { defineConfig } from "eslint/config";
import js from "@eslint/js";
import globals from "globals";

export default defineConfig([
    {
        ignores: ["dist/**", "node_modules/**"]
    },
    {
        files: ["**/*.js", "**/*.mjs"],
        plugins: { js },
        extends: ["js/recommended"],
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node
            }
        },
        rules: {
            "no-unused-vars": ["error", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }]
        }
    }
]);

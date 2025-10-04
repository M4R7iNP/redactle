import { defineConfig } from 'eslint/config';
import js from '@eslint/js';
import globals from 'globals';
// @ts-ignore
import pluginSecurity from 'eslint-plugin-security';

export default defineConfig([
    // @ts-ignore
    pluginSecurity.configs.recommended,
    {
        files: ['src/**/*.js'],
        plugins: { js },
        extends: ['js/recommended'],
        languageOptions: { globals: globals.node },
    },
    {
        files: ['js/**/*.js'],
        plugins: { js },
        extends: ['js/recommended'],
        languageOptions: { globals: globals.browser },
    },
]);

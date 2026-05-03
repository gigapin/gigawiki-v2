const tsPlugin = require("@typescript-eslint/eslint-plugin");
const tsParser = require("@typescript-eslint/parser");
const importPlugin = require("eslint-plugin-import");

module.exports = [
  tsPlugin.configs["flat/eslint-recommended"],
  ...tsPlugin.configs["flat/recommended"],
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: [
          "./tsconfig.base.json",
          "./apps/*/tsconfig.json",
          "./packages/*/tsconfig.json",
        ],
        tsconfigRootDir: __dirname,
      },
    },
    plugins: {
      import: importPlugin,
    },
    rules: {
      "no-console": "warn",
      "import/order": [
        "warn",
        {
          groups: ["builtin", "external", "internal", "parent", "sibling", "index"],
          "newlines-between": "always",
        },
      ],
    },
  },
  {
    ignores: ["**/node_modules/**", "**/dist/**"],
  },
];

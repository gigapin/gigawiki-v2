const tsPlugin = require("@typescript-eslint/eslint-plugin");
const tsParser = require("@typescript-eslint/parser");
const importPlugin = require("eslint-plugin-import");
const reactHooksPlugin = require("eslint-plugin-react-hooks");

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
      "react-hooks": reactHooksPlugin,
    },
    rules: {
      "no-console": "warn",
      // Only the two classic hook rules. The plugin's `recommended` preset also
      // pulls in the React Compiler rules (immutability, set-state-in-effect),
      // which would impose a new policy on existing code.
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      // A leading underscore marks an intentionally unused binding — the
      // convention is already used in both apps (e.g. `(instance, _, done)`).
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
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

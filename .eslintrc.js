/** @type {import('eslint').Linter.Config} */
const config = {
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "tsconfig.json",
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "plugin:jest/recommended",
    "prettier",
  ],
  ignorePatterns: ["dist/**/*", "!.babelrc.js"],
  rules: {
    "@typescript-eslint/no-unused-vars": [
      "warn",
      {
        varsIgnorePattern: "^_",
        argsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      },
    ],
  },
  overrides: [
    {
      files: [".eslintrc.js", ".babelrc.js", "jest.config.js"],
      env: {
        node: true,
      },
    },
  ],
};

module.exports = config;

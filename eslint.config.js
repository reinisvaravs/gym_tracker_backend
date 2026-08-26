import js from "@eslint/js";
import importPlugin from "eslint-plugin-import";
import nPlugin from "eslint-plugin-n";
import securityPlugin from "eslint-plugin-security";
import globals from "globals";

export default [
  { ignores: ["node_modules/**", "dist/**", "build/**"] },
  js.configs.recommended,
  {
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.node },
    },
    plugins: {
      import: importPlugin,
      n: nPlugin,
      security: securityPlugin,
    },
    settings: {
      "import/resolver": { node: true },
    },
    rules: {
      curly: ["error", "all"],
      eqeqeq: ["error", "smart"],
      "no-console": ["error", { allow: ["warn", "error", "log", "info"] }],
      "no-implicit-coercion": "error",
      "object-shorthand": ["error", "always"],
      "prefer-const": "error",
      "no-empty": ["error", { allowEmptyCatch: true }],
      "no-redeclare": "error",
      "no-shadow": "error",
      "no-undef": "error",
      "no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      "import/order": [
        "error",
        {
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
      "import/no-unresolved": "error",
      "n/no-missing-import": "off",
      "n/no-unsupported-features/es-syntax": "off",
      "security/detect-object-injection": "off",
      "security/detect-non-literal-fs-filename": "off",
      "security/detect-non-literal-regexp": "off",
      "security/detect-possible-timing-attacks": "off",
    },
  },
];

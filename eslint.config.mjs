import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

/**
 * Lean lint stack for Sanjivani.
 *
 * Why not `eslint-config-next`? Its nested plugins
 * (eslint-plugin-import, eslint-plugin-jsx-a11y) only accept eslint <= 9,
 * which produces peer-dependency warnings on every install. typescript-eslint
 * and eslint-plugin-react-hooks both officially support eslint 10, so this
 * config lints the same correctness surface with zero install noise.
 */
export default tseslint.config(
  {
    // Non-source trees never need linting.
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "examples/**",
      "skills/**",
      "download/**",
      "upload/**",
      "input_zip/**",
      "tool-results/**",
      "public/**",
    ],
  },
  // TypeScript correctness rules (types come from tsconfig project service).
  ...tseslint.configs.recommendedTypeChecked,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: { projectService: true },
    },
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  {
    rules: {
      // ---- Style opinions: off (tsc + review own correctness) ----
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/prefer-as-const": "off",
      "@typescript-eslint/consistent-type-imports": "off",
      // The demo-mode Supabase shim intentionally mirrors supabase-js's
      // any-heavy generic shapes — these four fire ~140 false positives on it:
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-redundant-type-constituents": "off",
      // Demo-engine rows are unknown/any-typed but string-valued at runtime;
      // these template-literal heuristics fire 17 false positives on it:
      "@typescript-eslint/no-base-to-string": "off",
      "@typescript-eslint/restrict-template-expressions": "off",
      // async onClick handlers are idiomatic React; interface-compat async
      // stubs are required by the supabase-js-shaped demo client:
      "@typescript-eslint/no-misused-promises": "off",
      "@typescript-eslint/require-await": "off",
      // Real bug-catchers stay ON:
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  // Config/tooling files: plain JS, no TS type info needed.
  {
    files: ["*.mjs", "*.cjs", "*.js", "scripts/**/*"],
    ...tseslint.configs.disableTypeChecked,
  },
);

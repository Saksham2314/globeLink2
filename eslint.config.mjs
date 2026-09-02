import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "next-env.d.ts",
      "prisma/migrations/**",
      "coverage/**",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),

  {
    // Structural guarantee for the architecture rule "the AI layer never
    // touches the database": src/ai calls domain services only. Persistence
    // (e.g. AgentToolCall) goes through a service in src/modules.
    files: ["src/ai/**/*.{ts,tsx}"],
    ignores: ["src/ai/**/*.test.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "@/lib/db", message: "src/ai must not import the database. Call a service in src/modules." },
            { name: "@prisma/client", message: "src/ai must not depend on Prisma directly. Use service DTOs/types from src/modules." },
          ],
          patterns: [
            { group: ["@/lib/db", "**/lib/db"], message: "src/ai must not import the database. Call a service in src/modules." },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;

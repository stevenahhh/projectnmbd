import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // vercel 배포 산물
    ".vercel/**",
    "deck/**",
    "devlog/**",
  ]),
  {
    // 브라우저 기본 대화상자는 탭을 멈추고 모양을 못 바꾼다 — toast 나 ConfirmDialog 를 쓴다
    rules: { "no-alert": "error" },
  },
]);

export default eslintConfig;

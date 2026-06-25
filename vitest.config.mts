import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import tsconfigPaths from "vite-tsconfig-paths"

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/tests/setup.ts"],
    coverage: {
      provider: "istanbul",
      reporter: ["text", "text-summary", "html", "lcov"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/tests/**",
        "src/app/layout.tsx",
        "src/components/features/hero-scene.tsx", // Canvas WebGL / three.js — non testable avec jsdom
        "src/**/*.d.ts",
        "src/lib/llm/types.ts", // Types-only, pas de code runtime
        "src/lib/rag/types.ts", // Types-only, pas de code runtime
        "src/lib/rag/index.ts", // Re-exports uniquement
      ],
      thresholds: {
        lines: 95,
        functions: 95,
        branches: 95,
        statements: 95,
      },
    },
  },
})

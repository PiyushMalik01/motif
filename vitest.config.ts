import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  test: {
    projects: [
      // Node environment for pure core modules (no DOM/React).
      {
        test: {
          name: "node",
          environment: "node",
          include: ["src/core/**/*.test.ts"],
        },
      },
      // jsdom environment for overlay components and browser integration tests.
      {
        plugins: [react()],
        test: {
          name: "jsdom",
          environment: "jsdom",
          include: ["src/overlay/**/*.test.tsx", "src/**/*.browser.test.tsx"],
          setupFiles: [],
        },
      },
    ],
  },
});

import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@/lib": path.resolve(__dirname, "./src/shared/lib"),
      "@/components": path.resolve(__dirname, "./src/shared/components"),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});

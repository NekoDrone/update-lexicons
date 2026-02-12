import { defineConfig } from "tsdown";

export default defineConfig({
    entry: ["src/index.ts"],
    outDir: "dist",
    format: "cjs",
    target: "node20",
    clean: true,
    external: [],
});

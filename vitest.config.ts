import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        globals: true,
        environment: "node",
        include: ["tests/**/*.test.ts"],
        coverage: {
            provider: "v8",
            reporter: ["text", "html"],
            include: ["src/**/*.ts"],
            exclude: ["src/**/*.test.ts", "tests/**"],
            thresholds: {
                lines: 80,
                statements: 80,
                functions: 80,
                branches: 75,
            },
        },
    },
});

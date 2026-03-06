import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { setupSigintHandler } from "../../src/lib/sigint.js";
import type { ThemeMessages } from "../../src/types/index.js";

const messages = {
    warnings: { cancel: "Operation cancelled" },
} as ThemeMessages;

describe("setupSigintHandler", () => {
    let removeHandler: () => void = () => {};

    beforeEach(() => {
        vi.spyOn(process, "exit").mockImplementation((() => {}) as never);
        vi.spyOn(process.stderr, "write").mockImplementation(() => true);
        vi.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        removeHandler();
        vi.restoreAllMocks();
    });

    it("registers SIGINT handler on process", () => {
        const processOnSpy = vi.spyOn(process, "on");

        removeHandler = setupSigintHandler(messages);

        expect(processOnSpy).toHaveBeenCalledWith("SIGINT", expect.any(Function));
    });

    it("returns a function", () => {
        removeHandler = setupSigintHandler(messages);

        expect(typeof removeHandler).toBe("function");
    });

    it("calls cleanup callback when SIGINT fires", () => {
        const cleanup = vi.fn();
        const processOnSpy = vi.spyOn(process, "on");

        removeHandler = setupSigintHandler(messages, cleanup);

        // Extract the registered handler and call it directly
        const handler = processOnSpy.mock.calls.find(
            (call) => call[0] === "SIGINT"
        )![1] as () => void;
        handler();

        expect(cleanup).toHaveBeenCalledOnce();
    });

    it("does not crash without cleanup callback", () => {
        const processOnSpy = vi.spyOn(process, "on");

        removeHandler = setupSigintHandler(messages);

        const handler = processOnSpy.mock.calls.find(
            (call) => call[0] === "SIGINT"
        )![1] as () => void;

        // Should not throw — cleanup?.() handles undefined
        expect(() => handler()).not.toThrow();
    });

    it("writes newline to stderr when SIGINT fires", () => {
        const processOnSpy = vi.spyOn(process, "on");

        removeHandler = setupSigintHandler(messages);

        const handler = processOnSpy.mock.calls.find(
            (call) => call[0] === "SIGINT"
        )![1] as () => void;
        handler();

        expect(process.stderr.write).toHaveBeenCalledWith("\n");
    });

    it("logs cancel message when SIGINT fires", () => {
        const processOnSpy = vi.spyOn(process, "on");

        removeHandler = setupSigintHandler(messages);

        const handler = processOnSpy.mock.calls.find(
            (call) => call[0] === "SIGINT"
        )![1] as () => void;
        handler();

        expect(console.error).toHaveBeenCalledWith(
            expect.stringContaining("Operation cancelled")
        );
    });

    it("exits with code 0 when SIGINT fires", () => {
        const processOnSpy = vi.spyOn(process, "on");

        removeHandler = setupSigintHandler(messages);

        const handler = processOnSpy.mock.calls.find(
            (call) => call[0] === "SIGINT"
        )![1] as () => void;
        handler();

        expect(process.exit).toHaveBeenCalledWith(0);
    });

    it("deregisters handler when cleanup function is called", () => {
        const processOffSpy = vi.spyOn(process, "off");

        removeHandler = setupSigintHandler(messages);
        removeHandler();

        expect(processOffSpy).toHaveBeenCalledWith("SIGINT", expect.any(Function));
    });
});

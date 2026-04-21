import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
    isWideEmojiTerminal,
    normalizeVS16Spacing,
    resetTerminalCache,
} from "../../src/lib/terminal.js";

describe("terminal", () => {
    let originalTermProgram: string | undefined;

    beforeEach(() => {
        originalTermProgram = process.env.TERM_PROGRAM;
        resetTerminalCache();
    });

    afterEach(() => {
        if (originalTermProgram === undefined) {
            delete process.env.TERM_PROGRAM;
        } else {
            process.env.TERM_PROGRAM = originalTermProgram;
        }
        resetTerminalCache();
    });

    describe("isWideEmojiTerminal", () => {
        it("should return false when TERM_PROGRAM is vscode", () => {
            process.env.TERM_PROGRAM = "vscode";
            expect(isWideEmojiTerminal()).toBe(false);
        });

        it("should return true when TERM_PROGRAM is not set", () => {
            delete process.env.TERM_PROGRAM;
            expect(isWideEmojiTerminal()).toBe(true);
        });

        it("should return true for iTerm2", () => {
            process.env.TERM_PROGRAM = "iTerm.app";
            expect(isWideEmojiTerminal()).toBe(true);
        });

        it("should return true for Windows Terminal", () => {
            process.env.TERM_PROGRAM = "Windows_Terminal";
            expect(isWideEmojiTerminal()).toBe(true);
        });

        it("should cache result across calls", () => {
            delete process.env.TERM_PROGRAM;
            expect(isWideEmojiTerminal()).toBe(true);

            // Change env after cache is set - should still return cached value
            process.env.TERM_PROGRAM = "vscode";
            expect(isWideEmojiTerminal()).toBe(true);
        });

        it("should return fresh result after cache reset", () => {
            delete process.env.TERM_PROGRAM;
            expect(isWideEmojiTerminal()).toBe(true);

            resetTerminalCache();
            process.env.TERM_PROGRAM = "vscode";
            expect(isWideEmojiTerminal()).toBe(false);
        });
    });

    describe("normalizeVS16Spacing", () => {
        describe("on wide-emoji terminals", () => {
            beforeEach(() => {
                delete process.env.TERM_PROGRAM;
                resetTerminalCache();
            });

            it("should replace 2 spaces after VS16 emoji with 1 space", () => {
                expect(normalizeVS16Spacing("⚠️  hello")).toBe("⚠️ hello");
            });

            it("should handle multiple VS16 emojis in one string", () => {
                expect(normalizeVS16Spacing("⚠️  foo ⚙️  bar")).toBe("⚠️ foo ⚙️ bar");
            });

            it("should not affect strings without VS16 emojis", () => {
                expect(normalizeVS16Spacing("✨ hello")).toBe("✨ hello");
            });

            it("should keep 1 space for VS16 emoji on wide terminal", () => {
                expect(normalizeVS16Spacing("⚠️ hello")).toBe("⚠️ hello");
            });

            it("should normalize 3+ spaces after VS16 emoji to 1", () => {
                expect(normalizeVS16Spacing("⚠️   hello")).toBe("⚠️ hello");
            });

            it("should be idempotent", () => {
                const once = normalizeVS16Spacing("⚠️  hello");
                const twice = normalizeVS16Spacing(once);
                expect(twice).toBe(once);
            });

            it("should handle all 6 VS16 emojis in this codebase", () => {
                expect(normalizeVS16Spacing("⚠️  warn")).toBe("⚠️ warn");
                expect(normalizeVS16Spacing("⚙️  gear")).toBe("⚙️ gear");
                expect(normalizeVS16Spacing("♻️  recycle")).toBe("♻️ recycle");
                expect(normalizeVS16Spacing("⏭️  skip")).toBe("⏭️ skip");
                expect(normalizeVS16Spacing("👁️  eye")).toBe("👁️ eye");
                expect(normalizeVS16Spacing("🗑️  trash")).toBe("🗑️ trash");
            });

            it("should not affect strings with no emojis", () => {
                expect(normalizeVS16Spacing("plain text")).toBe("plain text");
            });

            it("should return empty string unchanged", () => {
                expect(normalizeVS16Spacing("")).toBe("");
            });
        });

        describe("on narrow-emoji terminals (VS Code)", () => {
            beforeEach(() => {
                process.env.TERM_PROGRAM = "vscode";
                resetTerminalCache();
            });

            it("should preserve 2 spaces after VS16 emoji", () => {
                expect(normalizeVS16Spacing("⚠️  hello")).toBe("⚠️  hello");
            });

            it("should preserve spacing for all VS16 emojis", () => {
                expect(normalizeVS16Spacing("⚙️  config")).toBe("⚙️  config");
                expect(normalizeVS16Spacing("👁️  show")).toBe("👁️  show");
            });

            it("should expand 1 space after VS16 emoji to 2", () => {
                expect(normalizeVS16Spacing("⚠️ hello")).toBe("⚠️  hello");
            });

            it("should normalize 3+ spaces after VS16 emoji to 2", () => {
                expect(normalizeVS16Spacing("⚠️   hello")).toBe("⚠️  hello");
            });

            it("should be idempotent", () => {
                const once = normalizeVS16Spacing("⚠️ hello");
                const twice = normalizeVS16Spacing(once);
                expect(twice).toBe(once);
            });

            it("should not affect VS16 emoji with no trailing space", () => {
                expect(normalizeVS16Spacing("\u26A0\uFE0F")).toBe("\u26A0\uFE0F");
            });
        });
    });
});

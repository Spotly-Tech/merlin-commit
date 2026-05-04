import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
    isWideEmojiTerminal,
    normalizeEmojiSpacing,
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

    describe("normalizeEmojiSpacing", () => {
        describe("on wide-emoji terminals", () => {
            beforeEach(() => {
                delete process.env.TERM_PROGRAM;
                resetTerminalCache();
            });

            it("should replace 2 spaces after VS16 emoji with 1 space", () => {
                expect(normalizeEmojiSpacing("⚠️  hello")).toBe("⚠️ hello");
            });

            it("should handle multiple VS16 emojis in one string", () => {
                expect(normalizeEmojiSpacing("⚠️  foo ⚙️  bar")).toBe("⚠️ foo ⚙️ bar");
            });

            it("should not affect strings without VS16 emojis", () => {
                expect(normalizeEmojiSpacing("✨ hello")).toBe("✨ hello");
            });

            it("should keep 1 space for VS16 emoji on wide terminal", () => {
                expect(normalizeEmojiSpacing("⚠️ hello")).toBe("⚠️ hello");
            });

            it("should normalize 3+ spaces after VS16 emoji to 1", () => {
                expect(normalizeEmojiSpacing("⚠️   hello")).toBe("⚠️ hello");
            });

            it("should be idempotent", () => {
                const once = normalizeEmojiSpacing("⚠️  hello");
                const twice = normalizeEmojiSpacing(once);
                expect(twice).toBe(once);
            });

            it("should handle all 6 VS16 emojis in this codebase", () => {
                expect(normalizeEmojiSpacing("⚠️  warn")).toBe("⚠️ warn");
                expect(normalizeEmojiSpacing("⚙️  gear")).toBe("⚙️ gear");
                expect(normalizeEmojiSpacing("♻️  recycle")).toBe("♻️ recycle");
                expect(normalizeEmojiSpacing("⏭️  skip")).toBe("⏭️ skip");
                expect(normalizeEmojiSpacing("👁️  eye")).toBe("👁️ eye");
                expect(normalizeEmojiSpacing("🗑️  trash")).toBe("🗑️ trash");
            });

            it("should not affect strings with no emojis", () => {
                expect(normalizeEmojiSpacing("plain text")).toBe("plain text");
            });

            it("should return empty string unchanged", () => {
                expect(normalizeEmojiSpacing("")).toBe("");
            });

            it("should replace 2 spaces after Unicode 13.0 emoji with 1 space", () => {
                expect(normalizeEmojiSpacing("🪄  Choose the type:")).toBe(
                    "🪄 Choose the type:"
                );
            });

            it("should normalize 3+ spaces after Unicode 13.0 emoji to 1", () => {
                expect(normalizeEmojiSpacing("🪄   Choose the type:")).toBe(
                    "🪄 Choose the type:"
                );
            });

            it("should keep 1 space for Unicode 13.0 emoji on wide terminal", () => {
                expect(normalizeEmojiSpacing("🪄 Choose the type:")).toBe(
                    "🪄 Choose the type:"
                );
            });

            it("should be idempotent for Unicode 13.0 emoji", () => {
                const once = normalizeEmojiSpacing("🪄  Choose the type:");
                const twice = normalizeEmojiSpacing(once);
                expect(twice).toBe(once);
            });

            it("should not affect Unicode 12.0 emoji in the same block", () => {
                expect(normalizeEmojiSpacing("🪂 text")).toBe("🪂 text");
            });
        });

        describe("on narrow-emoji terminals (VS Code)", () => {
            beforeEach(() => {
                process.env.TERM_PROGRAM = "vscode";
                resetTerminalCache();
            });

            it("should preserve 2 spaces after VS16 emoji", () => {
                expect(normalizeEmojiSpacing("⚠️  hello")).toBe("⚠️  hello");
            });

            it("should preserve spacing for all VS16 emojis", () => {
                expect(normalizeEmojiSpacing("⚙️  config")).toBe("⚙️  config");
                expect(normalizeEmojiSpacing("👁️  show")).toBe("👁️  show");
            });

            it("should expand 1 space after VS16 emoji to 2", () => {
                expect(normalizeEmojiSpacing("⚠️ hello")).toBe("⚠️  hello");
            });

            it("should normalize 3+ spaces after VS16 emoji to 2", () => {
                expect(normalizeEmojiSpacing("⚠️   hello")).toBe("⚠️  hello");
            });

            it("should be idempotent", () => {
                const once = normalizeEmojiSpacing("⚠️ hello");
                const twice = normalizeEmojiSpacing(once);
                expect(twice).toBe(once);
            });

            it("should not affect VS16 emoji with no trailing space", () => {
                expect(normalizeEmojiSpacing("\u26A0\uFE0F")).toBe("\u26A0\uFE0F");
            });

            it("should preserve 2 spaces after Unicode 13.0 emoji", () => {
                expect(normalizeEmojiSpacing("\u{1FA84}  Choose the type:")).toBe(
                    "\u{1FA84}  Choose the type:"
                );
            });

            it("should expand 1 space after Unicode 13.0 emoji to 2", () => {
                expect(normalizeEmojiSpacing("\u{1FA84} Choose the type:")).toBe(
                    "\u{1FA84}  Choose the type:"
                );
            });

            it("should be idempotent for Unicode 13.0 emoji", () => {
                const once = normalizeEmojiSpacing("\u{1FA84} Choose the type:");
                const twice = normalizeEmojiSpacing(once);
                expect(twice).toBe(once);
            });
        });
    });
});

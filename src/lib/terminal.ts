/**
 * Runtime terminal detection for VS16 emoji width normalization.
 *
 * VS16 emojis (those containing U+FE0F variation selector) render at different
 * widths depending on the terminal:
 * - Modern terminals (Windows Terminal, iTerm2): 2 columns wide
 * - VS Code integrated terminal (xterm.js): 1 column wide
 *
 * This module detects the terminal type and normalizes emoji spacing so that
 * VS16 emojis always have a visible gap before adjacent text.
 */

let cachedIsWideEmoji: boolean | null = null;

/**
 * Detects whether the current terminal renders VS16 (U+FE0F) emojis
 * as 2 columns wide.
 *
 * Returns true for modern terminals (Windows Terminal, iTerm2, Kitty),
 * false for narrow renderers (VS Code integrated terminal / xterm.js).
 *
 * Result is cached after the first call.
 */
export function isWideEmojiTerminal(): boolean {
    if (cachedIsWideEmoji !== null) {
        return cachedIsWideEmoji;
    }

    const termProgram = process.env.TERM_PROGRAM ?? "";
    cachedIsWideEmoji = termProgram !== "vscode";
    return cachedIsWideEmoji;
}

/**
 * Normalizes spacing after VS16 emojis based on terminal width detection.
 *
 * Source strings should use 2 spaces after VS16 emojis (safe for narrow
 * terminals). On wide-emoji terminals, this function reduces the 2 spaces
 * to 1 so the visual gap is consistent.
 *
 * @param text - String potentially containing VS16 emojis followed by 2 spaces
 * @returns Normalized string with appropriate spacing for the current terminal
 */
export function normalizeVS16Spacing(text: string): string {
    if (isWideEmojiTerminal()) {
        return text.replace(/(\uFE0F) {2}/g, "$1 ");
    }
    return text;
}

/**
 * Resets the cached terminal detection result.
 * Exposed for testing so tests can control the detection per-test.
 */
export function resetTerminalCache(): void {
    cachedIsWideEmoji = null;
}

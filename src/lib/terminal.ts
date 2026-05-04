/**
 * Runtime terminal detection for emoji width normalization.
 *
 * Two categories of emoji render at different column widths across terminals:
 *
 * 1. VS16 sequences - text-presentation characters (e.g. U+26A0) followed by
 *    U+FE0F variation selector. xterm.js advances the cursor 1 column; modern
 *    terminals advance 2.
 *
 * 2. Unicode 13.0+ emoji in U+1FA83-U+1FAFF - xterm.js wcwidth table covers only
 *    Unicode 12, so these characters are treated as narrow (1 column) while modern
 *    terminals render them wide (2 columns).
 *
 * This module detects the terminal type and normalizes emoji spacing so that
 * both categories always show a visible gap before adjacent text.
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
 * Normalizes spacing after wide emojis that xterm.js under-counts.
 *
 * Handles VS16 sequences (U+FE0F) and Unicode 13.0+ emoji in U+1FA83-U+1FAFF.
 * Accepts any number of trailing spaces and normalizes to 1 (wide terminals)
 * or 2 (xterm.js / VS Code). Idempotent.
 *
 * @param text - String potentially containing wide emojis followed by spaces
 * @returns Normalized string with appropriate spacing for the current terminal
 */
export function normalizeEmojiSpacing(text: string): string {
    const targetSpaces = isWideEmojiTerminal() ? 1 : 2;
    const spaces = " ".repeat(targetSpaces);
    return text
        .replace(/(\uFE0F) +/g, `$1${spaces}`)
        .replace(/[\u{1FA83}-\u{1FAFF}] +/gu, (match) => `${[...match][0]}${spaces}`);
}

/**
 * Resets the cached terminal detection result.
 * Exposed for testing so tests can control the detection per-test.
 */
export function resetTerminalCache(): void {
    cachedIsWideEmoji = null;
}

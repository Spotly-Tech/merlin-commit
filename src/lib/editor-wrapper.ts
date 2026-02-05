import { editor } from "@inquirer/prompts";

/**
 * Options for the editor prompt, matching @inquirer/prompts editor() signature.
 */
type EditorOptions = {
    message: string;
    default?: string;
    validate?: (text: string) => boolean | string | Promise<boolean | string>;
    waitForUserInput?: boolean;
};

/**
 * Wrapper around @inquirer/prompts editor() that respects the user's configured editor.
 *
 * The @inquirer/editor package uses environment variables ($VISUAL or $EDITOR) to
 * determine which editor to launch. This wrapper temporarily sets process.env.VISUAL
 * to the user's configured editor before calling editor(), then restores the original
 * environment variables afterward.
 *
 * @param options - Standard @inquirer/prompts editor options
 * @param customEditor - Path to editor command from config (e.g., "code --wait", "vim")
 * @returns Promise resolving to the text entered in the editor
 *
 * @example
 * const config = loadConfig();
 * const body = await editorWithConfig(
 *     { message: "Enter description:", waitForUserInput: false },
 *     config.editor
 * );
 */
export async function editorWithConfig(
    options: EditorOptions,
    customEditor?: string
): Promise<string> {
    const originalVisual = process.env.VISUAL;
    const originalEditor = process.env.EDITOR;

    try {
        if (customEditor) {
            // Set VISUAL (takes precedence over EDITOR in most systems)
            process.env.VISUAL = customEditor;
        }

        const result = await editor(options);
        return result;
    } finally {
        // Always restore original environment variables to avoid side effects
        if (originalVisual !== undefined) {
            process.env.VISUAL = originalVisual;
        } else {
            delete process.env.VISUAL;
        }

        if (originalEditor !== undefined) {
            process.env.EDITOR = originalEditor;
        } else {
            delete process.env.EDITOR;
        }
    }
}

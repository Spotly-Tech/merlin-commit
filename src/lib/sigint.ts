import type { WizardMessages } from "../types/index.js";
import { colors } from "../utils/constants.js";

/**
 * Creates a SIGINT handler for graceful Ctrl+C exit.
 * Returns a cleanup function to remove the handler.
 *
 * @param messages - Theme-aware messages for cancel/exit text
 * @param cleanup - Optional cleanup function to run before exit (e.g., stop spinner)
 * @returns Cleanup function to remove the SIGINT handler
 */
export function setupSigintHandler(
    messages: WizardMessages,
    cleanup?: () => void
): () => void {
    const handleSigint = () => {
        cleanup?.();
        // Use stderr and force newline to ensure visibility after Inquirer clears the line
        process.stderr.write("\n");
        console.error(colors.warning(messages.warnings.cancel + "\n"));
        process.exit(0);
    };

    process.on("SIGINT", handleSigint);

    return () => {
        process.off("SIGINT", handleSigint);
    };
}

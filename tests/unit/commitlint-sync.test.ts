import { access, readFile, writeFile } from "fs/promises";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
    buildSyncRules,
    detectCommitlintConfig,
    syncToCommitlintConfig,
} from "../../src/lib/commitlint-sync.js";
import type { CommitType, MerlinConfig } from "../../src/types/index.js";
import { DEFAULT_CONFIG } from "../../src/utils/constants.js";

vi.mock("fs/promises", () => ({
    access: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn().mockResolvedValue(undefined),
}));

const mockAccess = vi.mocked(access);
const mockReadFile = vi.mocked(readFile);
const mockWriteFile = vi.mocked(writeFile);

const FILE_NOT_FOUND = new Error("ENOENT");

function makeConfig(overrides: Partial<MerlinConfig> = {}): Required<MerlinConfig> {
    return { ...DEFAULT_CONFIG, ...overrides } as Required<MerlinConfig>;
}

const CUSTOM_TYPES: CommitType[] = [
    { value: "feat", name: "feat", description: "feature", emoji: "✨" },
    { value: "fix", name: "fix", description: "fix", emoji: "🐛" },
];

// Helpers that skip N candidates before resolving/rejecting the (N+1)th
function skipCandidates(count: number): void {
    for (let index = 0; index < count; index++) {
        mockAccess.mockRejectedValueOnce(FILE_NOT_FOUND);
    }
}

function makeJsContent(options: {
    hasMarker?: boolean;
    hasExtends?: boolean;
    hasRules?: boolean;
}): string {
    const parts: string[] = [];
    if (options.hasMarker) parts.push("// @merlin-managed");
    parts.push("export default {");
    if (options.hasExtends) parts.push('  extends: ["@commitlint/config-conventional"],');
    if (options.hasRules)
        parts.push('  rules: { "header-max-length": [2, "always", 100] },');
    parts.push("};");
    return parts.join("\n");
}

// --- detectCommitlintConfig ---------------------------------------------------

describe("detectCommitlintConfig", () => {
    beforeEach(() => vi.clearAllMocks());

    it("returns null when no config file exists", async () => {
        mockAccess.mockRejectedValue(FILE_NOT_FOUND);

        const result = await detectCommitlintConfig("/repo");

        expect(result).toBeNull();
    });

    it("returns json format and correct path for .commitlintrc (index 0)", async () => {
        mockAccess.mockResolvedValue(undefined);

        const result = await detectCommitlintConfig("/repo");

        expect(result?.format).toBe("json");
        expect(result?.filePath).toMatch(/[/\\]\.commitlintrc$/);
        expect(mockAccess).toHaveBeenCalledTimes(1);
    });

    it("returns json format for .commitlintrc.json (index 1)", async () => {
        skipCandidates(1);
        mockAccess.mockResolvedValue(undefined);

        const result = await detectCommitlintConfig("/repo");

        expect(result?.format).toBe("json");
        expect(result?.filePath).toContain(".commitlintrc.json");
    });

    it("returns yaml format for .commitlintrc.yaml (index 2)", async () => {
        skipCandidates(2);
        mockAccess.mockResolvedValue(undefined);

        const result = await detectCommitlintConfig("/repo");

        expect(result?.format).toBe("yaml");
        expect(result?.filePath).toContain(".commitlintrc.yaml");
    });

    it("returns yaml format for .commitlintrc.yml (index 3)", async () => {
        skipCandidates(3);
        mockAccess.mockResolvedValue(undefined);

        const result = await detectCommitlintConfig("/repo");

        expect(result?.format).toBe("yaml");
        expect(result?.filePath).toContain(".commitlintrc.yml");
    });

    it("does not call readFile for json or yaml candidates", async () => {
        mockAccess.mockResolvedValue(undefined); // hits .commitlintrc (json)

        await detectCommitlintConfig("/repo");

        expect(mockReadFile).not.toHaveBeenCalled();
    });

    it("returns js-merlin when JS file contains the @merlin-managed marker", async () => {
        skipCandidates(4); // skip to .commitlintrc.js
        mockAccess.mockResolvedValue(undefined);
        mockReadFile.mockResolvedValue(
            makeJsContent({ hasMarker: true, hasExtends: true, hasRules: true }) as never
        );

        const result = await detectCommitlintConfig("/repo");

        expect(result?.format).toBe("js-merlin");
    });

    it("returns js-merlin for initial template (has extends, no rules:)", async () => {
        skipCandidates(4);
        mockAccess.mockResolvedValue(undefined);
        mockReadFile.mockResolvedValue(
            makeJsContent({ hasExtends: true, hasRules: false }) as never
        );

        const result = await detectCommitlintConfig("/repo");

        expect(result?.format).toBe("js-merlin");
    });

    it("returns js-custom when JS file has rules but no marker (user-authored)", async () => {
        skipCandidates(4);
        mockAccess.mockResolvedValue(undefined);
        mockReadFile.mockResolvedValue(
            makeJsContent({ hasExtends: false, hasRules: true }) as never
        );

        const result = await detectCommitlintConfig("/repo");

        expect(result?.format).toBe("js-custom");
    });

    it("returns js-custom when JS file has neither marker nor extends", async () => {
        skipCandidates(4);
        mockAccess.mockResolvedValue(undefined);
        mockReadFile.mockResolvedValue(
            "module.exports = { parserPreset: 'conventional-changelog-atom' };" as never
        );

        const result = await detectCommitlintConfig("/repo");

        expect(result?.format).toBe("js-custom");
    });

    it("correctly resolves a later candidate: commitlint.config.js (index 7)", async () => {
        skipCandidates(7);
        mockAccess.mockResolvedValue(undefined);
        mockReadFile.mockResolvedValue(
            makeJsContent({ hasMarker: true, hasExtends: true }) as never
        );

        const result = await detectCommitlintConfig("/repo");

        expect(result?.filePath).toContain("commitlint.config.js");
        expect(result?.format).toBe("js-merlin");
    });
});

// --- buildSyncRules -----------------------------------------------------------

describe("buildSyncRules", () => {
    it("always includes subject-max-length with [2, always, value] format", () => {
        const rules = buildSyncRules(makeConfig({ maxSubjectLength: 72 }));

        expect(rules["subject-max-length"]).toEqual([2, "always", 72]);
    });

    it("always includes scope-max-length with [2, always, value] format", () => {
        const rules = buildSyncRules(makeConfig({ maxScopeLength: 20 }));

        expect(rules["scope-max-length"]).toEqual([2, "always", 20]);
    });

    it("reflects non-default length values", () => {
        const rules = buildSyncRules(
            makeConfig({ maxSubjectLength: 50, maxScopeLength: 15 })
        );

        expect(rules["subject-max-length"]).toEqual([2, "always", 50]);
        expect(rules["scope-max-length"]).toEqual([2, "always", 15]);
    });

    it("omits type-enum when types exactly match defaults", () => {
        const rules = buildSyncRules(makeConfig({ types: DEFAULT_CONFIG.types }));

        expect(rules["type-enum"]).toBeUndefined();
    });

    it("includes type-enum when types count is less than defaults", () => {
        const rules = buildSyncRules(makeConfig({ types: CUSTOM_TYPES }));

        expect(rules["type-enum"]).toBeDefined();
    });

    it("includes type-enum when types count is greater than defaults", () => {
        const extraTypes: CommitType[] = [
            ...DEFAULT_CONFIG.types,
            { value: "release", name: "release", description: "release", emoji: "🚀" },
        ];
        const rules = buildSyncRules(makeConfig({ types: extraTypes }));

        expect(rules["type-enum"]).toBeDefined();
    });

    it("includes type-enum when same count but different type values", () => {
        const renamedTypes = DEFAULT_CONFIG.types.map((commitType, index) =>
            index === 0 ? { ...commitType, value: "feature" } : commitType
        );
        const rules = buildSyncRules(makeConfig({ types: renamedTypes }));

        expect(rules["type-enum"]).toBeDefined();
    });

    it("type-enum contains extracted value strings from custom types", () => {
        const rules = buildSyncRules(makeConfig({ types: CUSTOM_TYPES }));

        expect(rules["type-enum"]).toEqual([2, "always", ["feat", "fix"]]);
    });
});

// --- syncToCommitlintConfig ---------------------------------------------------

describe("syncToCommitlintConfig", () => {
    beforeEach(() => vi.clearAllMocks());

    it("returns failure with empty filePath and appliedRuleNames when no config exists", async () => {
        mockAccess.mockRejectedValue(FILE_NOT_FOUND);

        const result = await syncToCommitlintConfig(makeConfig(), "/repo");

        expect(result.success).toBe(false);
        expect(result.filePath).toBe("");
        expect(result.appliedRuleNames).toEqual([]);
        expect(result.manualInstructions).toBeUndefined();
    });

    it("syncs to JSON config and returns success", async () => {
        mockAccess.mockResolvedValue(undefined);
        mockReadFile.mockResolvedValue(
            JSON.stringify({ extends: ["@commitlint/config-conventional"] }) as never
        );

        const result = await syncToCommitlintConfig(makeConfig(), "/repo");

        expect(result.success).toBe(true);
        expect(mockWriteFile).toHaveBeenCalledOnce();
    });

    it("JSON sync: reports all applied rule names", async () => {
        mockAccess.mockResolvedValue(undefined);
        mockReadFile.mockResolvedValue(
            JSON.stringify({ extends: ["@commitlint/config-conventional"] }) as never
        );

        const result = await syncToCommitlintConfig(makeConfig(), "/repo");

        expect(result.appliedRuleNames).toContain("subject-max-length");
        expect(result.appliedRuleNames).toContain("scope-max-length");
    });

    it("JSON sync: preserves existing rules (non-destructive merge)", async () => {
        const originalJson = JSON.stringify({
            extends: ["@commitlint/config-conventional"],
            rules: { "header-max-length": [2, "always", 100] },
        });
        mockAccess.mockResolvedValue(undefined);
        mockReadFile.mockResolvedValue(originalJson as never);

        await syncToCommitlintConfig(makeConfig(), "/repo");

        const writtenText = mockWriteFile.mock.calls[0][1] as string;
        const written = JSON.parse(writtenText) as { rules: Record<string, unknown> };
        expect(written.rules["header-max-length"]).toEqual([2, "always", 100]);
        expect(written.rules["subject-max-length"]).toBeDefined();
    });

    it("JSON sync: creates rules key when it is absent from config file", async () => {
        const originalJson = JSON.stringify({
            extends: ["@commitlint/config-conventional"],
        });
        mockAccess.mockResolvedValue(undefined);
        mockReadFile.mockResolvedValue(originalJson as never);

        await syncToCommitlintConfig(makeConfig(), "/repo");

        const writtenText = mockWriteFile.mock.calls[0][1] as string;
        const written = JSON.parse(writtenText) as { rules: Record<string, unknown> };
        expect(written.rules["subject-max-length"]).toBeDefined();
        expect(written.rules["scope-max-length"]).toBeDefined();
    });

    it("JSON sync: merlin rules overwrite keys that already exist", async () => {
        const originalJson = JSON.stringify({
            rules: { "subject-max-length": [2, "always", 100] },
        });
        mockAccess.mockResolvedValue(undefined);
        mockReadFile.mockResolvedValue(originalJson as never);

        await syncToCommitlintConfig(makeConfig({ maxSubjectLength: 50 }), "/repo");

        const writtenText = mockWriteFile.mock.calls[0][1] as string;
        const written = JSON.parse(writtenText) as { rules: Record<string, unknown> };
        expect(written.rules["subject-max-length"]).toEqual([2, "always", 50]);
    });

    it("JS merlin sync: regenerates file with @merlin-managed marker", async () => {
        skipCandidates(4);
        mockAccess.mockResolvedValue(undefined);
        mockReadFile.mockResolvedValue(
            makeJsContent({ hasMarker: true, hasExtends: true }) as never
        );

        const result = await syncToCommitlintConfig(makeConfig(), "/repo");

        expect(result.success).toBe(true);
        const writtenContent = mockWriteFile.mock.calls[0][1] as string;
        expect(writtenContent).toContain("// @merlin-managed");
    });

    it("JS merlin sync: written file contains the synced rule names", async () => {
        skipCandidates(4);
        mockAccess.mockResolvedValue(undefined);
        mockReadFile.mockResolvedValue(
            makeJsContent({ hasMarker: true, hasExtends: true }) as never
        );

        await syncToCommitlintConfig(makeConfig(), "/repo");

        const writtenContent = mockWriteFile.mock.calls[0][1] as string;
        expect(writtenContent).toContain("subject-max-length");
        expect(writtenContent).toContain("scope-max-length");
        expect(writtenContent).toContain("@commitlint/config-conventional");
    });

    it("JS merlin sync: formats type-enum array values correctly in generated file", async () => {
        skipCandidates(4);
        mockAccess.mockResolvedValue(undefined);
        mockReadFile.mockResolvedValue(
            makeJsContent({ hasMarker: true, hasExtends: true }) as never
        );

        await syncToCommitlintConfig(makeConfig({ types: CUSTOM_TYPES }), "/repo");

        const writtenContent = mockWriteFile.mock.calls[0][1] as string;
        expect(writtenContent).toContain('"type-enum"');
        expect(writtenContent).toContain('"feat"');
        expect(writtenContent).toContain('"fix"');
    });

    it("YAML: returns failure with manual instructions", async () => {
        skipCandidates(2);
        mockAccess.mockResolvedValue(undefined);

        const result = await syncToCommitlintConfig(makeConfig(), "/repo");

        expect(result.success).toBe(false);
        expect(result.manualInstructions).toBeDefined();
        expect(result.appliedRuleNames).toEqual([]);
    });

    it("YAML: manual instructions contain the rule names", async () => {
        skipCandidates(2);
        mockAccess.mockResolvedValue(undefined);

        const result = await syncToCommitlintConfig(makeConfig(), "/repo");

        expect(result.manualInstructions).toContain("subject-max-length");
        expect(result.manualInstructions).toContain("scope-max-length");
    });

    it("YAML: manual instructions format type-enum array values correctly", async () => {
        skipCandidates(2);
        mockAccess.mockResolvedValue(undefined);

        const result = await syncToCommitlintConfig(
            makeConfig({ types: CUSTOM_TYPES }),
            "/repo"
        );

        expect(result.manualInstructions).toContain("type-enum");
        expect(result.manualInstructions).toContain('"feat"');
        expect(result.manualInstructions).toContain('"fix"');
    });

    it("js-custom: returns failure with manual instructions", async () => {
        skipCandidates(4);
        mockAccess.mockResolvedValue(undefined);
        mockReadFile.mockResolvedValue(makeJsContent({ hasRules: true }) as never);

        const result = await syncToCommitlintConfig(makeConfig(), "/repo");

        expect(result.success).toBe(false);
        expect(result.manualInstructions).toBeDefined();
        expect(result.filePath).toContain(".commitlintrc.js");
    });

    it("type-enum appears in appliedRuleNames for JSON sync when types are custom", async () => {
        mockAccess.mockResolvedValue(undefined);
        mockReadFile.mockResolvedValue(
            JSON.stringify({ extends: ["@commitlint/config-conventional"] }) as never
        );

        const result = await syncToCommitlintConfig(
            makeConfig({ types: CUSTOM_TYPES }),
            "/repo"
        );

        expect(result.appliedRuleNames).toContain("type-enum");
    });
});

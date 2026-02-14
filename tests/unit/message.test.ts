import { describe, expect, it } from "vitest";
import { buildCommitMessage, formatPreview } from "../../src/lib/message.js";

describe("buildCommitMessage", () => {
    it("builds basic commit with type and subject", () => {
        const result = buildCommitMessage({
            type: "feat",
            subject: "add user login",
        });
        expect(result).toBe("feat: add user login");
    });

    it("builds commit with scope", () => {
        const result = buildCommitMessage({
            type: "fix",
            scope: "auth",
            subject: "correct token validation",
        });
        expect(result).toBe("fix(auth): correct token validation");
    });

    it("builds commit with body", () => {
        const result = buildCommitMessage({
            type: "feat",
            subject: "add OAuth",
            body: "Implements OAuth 2.0 flow",
        });
        expect(result).toBe("feat: add OAuth\n\nImplements OAuth 2.0 flow");
    });

    it("builds commit with breaking change and adds ! to header", () => {
        const result = buildCommitMessage({
            type: "feat",
            subject: "change API",
            breaking: "API endpoints changed",
        });
        expect(result).toBe("feat!: change API\n\nBREAKING CHANGE: API endpoints changed");
    });

    it("builds commit with scope and breaking change indicator", () => {
        const result = buildCommitMessage({
            type: "feat",
            scope: "api",
            subject: "change endpoints",
            breaking: "removed v1 endpoints",
        });
        expect(result).toBe(
            "feat(api)!: change endpoints\n\nBREAKING CHANGE: removed v1 endpoints"
        );
    });

    it("builds commit with issue references", () => {
        const result = buildCommitMessage({
            type: "fix",
            subject: "fix memory leak",
            issues: "Fixes #123, Closes #456",
        });
        expect(result).toBe("fix: fix memory leak\n\nFixes #123, Closes #456");
    });

    it("builds complete commit with all fields", () => {
        const result = buildCommitMessage({
            type: "feat",
            scope: "api",
            subject: "add pagination",
            body: "Implements cursor-based pagination",
            breaking: "Page numbers no longer supported",
            issues: "Closes #789",
        });
        expect(result).toBe(
            "feat(api)!: add pagination\n\n" +
                "Implements cursor-based pagination\n\n" +
                "BREAKING CHANGE: Page numbers no longer supported\n\n" +
                "Closes #789"
        );
    });

    it("strips BREAKING CHANGE prefix to prevent duplication", () => {
        const result = buildCommitMessage({
            type: "feat",
            subject: "change API",
            breaking: "BREAKING CHANGE: API endpoints changed",
        });
        expect(result).toBe("feat!: change API\n\nBREAKING CHANGE: API endpoints changed");
    });

    it("strips case-insensitive breaking change prefix", () => {
        const result = buildCommitMessage({
            type: "feat",
            subject: "change API",
            breaking: "breaking change: API endpoints changed",
        });
        expect(result).toBe("feat!: change API\n\nBREAKING CHANGE: API endpoints changed");
    });

    it("skips breaking change when only prefix is provided", () => {
        const result = buildCommitMessage({
            type: "feat",
            subject: "change API",
            breaking: "BREAKING CHANGE:",
        });
        expect(result).toBe("feat: change API");
    });

    it("handles empty optional fields", () => {
        const result = buildCommitMessage({
            type: "chore",
            subject: "update deps",
            scope: "",
            body: "",
            breaking: "",
            issues: "",
        });
        expect(result).toBe("chore: update deps");
    });
});

describe("formatPreview", () => {
    it("returns simple message unchanged", () => {
        const result = formatPreview("fix: correct typo");
        expect(result).toBe("fix: correct typo");
    });

    it("adds warning emoji to BREAKING CHANGE", () => {
        const result = formatPreview("feat: change api\n\nBREAKING CHANGE: removed old endpoint");
        expect(result).toBe("feat: change api\n\n⚠️  BREAKING CHANGE: removed old endpoint");
    });

    it("adds link emoji to issue references (Fixes)", () => {
        const result = formatPreview("fix: bug\n\nFixes #123");
        expect(result).toBe("fix: bug\n\n🔗 Fixes #123");
    });

    it("adds link emoji to issue references (Closes)", () => {
        const result = formatPreview("feat: feature\n\nCloses #456");
        expect(result).toBe("feat: feature\n\n🔗 Closes #456");
    });

    it("adds link emoji to issue references (Resolves)", () => {
        const result = formatPreview("fix: issue\n\nResolves #789");
        expect(result).toBe("fix: issue\n\n🔗 Resolves #789");
    });

    it("handles case-insensitive issue references", () => {
        const result = formatPreview("fix: bug\n\nfixes #123");
        expect(result).toBe("fix: bug\n\n🔗 fixes #123");
    });

    it("handles refs keyword", () => {
        const result = formatPreview("docs: update\n\nrefs #100");
        expect(result).toBe("docs: update\n\n🔗 refs #100");
    });

    it("handles related to keyword", () => {
        const result = formatPreview("feat: new\n\nrelated to #50");
        expect(result).toBe("feat: new\n\n🔗 related to #50");
    });

    it("handles issue references mid-line", () => {
        const result = formatPreview("fix: bug\n\nAlso fixes #123 and more");
        expect(result).toBe("fix: bug\n\n🔗 Also fixes #123 and more");
    });

    it("formats complete message with breaking change and issues", () => {
        const message =
            "feat(api)!: add auth\n\nImplements OAuth\n\nBREAKING CHANGE: new flow\n\nCloses #100";
        const result = formatPreview(message);
        expect(result).toBe(
            "feat(api)!: add auth\n\nImplements OAuth\n\n⚠️  BREAKING CHANGE: new flow\n\n🔗 Closes #100"
        );
    });
});

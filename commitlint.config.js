// @merlin-managed
export default {
    extends: ["@commitlint/config-conventional"],
    rules: {
        "subject-max-length": [2, "always", 72],
        "scope-max-length": [2, "always", 20],
    },
};

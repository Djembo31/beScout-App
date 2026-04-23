/**
 * BeScout Commitlint Config (Slice 185)
 *
 * Enforces conventional-commits format. Integrated via Husky commit-msg hook.
 *
 * Format:  <type>(<scope>): <subject>
 * Example: feat(trading): Slice 178 — idempotent buy-player RPC
 *
 * Types (enforced):
 *   feat, fix, refactor, test, docs, chore, ci, build, perf, style, revert
 */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Allow longer headers — BeScout slice-titles are often descriptive
    'header-max-length': [2, 'always', 120],
    // Body-line-length relaxed for code-snippets in commit messages
    'body-max-line-length': [1, 'always', 200],
    // Footer (e.g. "Co-Authored-By:") can be longer
    'footer-max-line-length': [0, 'always'],
    // BeScout slice-titles use "Slice NNN — ..." (mixed-case, em-dash).
    // Disable subject-case to not force lowercase-kebab.
    'subject-case': [0],
  },
};

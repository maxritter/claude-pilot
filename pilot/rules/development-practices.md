## Development Practices

### Project-Specific Policies

**File Size:** Production code under 300 lines. 500 is hard limit — stop and refactor. Test files exempt.

**Dependency Check:** Before modifying any function, use `vexor`, `Grep`, or LSP `findReferences` to find all callers. Update all affected call sites.

**Self-Correction:** Fix obvious mistakes (syntax errors, typos, missing imports) immediately without asking. Reserve communication for decisions.

**Diagnostics:** Check before starting work and after changes. Fix all errors before marking complete.

**Formatting:** Let automated formatters handle style. **Backward Compatibility:** Only when explicitly required.

### Systematic Debugging

**No fixes without root cause investigation. Complete phases sequentially.**

**Phase 1 — Root Cause:** Read errors completely, reproduce consistently, check recent changes (git diff), instrument at boundaries.

**Phase 2 — Pattern Analysis:** Use `vexor` to find working examples in codebase by intent. Compare against references, identify ALL differences.

**Phase 3 — Hypothesis:** Form specific, falsifiable hypothesis ("state resets because component remounts on route change"). Test with minimal change — one variable at a time.

**Phase 4 — Implementation:** Create failing test first (TDD), implement single fix, verify completely.

**3+ failed fixes = architectural problem.** Question the pattern, don't fix again.

**Red Flags → STOP:** "Quick fix for now", multiple changes at once, proposing fixes before tracing data flow, 2+ failed fixes.

**Meta-Debugging:** Treat your own code as foreign. Your mental model is a guess — the code's behavior is truth.

### Git Operations

**Read git state freely. NEVER execute write commands without EXPLICIT user permission.**

This rule is about git commands, not file operations. Editing files is always allowed.

**⛔ Write commands need permission:** `git add`, `commit`, `push`, `pull`, `merge`, `rebase`, `reset`, `stash`, `checkout`, etc. "Fix this bug" ≠ "commit it."

**⛔ Never `git add -f`.** If gitignored, tell the user — don't force-add.

**⛔ Never selectively unstage.** Commit ALL staged changes as-is.

**Read commands — always allowed:** `git status`, `diff`, `log`, `show`, `branch`

**Exceptions:** Explicit user override ("checkout branch X") and worktree during `/spec` (`Worktree: Yes`).

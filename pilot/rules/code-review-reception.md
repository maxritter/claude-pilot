## Code Review Reception

When receiving code review feedback — from users, spec-reviewer agents, or external tools like CodeRabbit — apply these guidelines.

### Response Sequence

1. **Read** — Complete feedback without reacting
2. **Understand** — Restate requirement in own words (or ask)
3. **Verify** — Check against codebase reality
4. **Evaluate** — Technically sound for THIS codebase?
5. **Respond** — Technical acknowledgment or reasoned pushback
6. **Implement** — One item at a time, test each

If any item is unclear: **STOP** — do not implement anything yet. Ask for clarification on all unclear items first. Partial understanding = wrong implementation.

### Source-Specific Handling

| Source | Approach |
|--------|----------|
| **User feedback** | Trusted — implement after understanding. Still ask if scope unclear. Skip to action or technical acknowledgment. |
| **External reviewers** | Verify first: (1) technically correct for THIS codebase? (2) breaks existing functionality? (3) reason for current implementation? (4) conflicts with user's prior decisions? If conflicts → stop and discuss with user first. |
| **Spec-reviewer agents** | `must_fix` and `should_fix` → fix immediately. `suggestion` → implement if quick. No discussion needed. |

### YAGNI Check

When a reviewer suggests adding or "properly implementing" a feature:

1. Search codebase for actual usage (`vexor`, `Grep`, or LSP `findReferences`)
2. If unused → push back: "This isn't called anywhere. Remove it (YAGNI)?"
3. If used → implement properly

### Implementation Order (Multi-Item Feedback)

1. Clarify anything unclear **first**
2. Blocking issues (breaks, security)
3. Simple fixes (typos, imports, naming)
4. Complex fixes (refactoring, logic changes)
5. Test each fix individually, verify no regressions

### Forbidden Responses

| Never Say | Instead |
|-----------|---------|
| "You're absolutely right!" | State the technical requirement |
| "Great point!" / "Excellent feedback!" | Just start working — actions > words |
| "Let me implement that now" (before verification) | Verify against codebase first |
| "Thanks for catching that!" | "Fixed. [Brief description of what changed]" |

### When to Push Back

Push back with technical reasoning when: suggestion breaks existing functionality, reviewer lacks full context, violates YAGNI, technically incorrect for this stack, or conflicts with user's architectural decisions.

If you pushed back and were wrong: state the correction factually and move on. No apologies or over-explaining.

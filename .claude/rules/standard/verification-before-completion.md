## Verification Before Completion

**Core Principle:** Evidence before claims. Never claim success without fresh verification output.

### Mandatory Rule

NO completion claims without executing verification commands and showing output in the current message.

### Verification Workflow

Before ANY claim of success, completion, or correctness:

1. **Identify** - What command proves this claim?
2. **Execute** - Run the FULL command (not partial, not cached)
3. **Read** - Check exit code, count failures, read full output
4. **Confirm** - Does output actually prove the claim?
5. **Report** - State claim WITH evidence from step 3

**If you haven't run the command in this message, you cannot claim it passes.**

### What Requires Verification

| Claim                   | Required Evidence           | Insufficient                |
| ----------------------- | --------------------------- | --------------------------- |
| "Tests pass"            | Fresh test run: 0 failures  | Previous run, "should pass" |
| "Linter clean"          | Linter output: 0 errors     | Partial check, assumption   |
| "Build succeeds"        | Build command: exit 0       | Linter passing              |
| "Bug fixed"             | Test reproducing bug passes | Code changed                |
| "Regression test works" | Red-green cycle verified    | Test passes once            |
| "Requirements met"      | Line-by-line checklist      | Tests passing               |

### Stop Signals

Run verification immediately if you're about to:
- Use uncertain language: "should", "probably", "seems to", "looks like"
- Express satisfaction: "Great!", "Perfect!", "Done!", "All set!"
- Commit, push, or create PR
- Mark task complete or move to next task
- Trust agent/tool reports without independent verification
- Think "just this once" or rely on confidence without evidence

### Correct Patterns

**Tests:**
- ✅ Run `pytest` → See "34 passed" → "All 34 tests pass"
- ❌ "Should pass now" / "Tests look correct"

**TDD Red-Green Cycle:**
- ✅ Write test → Run (fails) → Implement → Run (passes) → Verified
- ❌ "I wrote a regression test" (without seeing it fail first)

**Build:**
- ✅ Run `npm run build` → Exit 0 → "Build succeeds"
- ❌ "Linter passed, so build should work"

**Requirements:**
- ✅ Read plan → Check each item → Verify completion → Report status
- ❌ "Tests pass, so requirements are met"

### Why This Matters

**Consequences of unverified claims:**
- Trust broken with human partner
- Undefined functions shipped (crashes in production)
- Incomplete features deployed
- Time wasted on rework
- Violates core value: honesty

**The rule exists because assumptions fail. Evidence doesn't.**

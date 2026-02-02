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
| "Output is correct"     | Compare against source data | Logs look reasonable        |
| "UI works"              | agent-browser snapshot shows correct state | "API returns 200" |

### ⛔ Output Correctness - Don't Trust Logs Alone

**If code processes external data, verify output against the source:**

```bash
# Fetch source data independently
aws <service> get-<resource> --output json

# Compare with what your code logged/produced
# If code says "processed 1 item" but source has "18 items" = BUG
```

**The failure that prompted this:** Lambda logged `failureReasonsCount: 1`, I accepted it. Actual API had 18 reasons. Data parsing bug went undetected.

### ⛔ Fix ALL Errors - No Exceptions, No Asking

When verification reveals errors, fix ALL of them - not just the ones "related" to your current task.

**Invalid responses to errors:**
- ❌ "These are pre-existing errors" → Fix them anyway
- ❌ "Unrelated to my changes" → You found them, you fix them
- ❌ "Type errors in other files" → Fix them anyway
- ❌ "Should I fix these?" → **NEVER ASK** - just fix them
- ❌ "Want me to address these findings?" → **NEVER ASK** - just fix them

**Valid response:** Fix the error silently, then continue.

The user trusts you to leave the codebase better than you found it. If you ran the check and saw the error, you own it.

### ⛔ Auto-Fix in /spec Workflow

In /spec workflows, verification findings (from multi-pass code review) are **automatically implemented**:

- **must_fix** issues → Fix immediately without asking
- **should_fix** issues → Fix immediately without asking
- **suggestions** → Implement if quick and reasonable

**The ONLY user interaction in /spec is plan approval.** Everything else - implementation, verification, fixing, re-verification - happens automatically. Never interrupt the flow to ask for permission to fix issues.

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

**Frontend UI:**
- ✅ `agent-browser open` → `snapshot -i` → See expected elements → "UI renders correctly"
- ❌ "API works, so frontend should work"

### Why This Matters

**Consequences of unverified claims:**
- Trust broken with human partner
- Undefined functions shipped (crashes in production)
- Incomplete features deployed
- Time wasted on rework
- Violates core value: honesty

**The rule exists because assumptions fail. Evidence doesn't.**

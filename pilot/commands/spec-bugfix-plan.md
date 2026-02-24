---
description: "Bugfix spec planning phase - analyze bug, design fix, get approval"
argument-hint: "<bug description> or <path/to/plan.md>"
user-invocable: false
model: opus
hooks:
  Stop:
    - command: uv run python "${CLAUDE_PLUGIN_ROOT}/hooks/spec_plan_validator.py"
---

# /spec-bugfix-plan - Bugfix Planning Phase

**Bugfix variant of Phase 1 of the /spec workflow.** Analyzes the bug using property-aware code evolution methodology, creates a targeted fix plan with Behavior Contract, and gets user approval.

**Input:** Bug description (new bugfix plan) or plan path (continue unapproved bugfix plan)
**Output:** Approved bugfix plan file at `docs/plans/YYYY-MM-DD-<slug>.md` with `Type: Bugfix`
**Next phase:** On approval → `Skill(skill='spec-implement', args='<plan-path>')`

**Lighter than feature spec:** No broad exploration phase, no design decisions question batch. Focus is tight — understand the bug, contract the fix, write targeted tests.

---

## ⛔ KEY CONSTRAINTS (Rules Summary)

| #   | Rule                                                                                                     |
| --- | -------------------------------------------------------------------------------------------------------- |
| 1   | **NO sub-agents during planning** - Use direct tools only. No verification agents for bugfix plans.      |
| 2   | **ONLY stopping point is plan approval** - Everything else is automatic.                                 |
| 3   | **NEVER write code during planning** - Separate phases.                                                  |
| 4   | **NEVER assume - verify by reading files.** Trace the bug to actual file:line.                           |
| 5   | **Plan file is source of truth** - Survives across auto-compaction cycles.                               |
| 6   | **Re-read plan after user edits** - Before asking for approval again.                                    |

---

> **WARNING: DO NOT use the built-in `ExitPlanMode` or `EnterPlanMode` tools.**

---

## Step 1.1: Create Plan File Header (FIRST)

**Immediately upon starting, create the plan file header.**

1. **Parse worktree choice from arguments:**
   - Look for `--worktree=yes` or `--worktree=no` at the end of the arguments
   - Strip the `--worktree=...` flag from the bug description
   - Default to `No` if no flag is present

2. **Create worktree early (if `--worktree=yes`):** Follow same pattern as `spec-plan.md` Step 1.1.2.

3. **Generate filename:** `docs/plans/YYYY-MM-DD-<bug-slug>.md`
   - Create slug from first 3-4 words of bug description (lowercase, hyphens)

4. **Create directory if needed:** `mkdir -p docs/plans`

5. **Write initial header immediately:**

   ```markdown
   # [Bug Description] Fix Plan

   Created: [Date]
   Status: PENDING
   Approved: No
   Iterations: 0
   Worktree: [Yes|No]
   Type: Bugfix

   > Planning in progress...

   ## Summary

   **Goal:** [Bug description from user]

   ---

   _Analyzing bug and gathering requirements..._
   ```

6. **Register plan association (MANDATORY):**

   ```bash
   ~/.pilot/bin/pilot register-plan "<plan_path>" "PENDING" 2>/dev/null || true
   ```

**Why FIRST:** Status bar shows plan immediately. Plan file exists for continuation across auto-compaction.

---

## Step 1.2: Bug Understanding & Targeted Exploration

**Goal: Trace the bug to a specific file:line root cause.**

### Step 1.2.1: State Your Understanding

Before exploring, restate the bug in your own words:
- What is the symptom (what does the user observe)?
- When does it happen (what triggers it)?
- What should happen instead?

If the bug description is too vague to trace, use AskUserQuestion to ask ONE focused question (reproduction steps, error message, version info, or minimal example that triggers it).

### Step 1.2.2: Targeted Code Exploration

**Only read files related to the bug area — not the full codebase.**

For each file in the bug area:
1. Read it completely
2. Trace the execution path from user action → symptom
3. Note the specific line(s) where the bug occurs (hypothesize if not certain)

**Tools for targeted exploration:**

| Tool               | When to Use                     |
| ------------------ | ------------------------------- |
| **Vexor**          | Find files by intent/concept    |
| **Read/Grep/Glob** | Read specific files in bug area |

### Step 1.2.3: Derive the Bug Analysis

**After exploration, formalize the bug:**

**Bug Condition (C):** The specific input partition or state where the bug triggers.
- Be precise: "When X is Y AND Z is W..."
- This defines what your bug-condition test will reproduce

**Root Cause Hypothesis:** The specific code location causing the bug.
- Format: "In `file/path.py:lineN`, `function_name()` does X but should do Y"
- Include the actual line of code if possible
- Explain WHY it causes the observed symptom

**Postcondition (P):** What "fixed" means — the observable outcome when the fix is correct.
- Be precise: "Given C, the system returns/does/produces X instead of Y"

---

## Step 1.3: Behavior Contract

**Formalize what MUST and MUST NOT change.**

This is the core of property-aware code evolution:

```
Fix Property:           C ⟹ P         (when bug condition holds, fix applies)
Preservation Property:  ¬C ⟹ unchanged (when bug condition doesn't hold, behavior unchanged)
```

Write the contract using WHEN/THEN notation:

**Must Change (Fix Property: C ⟹ P):**
- WHEN [bug condition C] THEN [correct behavior P]
- Example: WHEN a node has two children AND delete is called THEN the node is replaced by its in-order successor

**Must NOT Change (Preservation Property: ¬C ⟹ unchanged):**
- WHEN [normal condition, not the bug case] THEN [existing behavior preserved]
- Example: WHEN a node has zero or one child THEN delete behavior is unchanged from current implementation
- List 2-4 preservation scenarios that cover the happy paths

**Property-based testing recommendation:** If the Bug Condition depends on data structure properties, input shape, or size (not a single specific value), recommend using:
- `hypothesis` for Python
- `fast-check` for TypeScript
- `go test -fuzz` for Go

---

## Step 1.4: Implementation Tasks (Test-Before-Fix Pattern)

**The task structure is fixed for all bugfix plans: test → preserve → fix → verify.**

### Standard Bugfix Task Structure

**Task 1: Write the bug-condition test (RED)**
- Objective: Write a test that reproduces the bug — it MUST FAIL on current code
- The test directly encodes the Fix Property (C ⟹ P)
- Run it immediately to confirm it fails with the expected error

**Task 2: Write preservation tests (GREEN from the start)**
- Objective: Write tests covering the Must NOT Change scenarios
- These MUST PASS on current code (they verify the fix doesn't break existing behavior)
- Run them immediately to confirm they pass

**Task 3: Implement the minimal fix**
- Objective: The smallest change that makes Task 1's test pass
- Must NOT require changes to Task 2's tests
- Follow the Root Cause Hypothesis from Step 1.2.3

**Task 4: Verify all tests pass**
- Run the full test suite
- Confirm Task 1's test now passes (bug fixed)
- Confirm Task 2's tests still pass (behavior preserved)
- Run linting/type checking

### Task Refinements

- If the bug requires changes to multiple files, split Task 3 into sub-tasks per file
- If the fix is trivial (1-2 lines), Tasks 1-4 can be merged into 2 tasks: (1) write tests, (2) fix and verify
- Always keep test tasks separate from the fix task — this enforces TDD discipline

### Verification Commands

For each task, specify the exact command that proves it's done:
- `uv run pytest tests/path/to/test_bug.py -q` (bug-condition test)
- `uv run pytest tests/path/to/test_preservation.py -q` (preservation tests)
- `uv run pytest -q` (full suite)

---

## Step 1.5: Write Full Bugfix Plan

**Save plan to:** `docs/plans/YYYY-MM-DD-<bug-name>.md`

**Required bugfix plan template:**

```markdown
# [Bug Description] Fix Plan

Created: [Date]
Status: PENDING
Approved: No
Iterations: 0
Worktree: [Yes|No]
Type: Bugfix

> **Status Lifecycle:** PENDING → COMPLETE → VERIFIED
> **Iterations:** Tracks implement→verify cycles (incremented by verify phase)
>
> - PENDING: Initial state, awaiting implementation
> - COMPLETE: All tasks implemented
> - VERIFIED: All checks passed
>
> **Approval Gate:** Implementation CANNOT proceed until `Approved: Yes`
> **Type:** Bugfix — uses property-aware code evolution methodology

## Summary

**Goal:** [One sentence: fix [symptom] when [bug condition]]

**Bug Condition (C):** [Precise input partition or state where bug triggers]

**Postcondition (P):** [What "fixed" looks like — the observable correct outcome]

**Root Cause:** [file/path.py:lineN — brief description of what's wrong and why]

## Bug Report

**Symptom:** [What the user observes — exact error message, wrong output, crash]

**Reproduction Steps:**

1. [Step 1]
2. [Step 2]
3. Expected: [X]
4. Actual: [Y — the bug]

## Behavior Contract

### Must Change (Fix Property: C ⟹ P)

- WHEN [bug condition C] THEN [correct behavior P]

### Must NOT Change (Preservation Property: ¬C ⟹ unchanged)

- WHEN [normal case 1] THEN [current behavior preserved]
- WHEN [normal case 2] THEN [current behavior preserved]
- WHEN [edge case] THEN [current behavior preserved]

## Scope

### In Scope

- [Files to be changed]
- [Tests to be written]

### Out of Scope

- [What will NOT be changed]
- [Related improvements deferred]

## Prerequisites

- [Any requirements before starting]

## Context for Implementer

- **Root cause location:** `file/path.py:lineN` — [explanation]
- **Pattern to follow:** [Reference to existing similar fix in codebase, if applicable]
- **Gotchas:** [Non-obvious dependencies, things that look unrelated but matter]
- **Test files:** [Where to put the new tests, which fixtures to use]

## Progress Tracking

**MANDATORY: Update this checklist as tasks complete. Change `[ ]` to `[x]`.**

- [ ] Task 1: Write bug-condition test (RED)
- [ ] Task 2: Write preservation tests (GREEN)
- [ ] Task 3: Implement minimal fix
- [ ] Task 4: Verify all tests pass

**Total Tasks:** 4 | **Completed:** 0 | **Remaining:** 4

## Implementation Tasks

### Task 1: Write Bug-Condition Test (RED)

**Objective:** Write a test that reproduces the bug. MUST FAIL on current code.

**Dependencies:** None

**Files:**

- Test: `tests/path/to/test_bug_condition.py`

**Key Decisions / Notes:**

- This test directly encodes the Fix Property: C ⟹ P
- Use real inputs that trigger the bug (avoid mocking the bug away)
- [Describe specific test case: inputs, expected output]

**Definition of Done:**

- [ ] Test written for bug condition
- [ ] Test FAILS on current code with the expected error (not a syntax error)
- [ ] Test clearly documents C (condition) and P (postcondition) via test name and assertion

**Verify:**

- `uv run pytest tests/path/to/test_bug_condition.py -q` — test FAILS (red)

---

### Task 2: Write Preservation Tests (GREEN)

**Objective:** Write tests for Must NOT Change scenarios. MUST PASS on current code.

**Dependencies:** None (parallel with Task 1)

**Files:**

- Test: `tests/path/to/test_preservation.py`

**Key Decisions / Notes:**

- Cover the Preservation Property: ¬C ⟹ unchanged
- Test 2-4 normal-path scenarios that the fix must not break
- [List specific preservation scenarios]

**Definition of Done:**

- [ ] Preservation tests written for all Must NOT Change scenarios
- [ ] All preservation tests PASS on current code (green from the start)

**Verify:**

- `uv run pytest tests/path/to/test_preservation.py -q` — all tests PASS (green)

---

### Task 3: Implement Minimal Fix

**Objective:** Smallest change that makes the bug-condition test pass without breaking preservation tests.

**Dependencies:** Task 1, Task 2

**Files:**

- Modify: `file/path.py` (line N)

**Key Decisions / Notes:**

- Root cause: [exact description from Bug Analysis]
- Fix approach: [minimal change to implement]
- Do NOT refactor beyond what the fix requires

**Definition of Done:**

- [ ] Fix implemented at root cause location
- [ ] Bug-condition test now PASSES
- [ ] Preservation tests still PASS
- [ ] No diagnostics errors

**Verify:**

- `uv run pytest tests/path/to/test_bug_condition.py -q` — PASSES (green)
- `uv run pytest tests/path/to/test_preservation.py -q` — still PASSES

---

### Task 4: Verify All Tests Pass

**Objective:** Full suite passes, linting clean.

**Dependencies:** Task 3

**Files:** None (verification only)

**Definition of Done:**

- [ ] Full test suite passes
- [ ] No linting errors
- [ ] No type errors

**Verify:**

- `uv run pytest -q` — all tests pass
- `ruff check . --fix` (Python) or equivalent for the project

## Testing Strategy

- Bug-condition test: Reproduces the exact Bug Condition C (fails on current code)
- Preservation tests: Cover ¬C scenarios (pass on current code, continue to pass after fix)
- Full suite: Catches any regressions introduced by the fix

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
| ---- | ---------- | ------ | ---------- |
| Fix introduces regression in adjacent code | Med | Med | Preservation tests cover normal paths; full suite catches regressions |
| Root cause hypothesis is wrong | Low | Med | Bug-condition test will reveal actual error; adjust hypothesis |

## Goal Verification

### Truths

- Bug condition no longer reproduces the symptom
- All preservation scenarios continue to behave as before
- Full test suite passes

### Artifacts

- `tests/path/to/test_bug_condition.py` — reproduces the bug (now passing)
- `tests/path/to/test_preservation.py` — preservation scenarios (still passing)
- Modified `file/path.py` — minimal fix at root cause location

### Key Links

- Bug-condition test → asserts Fix Property (C ⟹ P)
- Preservation tests → assert Preservation Property (¬C ⟹ unchanged)
- Fix → addresses root cause at `file/path.py:lineN`

## Open Questions

- [Any remaining questions]

### Deferred Ideas

- [Related improvements out of scope for this fix]
```

---

## Step 1.6: Get User Approval

**⛔ MANDATORY APPROVAL GATE**

0. **Send notification:**
   ```bash
   ~/.pilot/bin/pilot notify plan_approval "Bugfix Plan Ready" "<plan-slug> — your approval is needed to proceed with implementation" --plan-path "<plan_path>" 2>/dev/null || true
   ```

1. **Summarize the plan:**
   - Bug being fixed (symptom + root cause)
   - Behavior Contract (Must Change / Must NOT Change)
   - Tasks (test RED → test GREEN → fix → verify)

2. **Use AskUserQuestion:**
   ```
   Question: "Do you approve this bugfix plan for implementation?"
   Header: "Plan Review"
   Options:
     - "Yes, proceed with implementation" - Plan looks good
     - "No, I need to make changes" - Let me edit the plan first
   ```

3. **Based on response:**
   - **Yes:** Update `Approved: No` → `Approved: Yes` in plan, invoke `Skill(skill='spec-implement', args='<plan-path>')`
   - **No:** Tell user to edit plan, wait for "ready", re-read, ask again
   - **Other feedback:** Incorporate into plan, ask again

---

## Continuing Unapproved Bugfix Plans

**When arguments end with `.md` (existing plan path):**

1. Read the plan file, check `Status` and `Approved` fields
2. If `Status: PENDING` and `Approved: No`: resume from wherever planning left off
3. If plan has bug analysis but no tasks yet: proceed to Step 1.4
4. If plan is complete but approval not granted: proceed to Step 1.6

---

## Context Management

Context is managed automatically by auto-compaction. No agent action needed — just keep working.

ARGUMENTS: $ARGUMENTS

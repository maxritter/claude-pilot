---
description: "Spec verification phase - tests, execution, rules audit, code review"
argument-hint: "<path/to/plan.md>"
user-invocable: false
model: opus
hooks:
  Stop:
    - command: uv run python "${CLAUDE_PLUGIN_ROOT}/hooks/spec_verify_validator.py"
---

# /spec-verify - Verification Phase

**Phase 3 of the /spec workflow.** Runs comprehensive verification: tests, process compliance, code review, program execution, E2E tests, and edge case testing.

**Input:** Path to a plan file with `Status: COMPLETE`
**Output:** Plan status set to VERIFIED (success) or looped back to implementation (failure)
**On success:** Workflow complete
**On failure:** → `Skill(skill='spec-implement', args='<plan-path>')` to fix issues

---

## ⛔ KEY CONSTRAINTS (Rules Summary)

| #   | Rule                                                                                                                                                                                                                                                           |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **NEVER SKIP verification** - Code review (Step 3.0/3.5) launches `spec-reviewer-compliance` + `spec-reviewer-quality` via the **Task tool** (`subagent_type="pilot:spec-reviewer-compliance"` and `"pilot:spec-reviewer-quality"`). Mandatory. No exceptions. |
| 2   | **NO stopping** - Everything is automatic. Never ask "Should I fix these?"                                                                                                                                                                                     |
| 3   | **Fix ALL findings automatically** - must_fix AND should_fix. No permission needed.                                                                                                                                                                            |
| 4   | **Quality over speed** - Never rush due to context pressure                                                                                                                                                                                                    |
| 5   | **Plan file is source of truth** - Survives across auto-compaction cycles                                                                                                                                                                                      |
| 6   | **Code changes finish BEFORE runtime testing** - Code review and fixes happen before build/deploy/E2E                                                                                                                                                          |
| 7   | **Re-verification after fixes is MANDATORY** - Fixes can introduce new bugs. Always re-verify.                                                                                                                                                                 |

---

## The Process

The verification process is split into two phases. All code changes (from review findings) happen in Phase A. All runtime testing happens in Phase B against the finalized code.

```
Phase A — Finalize the code:
  Launch Reviewers (parallel) → Tests → Process Compliance → Feature Parity → Call Chain → Collect Review Results → Fix → Re-verify loop

Phase B — Verify the running program:
  Build → Deploy → Code Identity Check → Program Execution → DoD Audit → E2E → Edge Cases

Final:
  Regression check → Update plan status
```

**Why this order:** Code review findings change the code. If you run E2E before code review, you test unfixed code and must re-test after fixes. By finishing all code changes first, E2E tests the final product exactly once.

**All test levels are MANDATORY:** Unit tests alone are insufficient. You must run integration tests AND E2E tests AND execute the actual program with real data.

---

## Phase A: Finalize the Code

### Step 3.0: Launch Code Review Agents (Early Launch)

**⛔ CRITICAL: Launch review agents IMMEDIATELY at the start of Phase A, before any other verification steps.**

This early-launch pattern maximizes efficiency: agents begin reading the plan and reviewing code while the main session continues with automated checks (tests, lint, feature parity, call chain). By the time Step 3.5 collects results, agents are done or nearly done.

#### 3.0a: Identify Changed Files

Get list of files changed in this implementation:

```bash
git status --short  # Shows staged and unstaged changes
```

#### 3.0b: Gather Context for the Reviewers

Collect information needed for actionable findings:

1. **Test framework constraints** — What can/can't the test framework test? (e.g., "SSR-only via renderToString — no client-side effects or state testing possible")
2. **Runtime environment** — How to start the program, what port, where artifacts are deployed
3. **Plan risks section** — Copy the Risks and Mitigations table from the plan (if present)

#### 3.0c: Resolve Session Path for Findings Persistence

**⛔ CRITICAL: Agents write findings to files so they survive agent lifecycle cleanup.**

Background agents' return values can be lost after completion. To guarantee findings are retrievable, each agent writes its JSON to a known file path.

```bash
echo $PILOT_SESSION_ID
```

**⚠️ Validate the session ID is set.** If `$PILOT_SESSION_ID` is empty, fall back to `"default"` to avoid writing to `~/.pilot/sessions//`.

Define output paths (replace `<session-id>` with the resolved value):

- **Compliance findings:** `~/.pilot/sessions/<session-id>/findings-compliance.json`
- **Quality findings:** `~/.pilot/sessions/<session-id>/findings-quality.json`

#### 3.0d: Launch Both Reviewers in Parallel

Spawn 2 agents in parallel using TWO Task tool calls in a SINGLE message. Set `run_in_background=true` on both.

**Agent 1: spec-reviewer-compliance** (plan alignment, DoD, risk mitigations)

```
Task(
  subagent_type="pilot:spec-reviewer-compliance",
  run_in_background=true,
  prompt="""
  **Plan file:** <plan-path>
  **Changed files:** [file list from git status]
  **Output path:** <absolute path to findings-compliance.json>

  **Runtime environment:** [how to start, port, deploy path, etc.]
  **Test framework constraints:** [what the test framework can/cannot test]
  **Plan risks section:** [copy risks table if present, or "None listed"]

  Verify this implementation matches the plan. Check spec compliance, DoD criteria,
  and risk mitigations. Read the plan file first to understand requirements, then
  verify the changed files implement them correctly.

  **IMPORTANT:** Write your final findings JSON to the output_path using the Write tool.
  """
)
```

**Agent 2: spec-reviewer-quality** (code quality, security, testing, performance)

```
Task(
  subagent_type="pilot:spec-reviewer-quality",
  run_in_background=true,
  prompt="""
  **Plan file:** <plan-path>
  **Changed files:** [file list from git status]
  **Output path:** <absolute path to findings-quality.json>

  **Runtime environment:** [how to start, port, deploy path, etc.]
  **Test framework constraints:** [what the test framework can/cannot test]

  Review code quality, security, testing adequacy, performance, and error handling.
  Read all rule files first, then verify the changed files follow all standards.

  **IMPORTANT:** Write your final findings JSON to the output_path using the Write tool.
  """
)
```

The reviewers work in parallel:

- **spec-reviewer-compliance**: Verifies implementation matches plan, DoD criteria met, risk mitigations implemented
- **spec-reviewer-quality**: Verifies code quality, security, testing, performance, error handling

Both agents start immediately and work in the background while Steps 3.1-3.4 proceed.

#### 3.0e: Continue with Automated Checks

**Do NOT wait for agent results.** Proceed immediately to Step 3.1. The agents work in the background while you run tests, linters, feature parity, and call chain analysis.

### Step 3.1: Run & Fix Tests

Run the full test suite (unit + integration) and fix any failures immediately.

**If failures:** Identify → Read test → Fix implementation → Re-run → Continue until all pass

### Step 3.2: Process Compliance Check

Run mechanical verification tools. These check process adherence that the code review agent cannot assess.

**Run each tool and show output:**

1. **Type checker** — `tsc --noEmit` / `basedpyright` / equivalent
2. **Linter** — `eslint` / `ruff check` / equivalent
3. **Coverage** — Run with coverage flag, verify ≥ 80%
4. **Build** — Clean build with no errors

5. **File length** — Check all changed production files (non-test). Any file >300 lines must be refactored (split into focused modules using TDD: write tests first, then extract). Files >500 lines are a hard blocker.

**Fix all errors before proceeding.** Warnings are acceptable; errors are blockers.

**Note:** The review agents (launched in Step 3.0) handle code quality, spec compliance, and rules enforcement. This step only covers mechanical tool checks that produce binary pass/fail results.

### Step 3.3: Feature Parity Check (if applicable)

**For refactoring/migration tasks only:** Verify ALL original functionality is preserved.

**Process:**

1. Compare old implementation with new implementation
2. Create checklist of features from old code
3. Verify each feature exists in new code
4. Run new code and verify same behavior as old code

**If features are MISSING:**

This is a serious issue - the implementation is incomplete.

1. **Add new tasks to the plan file:**
   - Read the existing plan
   - Add new tasks for each missing feature (follow existing task format)
   - Mark new tasks with `[MISSING]` prefix in task title
   - Update the Progress Tracking section with new task count
   - Add note: `> Extended [Date]: Tasks X-Y added for missing features found during verification`

2. **Set plan status to PENDING and increment Iterations:**

   ```
   Edit the plan file:
   Status: COMPLETE  →  Status: PENDING
   Iterations: N     →  Iterations: N+1
   ```

3. **Register status change:** `~/.pilot/bin/pilot register-plan "<plan_path>" "PENDING" 2>/dev/null || true`

4. **Inform user:**

   ```
   🔄 Iteration N+1: Missing features detected, looping back to implement...

   Found [N] missing features that need implementation:
   - [Feature 1]
   - [Feature 2]

   The plan has been updated with [N] new tasks.
   ```

5. **Invoke implementation phase:** `Skill(skill='spec-implement', args='<plan-path>')`

### Step 3.4: Call Chain Analysis

**Perform deep impact analysis for all changes:**

1. **Trace Upwards (Callers):**
   - Identify all code that calls modified functions
   - Verify they handle new return values/exceptions
   - Check for breaking changes in interfaces

2. **Trace Downwards (Callees):**
   - Identify all dependencies of modified code
   - Verify correct parameter passing
   - Check error handling from callees

3. **Side Effect Analysis:**
   - Database state changes
   - Cache invalidation needs
   - External system impacts
   - Global state modifications

### Step 3.5: Collect Review Results

**⛔ THIS STEP IS NON-NEGOTIABLE. You MUST collect and process review findings.**

**⚠️ SKIPPING THIS STEP IS FORBIDDEN.** Even if:

- You're confident the code is correct
- Context is getting high (finish verification first — auto-compact handles context automatically)
- Tests pass (tests don't catch everything)
- The implementation seems simple

**None of these are valid reasons to skip. ALWAYS COLLECT AND PROCESS RESULTS.**

#### 3.5a: Retrieve and Fix Findings Progressively

The two review agents (launched in Step 3.0) should be done or nearly done by now. Their findings are persisted to files in the session directory.

**⛔ NEVER use `TaskOutput` to retrieve agent results.** TaskOutput dumps the full verbose agent transcript (all JSON messages, hook progress, tool calls) into context, wasting thousands of tokens. Instead, poll the output files with the Read tool.

**Progressive polling — fix findings as each agent completes:**

**⚠️ IMPORTANT: Wait between polling attempts.** Run `sleep 10` via Bash before each Read attempt. Agents typically take 3-7 minutes. Rapid-fire Read calls waste context and produce dozens of "file not found" errors.

1. **Wait 10 seconds, then attempt to read BOTH findings files** using the Read tool on the paths defined in Step 3.0c:
   - `~/.pilot/sessions/<session-id>/findings-compliance.json`
   - `~/.pilot/sessions/<session-id>/findings-quality.json`
2. **If neither file exists yet** → run `sleep 10` and retry. Repeat up to 30 times (5 minutes total) before considering the agents failed.
3. **If one file exists but the other doesn't** → start fixing findings from the ready agent immediately (by severity: must_fix → should_fix → suggestion). Track which findings you fixed.
4. After fixing the first batch, **wait 10 seconds and poll for the second file** (retry with `sleep 10` between attempts)
5. When the second file is ready, **skip findings that overlap** with already-fixed items from the first batch (same file + same issue), then fix the remaining findings
6. **If both files are ready simultaneously**, deduplicate first (keep higher severity for duplicates on same file + line), then fix all

**If a findings file is still missing after 30 retries** (agent failed to write):

1. Re-launch that specific agent synchronously (without `run_in_background`) with the same prompt
2. If the synchronous re-launch also fails, log the failure and continue with findings from the other agent only

**Expected timeline:**

- Agents were launched before Step 3.1 (tests, lint, feature parity, call chain)
- Steps 3.1-3.4 typically take 2-5 minutes
- Agents typically complete in 3-7 minutes
- Net result: Agents finish around the same time as Step 3.4, minimal or zero wait time

#### 3.5b: Report Findings

As you collect and fix findings, present them briefly:

```
## Code Verification Complete

**Issues Found:** X

### Must Fix (N) | Should Fix (N) | Suggestions (N)

Implementing fixes automatically...
```

#### 3.5c: Fix Severity Order

**⛔ DO NOT ask user for permission. Fix everything automatically.**

This is part of the automated /spec workflow. The user approved the plan - verification fixes are part of that approval. Never stop to ask "Should I fix these?" or "Want me to address these findings?"

**Implementation order (by severity):**

1. **must_fix issues** - Fix immediately (security, crashes, TDD violations)
2. **should_fix issues** - Fix immediately (spec deviations, missing tests, error handling)
3. **suggestions** - Implement if reasonable and quick

**For each fix:**

1. Implement the fix
2. Run relevant tests to verify
3. Log: "✅ Fixed: [issue title]"

### Step 3.6: Re-verification (Only When Looping Back to Implementation)

Re-verification is **only required when fixes are structural enough to warrant looping back to the implementation phase** (e.g., adding new plan tasks, architectural changes, major logic rewrites).

**Skip re-verification when:** Fixes were localized (terminology cleanup, error handling improvements, test updates, docstring fixes, minor bug fixes). Run tests + lint to confirm fixes don't break anything, then proceed to Phase B.

**Re-verify when:** Fixes required new functionality, changed APIs, modified hook behavior, or added significant new code paths. In this case:

1. Re-run BOTH review agents in parallel (same as Step 3.0d)
2. Fix any new must_fix or should_fix findings
3. Maximum 2 iterations before adding remaining issues to plan

If issues require going back to implementation, add tasks to plan. Then invoke `Skill(skill='spec-implement', args='<plan-path>')`

---

## Phase B: Verify the Running Program

All code is now finalized. No more code changes should happen in this phase (except critical bugs found during execution).

### Step 3.7: Build, Deploy, and Verify Code Identity

**⚠️ CRITICAL: Tests passing ≠ Program works. And building ≠ running your build.**

#### 3.7a: Build

Build/compile the project. Verify zero errors.

#### 3.7b: Deploy (if applicable)

If the project builds artifacts that are deployed separately from source (e.g., bundled JS, compiled binaries, Docker images):

1. Identify where built artifacts are installed (e.g., `~/.claude/pilot/scripts/`)
2. Copy new builds to the installed location
3. Restart any running services that use the old artifacts

**If no separate deployment is needed, skip to 3.7c.**

#### 3.7c: Code Identity Verification (MANDATORY)

**Before testing ANY endpoint or behavior, prove the running instance uses your newly built code.**

1. Identify a behavioral change unique to this implementation (new query parameter, changed response field, new endpoint, different behavior for specific input)
2. Craft a request that ONLY the new code would handle correctly (e.g., filter by nonexistent value should return 0 results; old code returns unfiltered results)
3. Execute the request against the running program
4. **If the response matches OLD behavior** → you are testing stale code
   - Redeploy artifacts
   - Restart the service
   - Re-verify until the response matches NEW behavior
5. **If the response matches NEW behavior** → proceed

**Example:** You added `?project=` filtering. Query `?project=nonexistent-xyz`. New code returns 0 results. Old code ignores the parameter and returns all results. If you see all results, you're testing old code.

**⛔ DO NOT proceed to program execution testing until code identity is confirmed.**

### Step 3.8: Program Execution Verification

Run the actual program and verify real output.

**Execution checklist:**

- [ ] Program starts without errors
- [ ] **Inspect logs** - Check for errors, warnings, stack traces
- [ ] **Verify output correctness** - Fetch source data independently, compare against program output
- [ ] Test with real/sample data, not just mocks

**⛔ Output Correctness - MANDATORY:**
If code processes external data, ALWAYS verify by fetching source data independently and comparing:

```bash
# Fetch actual source data (database query, API call, file contents)
# Compare counts/content with what your code returned
# If mismatch → BUG (don't trust program output alone)
```

**If bugs are found:**

| Bug Type                                                       | Action                                                                                                                      |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Minor** (typo, off-by-one, missing import)                   | Fix immediately, re-run, continue verification                                                                              |
| **Major** (logic error, missing function, architectural issue) | Add task to plan, set PENDING, **⛔ Context Guard** (spec.md 0.3), then `Skill(skill='spec-implement', args='<plan-path>')` |

### Step 3.9: Goal Verification and DoD Audit

**Task completion ≠ Goal achievement.** A task can be marked "done" (file created, test passes) while the plan's actual goal remains unmet. Verify both levels.

#### 3.9a: Goal-Backward Verification

Read the plan's **Summary/Goal** section. Work backwards from the intended outcome:

1. **What must be TRUE** for the goal to be achieved? (e.g., "users can filter by project")
2. **What must EXIST** for those truths to hold? (e.g., filter component, API parameter, query logic)
3. **What must be WIRED** for those artifacts to function? (e.g., component imported, route registered, state connected)

Verify each level against the actual codebase and running program. If any level fails, the goal is not achieved regardless of task completion status.

#### 3.9b: Per-Task DoD Audit

**For EACH task in the plan**, read its Definition of Done criteria and verify each criterion is met with evidence from the running program.

```markdown
### Task N: [title]

- [ ] DoD criterion 1 → [evidence: command output / API response / screenshot]
- [ ] DoD criterion 2 → [evidence]
      ...
```

**If any criterion is unmet (at either goal or task level):**

- If fixable inline → fix immediately
- If structural → add task to plan and loop back to implementation

### Step 3.10: E2E Verification (MANDATORY for apps with UI/API)

**⚠️ Unit + Integration tests are NOT enough. You MUST also run E2E tests.**

#### 3.10a: Happy Path Testing

Test the primary user workflow end-to-end.

**For APIs:** Test endpoints with curl. Verify status codes, response content, and state changes.

**For Frontend/UI:** Use `playwright-cli` to verify UI renders and workflows complete. See `~/.claude/rules/playwright-cli.md`.

Walk through the main user scenario described in the plan. Every view, every interaction, every state transition.

#### 3.10b: Edge Case and Negative Testing

After the happy path passes, test failure modes. **This is not optional.**

| Category          | What to test                                    | Example                                                          |
| ----------------- | ----------------------------------------------- | ---------------------------------------------------------------- |
| **Empty state**   | No data, no items, no results                   | Empty database, no projects, search returns nothing              |
| **Invalid input** | Bad parameters, wrong types                     | SQL injection in query params, empty strings, special characters |
| **Stale state**   | Cached/stored data references something deleted | localStorage has project name that no longer exists              |
| **Error state**   | Backend unreachable, API returns error          | What does the UI show when fetch fails?                          |
| **Boundary**      | Maximum values, zero values, single item        | Exactly 1 project, 0 observations, 100-char project name         |

For each edge case:

1. Set up the condition
2. Exercise the UI/API
3. Verify the result is reasonable (not blank, not broken, not stuck, no unhandled errors)

### Step 3.11: Final Regression Check

Run the test suite and type checker one final time to catch any regressions from Phase B fixes (if any code changed during execution/E2E testing):

1. Run full test suite — all pass
2. Run type checker — zero errors
3. Verify build still succeeds

**If no code changed during Phase B** (no bugs found during execution/E2E), this confirms the same green state from Phase A. Still run it — it's cheap insurance.

### Step 3.11b: Worktree Sync (if worktree is active)

**After all verification passes, sync worktree changes back to the original branch with user approval.**

This is the THIRD user interaction point in the `/spec` workflow (first is worktree choice, second is plan approval).

1. **Extract plan slug** from the plan file path:
   - `docs/plans/2026-02-09-add-auth.md` → plan_slug = `add-auth` (strip date prefix and `.md`)

2. **Check for active worktree:**

   ```bash
   ~/.pilot/bin/pilot worktree detect --json <plan_slug>
   # Returns: {"found": true, "path": "...", "branch": "...", "base_branch": "..."} or {"found": false}
   ```

3. **If no worktree is active** (`"found": false`): Skip to Step 3.12 (this is a non-worktree spec run or worktree was already synced).

4. **Pre-sync: Check working tree is clean (MANDATORY)**

   The sync requires a clean working tree on the base branch. Check now and stop if dirty:

   ```bash
   git -C <project_root> status --porcelain
   ```

   **If output is non-empty (dirty working tree):**
   - Report to user: "Cannot sync: the main branch has uncommitted changes. Please commit or `git stash` them first, then re-run `/spec <plan_path>` to resume verification."
   - Do NOT proceed with sync. Step 3.12 will loop back to implementation.

5. **Save plan file to project root (MANDATORY)**

   Plan files are gitignored and live only in the worktree. Copy the plan to the project root before deleting the worktree so it persists locally for reference.

   ```bash
   # plan_path is the worktree-relative path, e.g. .worktrees/spec-slug-hash/docs/plans/2026-02-09-slug.md
   # Compute the destination in the project root:
   mkdir -p <project_root>/docs/plans
   cp <worktree_plan_path> <project_root>/docs/plans/<plan_filename>
   ```

   This file is gitignored and will NOT be committed. It stays on disk for local reference only.

6. **Show diff summary:**

   ```bash
   ~/.pilot/bin/pilot worktree diff --json <plan_slug>
   # Returns JSON with changed files list
   ```

7. **Ask user for sync decision:**

   ```
   AskUserQuestion:
     question: "Sync worktree changes to <base_branch>?"
     options:
       - "Yes, squash merge" (Recommended) — Merge all changes as a single commit on <base_branch>
       - "No, keep worktree" — Leave the worktree intact for manual review
       - "Discard all changes" — Remove worktree and branch without merging
   ```

8. **Handle user choice:**

   **If "Yes, squash merge":**

   ```bash
   ~/.pilot/bin/pilot worktree sync --json <plan_slug>
   # Returns: {"success": true, "files_changed": N, "commit_hash": "..."} or {"success": false, "error": "..."}
   ```

   If sync fails (e.g. merge conflict), report the error and ask user to resolve manually.

   If sync succeeds, clean up **and immediately cd back** in the SAME bash invocation. The shell CWD will be invalid after the worktree is deleted — combining them prevents the broken-shell issue:

   ```bash
   PROJECT_ROOT=$(~/.pilot/bin/pilot worktree cleanup --force --json <plan_slug> | python3 -c "import sys,json; print(json.load(sys.stdin)['project_root'])") && cd "$PROJECT_ROOT"
   ```

   **⛔ NEVER call cleanup and cd in separate Bash tool calls.** Deleting the worktree invalidates the shell's CWD. Every subsequent Bash call will fail with exit code 1 until the session restarts.

   Report: "Changes synced to `<base_branch>` — N files changed, commit `<hash>`"

   **If "No, keep worktree":**
   Report: "Worktree preserved at `<worktree_path>`. You can sync later via `pilot worktree sync <plan-slug>` or discard via `pilot worktree cleanup <plan-slug>`."

   **If "Discard all changes":**

   Combine cleanup + cd in a SINGLE bash call (same reason as above):

   ```bash
   PROJECT_ROOT=$(~/.pilot/bin/pilot worktree cleanup --force --json <plan_slug> | python3 -c "import sys,json; print(json.load(sys.stdin)['project_root'])") && cd "$PROJECT_ROOT"
   ```

   Report: "Worktree and branch discarded."

### Step 3.12: Update Plan Status

**Status Lifecycle:** `PENDING` → `COMPLETE` → `VERIFIED`

**When ALL verification passes (no missing features, no bugs, rules compliant):**

1. **MANDATORY: Update plan status to VERIFIED**
   ```
   Edit the plan file and change the Status line:
   Status: COMPLETE  →  Status: VERIFIED
   ```
2. **Register status change:** `~/.pilot/bin/pilot register-plan "<plan_path>" "VERIFIED" 2>/dev/null || true`
3. Read the Iterations count from the plan file
4. Report completion:

   ```
   ✅ Workflow complete! Plan status: VERIFIED

   Summary:
   - [Brief summary of what was implemented]
   - [Key files created/modified]
   - [Test results]

   Is there anything else you'd like me to help with?
   ```

**When verification FAILS (missing features, serious bugs, or unfixed rule violations):**

1. Add new tasks to the plan for missing features/bugs
2. **Set status back to PENDING and increment Iterations:**
   ```
   Edit the plan file:
   Status: COMPLETE  →  Status: PENDING
   Iterations: N     →  Iterations: N+1
   ```
3. **Register status change:** `~/.pilot/bin/pilot register-plan "<plan_path>" "PENDING" 2>/dev/null || true`
4. Inform user: "🔄 Iteration N+1: Issues found, fixing and re-verifying..."
5. **Invoke implementation phase:** `Skill(skill='spec-implement', args='<plan-path>')`

---

## Context Management

Context is managed automatically by auto-compaction. No agent action needed — just keep working.

ARGUMENTS: $ARGUMENTS

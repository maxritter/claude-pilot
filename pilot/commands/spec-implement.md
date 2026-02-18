---
description: "Spec implementation phase - TDD loop for each task in the plan"
argument-hint: "<path/to/plan.md>"
user-invocable: false
model: sonnet
---

# /spec-implement - Implementation Phase

**Phase 2 of the /spec workflow.** Reads the approved plan and implements each task using TDD (Red → Green → Refactor).

**Input:** Path to an approved plan file (`Approved: Yes`)
**Output:** All plan tasks completed, status set to COMPLETE
**Next phase:** On completion → `Skill(skill='spec-verify', args='<plan-path>')`

---

## ⛔ KEY CONSTRAINTS (Rules Summary)

| #   | Rule                                                                                                                                                                               |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **NO sub-agents** - Use direct tools only. All tasks are implemented sequentially in the main context.                                                                             |
| 2   | **TDD is MANDATORY** - No production code without failing test first                                                                                                               |
| 3   | **Update plan checkboxes AND task status after EACH task** - Not at the end                                                                                                        |
| 4   | **NEVER SKIP TASKS** - Every task MUST be fully implemented                                                                                                                        |
| 5   | **Quality over speed** - Never rush due to context pressure                                                                                                                        |
| 6   | **Plan file is source of truth** - Survives across auto-compaction cycles                                                                                                                         |
| 7   | **NEVER assume - verify by reading files**                                                                                                                                         |
| 8   | **Task management is MANDATORY** - Use TaskCreate/TaskUpdate for progress tracking                                                                                                 |

---

## Quality Over Speed - CRITICAL

**NEVER rush or compromise quality due to context pressure.**

- Context warnings are informational, not emergencies
- Work spans sessions seamlessly via plan file and continuation mechanisms
- Finish the CURRENT task with full quality — auto-compact will handle context seamlessly
- Do NOT skip tests, compress code, or cut corners to "beat" context limits
- **Quality is the #1 metric** - a well-done task split across sessions beats rushed work

## Feedback Loop Awareness

**This phase may be called multiple times in a feedback loop:**

```
spec-implement → spec-verify → issues found → spec-implement → spec-verify → ... → VERIFIED
```

**When called after verification found issues:**

1. Read the plan - verification will have added fix tasks (marked with `[MISSING]` or similar)
2. Check the `Iterations` field in the plan header
3. **Report iteration start:** "🔄 Starting Iteration N implementation..."
4. Focus on uncompleted tasks `[ ]` - these are the fixes needed
5. Complete all fix tasks, then set status to COMPLETE as normal

---

### Step 2.1: Read Plan & Gather Context

**Before ANY implementation, you MUST:**

1. **Read the COMPLETE plan** - Understanding overall architecture and design
2. **Verify comprehension** - Summarize what you learned to demonstrate understanding
3. **Identify dependencies** - List files, functions, classes that need modification
4. **Check current state:**
   - Git status: `git status --short` and `git diff --name-only`
   - Plan progress: Check for `[x]` completed tasks

#### 🔧 Tools for Implementation

| Tool         | When to Use              | Example                                                                                                     |
| ------------ | ------------------------ | ----------------------------------------------------------------------------------------------------------- |
| **Context7** | Library API lookup       | `resolve-library-id(query="how to use fixtures", libraryName="pytest")` then `query-docs(libraryId, query)` |
| **Vexor**    | Find similar patterns    | `vexor search "query" --mode code`                                                                          |
| **grep-mcp** | Production code examples | `searchGitHub(query="useEffect cleanup", language=["TypeScript"])`                                          |

---

### Step 2.1b: Detect or Resume Worktree (Conditional)

**Check the plan's `Worktree:` header field to determine isolation mode.**

0. **Read the `Worktree:` header from the plan file:**
   - Parse `Worktree: Yes` or `Worktree: No` from the plan content (regex: `/^Worktree:\s*(\w+)/m`)
   - If the field is missing, default to `No`
   - **If `Worktree: No` (or missing/default):** Skip the rest of Step 2.1b entirely. Implementation happens directly on the current branch. Proceed to Step 2.2.

**If `Worktree: Yes`:** All implementation happens in an isolated git worktree. The worktree is normally created during the planning phase (`spec-plan`), so it should already exist with the plan file inside it.

1. **Extract plan slug** from the plan file path:
   - `docs/plans/2026-02-09-add-auth.md` → plan_slug = `add-auth` (strip date prefix and `.md`)

2. **Detect existing worktree:**

   ```bash
   ~/.pilot/bin/pilot worktree detect --json <plan_slug>
   # Returns: {"found": true, "path": "...", "branch": "...", "base_branch": "..."} or {"found": false}
   ```

3. **If worktree exists** (`"found": true`): Resume it — `cd` to the `path` from the JSON output for all subsequent commands.

4. **If no worktree exists** (`"found": false`): Create one as fallback (handles plans created before early worktree creation was added, or edge cases):

   ```bash
   ~/.pilot/bin/pilot worktree create --json <plan_slug>
   # Returns: {"path": "...", "branch": "spec/<slug>", "base_branch": "main"}
   ```

   Then `cd` to the `path` from the JSON output for all subsequent commands.

   **Copy the plan file into the worktree** if it doesn't exist there:
   ```bash
   cp <plan_path_on_main> <worktree_path>/<relative_plan_path>
   ```

   **Note:** If the working tree has uncommitted changes, `worktree create` auto-stashes them before creation and restores them after. No user intervention needed.

5. **If creation fails due to old git version** (error contains "git >= 2.15 required"): Log a warning and continue without worktree isolation. Implementation will happen directly on the current branch. This is a graceful fallback for systems with older git versions.

6. **Verify worktree is active:** Run `git branch --show-current` in the worktree to confirm you're on the `spec/<plan_slug>` branch.

**⚠️ All subsequent implementation steps happen inside the worktree directory (when worktree is active).** The plan file exists at the same relative path in the worktree (e.g., `docs/plans/...`). Commits within the worktree are expected and allowed.

---

### Step 2.2: Set Up Task List (MANDATORY)

**After reading the plan, set up task tracking using the Task management tools.**

This makes implementation progress visible in the terminal (Ctrl+T), enables dependency tracking, and persists across auto-compactions via `CLAUDE_CODE_TASK_LIST_ID`.

**Process:**

1. **Check for existing tasks first:** Run `TaskList` to see if a previous session already created tasks
2. **Branch based on result:**

**If TaskList returns tasks (continuation session):**

- Tasks already exist from a prior session - do NOT recreate them
- Review existing task statuses to understand where the previous session left off
- Cross-reference with plan checkboxes (`[x]` = done, `[ ]` = remaining)
- If a task is `in_progress` but the session that started it is gone, it was interrupted - keep it `in_progress` and resume it
- Proceed to Step 2.3 starting with the first uncompleted task

**If TaskList is empty (fresh start):**

- Create one task per uncompleted plan task (`[ ]` items):
  ```
  TaskCreate(
    subject="Task N: <title from plan>",
    description="<objective + implementation steps from plan>",
    activeForm="Implementing <short description>"
  )
  ```
- Set up dependencies if tasks have ordering requirements:
  ```
  TaskUpdate(taskId="<task3_id>", addBlockedBy=["<task2_id>"])
  ```
- Skip already-completed plan tasks (`[x]` items) - don't create tasks for them

**Example for a fresh start with 4 tasks:**

```
TaskCreate: "Task 1: Create user model"           → id=1
TaskCreate: "Task 2: Add API endpoints"            → id=2, addBlockedBy: [1]
TaskCreate: "Task 3: Write integration tests"      → id=3, addBlockedBy: [2]
TaskCreate: "Task 4: Add documentation"            → id=4, addBlockedBy: [2]
```

**Why this matters:**

- User sees real-time progress in their terminal via status spinners
- Dependencies prevent skipping ahead when tasks have ordering requirements
- Tasks persist across auto-compactions (stored in `~/.claude/tasks/`)
- Continuation sessions pick up exactly where the previous session left off

---

### Step 2.3: TDD Loop

**TDD is MANDATORY. No production code without a failing test first.**

| Requires TDD          | Skip TDD                          |
| --------------------- | --------------------------------- |
| New functions/methods | Documentation changes             |
| API endpoints         | Config file updates               |
| Business logic        | IaC code (CDK, Terraform, Pulumi) |
| Bug fixes             | Formatting/style changes          |

**For EVERY task, follow this exact sequence:**

1. **READ PLAN'S IMPLEMENTATION STEPS** - List all files to create/modify/delete
2. **Perform Call Chain Analysis:**
   - **Trace Upwards (Callers):** Identify what calls the code you're modifying
   - **Trace Downwards (Callees):** Identify what the modified code calls
   - **Side Effects:** Check for database, cache, external system impacts
3. **Mark task as `in_progress`** - `TaskUpdate(taskId="<id>", status="in_progress")`
4. **Execute TDD Flow (RED → GREEN → REFACTOR):**
   - Write failing test first, **verify it fails**
   - Implement minimal code to pass
   - Refactor if needed (keep tests green)
5. **Verify tests pass** - Run the project's test runner (e.g., `uv run pytest -q`, `bun test`, `npm test`)
6. **Run actual program** - Use the plan's Runtime Environment section to start the service/program. Show real output with sample data.
7. **Check diagnostics** - Must be zero errors
8. **Validate Definition of Done** - Check all criteria from plan
9. **Per-task commit (worktree mode only)** - If `Worktree: Yes` in the plan, commit task changes immediately:
   ```bash
   git add <task-specific-files>  # Stage only files related to this task
   git commit -m "{type}(spec): {task-name}"
   ```
   Use `feat(spec):` for new features, `fix(spec):` for bug fixes, `test(spec):` for test-only tasks, `refactor(spec):` for refactoring. Skip this step when `Worktree: No` (normal git rules apply).
10. **Mark task as `completed`** - `TaskUpdate(taskId="<id>", status="completed")`
11. **UPDATE PLAN FILE IMMEDIATELY** (see Step 2.4)

**⚠️ NEVER SKIP TASKS:**

- EVERY task MUST be fully implemented
- NO exceptions for "MVP scope" or complexity
- If blocked: STOP and report specific blockers
- NEVER mark complete without doing the work

---

### Step 2.4: Update Plan After EACH Task

**⛔ CRITICAL: Task Completion Tracking is MANDATORY**

**After completing EACH task, you MUST:**

1. **IMMEDIATELY edit the plan file** to change `[ ]` to `[x]` for that task
2. **Update the Progress Tracking counts** (Completed/Remaining)
3. **DO NOT proceed to next task** until the checkbox is updated

**This is NON-NEGOTIABLE.**

**Example - After completing Task 5:**

```
Edit the plan file:
- [ ] Task 5: Implement X  →  - [x] Task 5: Implement X
Update counts:
**Completed:** 4 | **Remaining:** 8  →  **Completed:** 5 | **Remaining:** 7
```

---

### Step 2.5: All Tasks Complete → Verification

**⚠️ CRITICAL: Follow these steps exactly:**

1. Quick verification: Check diagnostics and run the project's test suite
2. **FOR MIGRATIONS ONLY - Feature Parity Check:**
   - Run the NEW code and verify it produces expected output
   - Compare behavior with OLD code (if still available)
   - Check Feature Inventory - every feature should now be implemented
   - If ANY feature is missing: **DO NOT mark complete** - add tasks for missing features
3. **MANDATORY: Update plan status to COMPLETE**
   ```
   Edit the plan file and change the Status line:
   Status: PENDING  →  Status: COMPLETE
   ```
4. **Register status change:** `~/.pilot/bin/pilot register-plan "<plan_path>" "COMPLETE" 2>/dev/null || true`
5. **Invoke verification phase:** `Skill(skill='spec-verify', args='<plan-path>')`

---

## ⚠️ Migration/Refactoring Tasks (Phase 2 Additions)

**When the plan involves replacing existing code, perform these ADDITIONAL checks:**

### Before Starting Implementation

1. **Locate the Feature Inventory section** in the plan
2. **If Feature Inventory is MISSING** - STOP and inform user
3. **Verify ALL features are mapped** - Every row must have a Task #
4. **Read the OLD code completely** - Don't rely on the plan alone

### During Implementation

For EACH task that migrates old functionality:

1. **Read the corresponding old file(s)** listed in Feature Inventory
2. **Create a checklist** of functions/behaviors from old code
3. **Verify each function/behavior exists** in new code after implementation
4. **Test with same inputs** - Old and new code should produce same outputs

### Before Marking Task Complete

**For migration tasks, add this to Definition of Done:**

- [ ] All functions from old code have equivalents in new code
- [ ] Behavior matches old code (same inputs → same outputs)
- [ ] No features accidentally omitted

### Red Flags - STOP Implementation

If you notice ANY of these, STOP and report to user:

- Feature Inventory section missing from plan
- Old file has functions not mentioned in any task
- "Out of Scope" items that should actually be migrated
- Tests pass but functionality is missing compared to old code

---

## Context Management

Context is managed automatically by auto-compaction. No agent action needed — just keep working.

ARGUMENTS: $ARGUMENTS

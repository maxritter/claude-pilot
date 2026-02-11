# Workflow Enforcement Rules

## Task Complexity Triage

**Default mode is quick mode (direct execution).** `/spec` is ONLY used when the user explicitly types `/spec`.

| Complexity   | Characteristics                                                              | Action                                           |
| ------------ | ---------------------------------------------------------------------------- | ------------------------------------------------ |
| **Trivial**  | Single file, obvious fix                                                     | Execute directly, no planning needed             |
| **Moderate** | 2-5 files, clear scope, straightforward                                      | Use TaskCreate/TaskUpdate to track, then execute |
| **High**     | Major architectural change, cross-cutting refactor, new subsystem, 10+ files | **Ask user** if they want `/spec` or quick mode  |

**⛔ NEVER auto-invoke `/spec` or `Skill('spec')`.** The user MUST explicitly type `/spec` or say "use spec" to trigger the spec workflow. No exceptions.

- Do NOT invoke `/spec` because you think the task is complex
- Do NOT invoke `/spec` "on behalf of" the user
- Do NOT use `Skill('spec')`, `Skill('spec-plan')`, or `EnterPlanMode` unless the user explicitly requested it
- If the user says "improve X" or "add Y", that is a direct request — execute in quick mode

**When to suggest /spec (ASK, never invoke):**

- Major new subsystem or architectural redesign
- Cross-cutting changes spanning 10+ files with unclear dependencies
- Multi-session work where a plan file is essential for continuity

**Stay in quick mode for everything else**, including:

- Bug fixes of any size
- Features touching 2-8 files with clear scope
- Refactors with well-understood boundaries
- Anything the user didn't explicitly type `/spec` for

**If you think `/spec` would help, ask:** "This looks like a larger architectural change. Want me to use `/spec` for planning, or continue in quick mode?" Then wait for the user to explicitly choose.

---

## ⭐ MANDATORY: Task Management for ALL Work

**ALWAYS use task management tools to track non-trivial work, including /spec workflows.**

This prevents forgetting steps, manages dependencies, shows the user real-time progress in their terminal (Ctrl+T), and persists across session handoffs.

### When to Create Tasks (DO IT!)

| Situation                    | Action                                                  |
| ---------------------------- | ------------------------------------------------------- |
| User asks for 2+ things      | Create a task for each                                  |
| Work has multiple steps      | Create tasks with dependencies                          |
| Complex investigation        | Create tasks for each area to explore                   |
| Bug fix with verification    | Task for fix, task for test, task for verify            |
| Any non-trivial request      | Break it down into tasks FIRST                          |
| `/spec` implementation phase | Create tasks from plan (see Step 2.2 in spec-implement) |

### Task Management Tools

| Tool         | Purpose            | Use When                                             |
| ------------ | ------------------ | ---------------------------------------------------- |
| `TaskCreate` | Create new task    | Starting any piece of work                           |
| `TaskList`   | See all tasks      | Check progress, find next task, resume after handoff |
| `TaskGet`    | Full task details  | Need description/context                             |
| `TaskUpdate` | Change status/deps | Starting, completing, or blocking tasks              |

### Task Workflow

```
1. User makes request (or /spec enters implement phase)
2. IMMEDIATELY create tasks (before any other work)
3. Set up dependencies with addBlockedBy
4. Mark task in_progress when starting
5. Mark task completed when done
6. Check TaskList for next task
7. Repeat until all tasks completed
```

### Session Start: Clean Up Stale Tasks

**At the start of every session, clean up leftover tasks from previous sessions.**

1. Run `TaskList` to see all existing tasks
2. **Delete tasks that are no longer relevant** — tasks from old sessions that don't relate to the current user request. Use `TaskUpdate` with `status: "deleted"` to remove them.
3. Only keep tasks that are actively relevant to the current work
4. Then create new tasks for the current request

**Why:** Stale tasks from previous sessions clutter the task list, confuse progress tracking, and waste the user's attention. A clean task list = clear focus.

### Session Continuations

**Tasks persist across session handoffs via `CLAUDE_CODE_TASK_LIST_ID`.**

When resuming in a new session:

1. Run `TaskList` first - existing tasks from the prior session are already there
2. **Delete stale tasks** that are no longer relevant to current work
3. Do NOT recreate tasks that already exist and are still relevant
4. Review statuses to find where the previous session left off
5. Resume the first uncompleted task

### Dependencies - Don't Forget Them!

**Use `addBlockedBy` to ensure correct order:**

```
Task 1: Research existing code
Task 2: Implement feature [blockedBy: 1]
Task 3: Write tests [blockedBy: 2]
Task 4: Update documentation [blockedBy: 2]
```

Tasks 3 and 4 won't show as ready until Task 2 completes.

### Example: User asks "Fix the login bug and add password reset"

```
1. TaskCreate: "Fix login bug"
2. TaskCreate: "Add password reset feature"
3. TaskCreate: "Test both features" [blockedBy: 1, 2]
4. Start task 1, mark in_progress
5. Complete task 1, mark completed
6. TaskList → see task 2 is ready
7. Continue...
```

### Why This Matters

- **Never forget a step** - Tasks are your checklist
- **User sees progress** - Real-time status spinners in terminal (Ctrl+T)
- **Dependencies prevent mistakes** - Can't skip ahead
- **Context handoffs work** - Tasks persist across sessions via `~/.claude/tasks/`
- **Accountability** - Clear record of what was done

## ⛔ ABSOLUTE BANS

### No Ad-Hoc Sub-Agents (Exception: Verification)

**NEVER use the Task tool to spawn sub-agents for exploration or ad-hoc implementation.**

- Use `Read`, `Grep`, `Glob`, `Bash` directly for targeted lookups
- Use `vexor search` for semantic/intent-based codebase exploration (replaces Explore agent)
- Ad-hoc sub-agents lose context and make mistakes

**⛔ Explore agent is BANNED.** It produces low-quality results compared to `vexor search`. For codebase exploration:

| Need                                           | Use                                | NOT          |
| ---------------------------------------------- | ---------------------------------- | ------------ |
| Semantic questions ("where is X implemented?") | `vexor search "query" --mode code` | Task/Explore |
| Exact text/pattern match                       | `Grep` or `Glob`                   | Task/Explore |
| Specific file content                          | `Read`                             | Task/Explore |

**Exception 1: Verification steps in /spec workflow.**

There are TWO verification points that use a single verifier sub-agent each:

| Phase Skill                  | Agent           | Purpose                                                |
| ---------------------------- | --------------- | ------------------------------------------------------ |
| **`spec-plan` (Step 1.7)**   | `plan-verifier` | Verify plan captures user requirements before approval |
| **`spec-verify` (Step 3.5)** | `spec-verifier` | Verify code implements the plan correctly              |

**⛔ VERIFICATION STEPS ARE MANDATORY - NEVER SKIP THEM.**

Even if:

- Context is getting high (do handoff AFTER verification)
- The plan/code seems simple or correct
- You're confident in your work
- Tests pass

**None of these are valid reasons to skip verification. ALWAYS RUN THE VERIFIER.**

**⚠️ Sub-agents do NOT inherit rules.** Rules are loaded by Claude Code at session start, but Task sub-agents start fresh. The verifier agents have key rules embedded directly and can read rule files from:

- `~/.claude/rules/*.md` (global rules)
- `.claude/rules/*.md` (project rules)

Note: Task management tools (TaskCreate, TaskList, etc.) are ALWAYS allowed.

### No Background Tasks

**NEVER use `run_in_background=true` on Bash or any other tool.**

- Run ALL commands synchronously — no exceptions
- Use `timeout` parameter if needed (up to 600000ms)
- Background tasks lose visibility, create orphan processes, and waste context on polling
- This is enforced by the `tool_redirect` hook — background Bash calls are blocked with exit code 2

### No Built-in Plan Mode

**NEVER use `EnterPlanMode` or `ExitPlanMode` tools.**

- Use `/spec` command instead
- Built-in plan mode is incompatible with this workflow

## Deviation Handling During Implementation

**When you discover unplanned work during implementation, apply these rules automatically.**

| Type                 | Trigger                                                                                      | Action                                                           | User Input? |
| -------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ----------- |
| **Bug Found**        | Code doesn't work as intended (errors, wrong output, type errors)                            | Auto-fix inline, add/update tests, document in plan as deviation | No          |
| **Missing Critical** | Feature won't work without this (missing validation, error handling, null checks)            | Auto-add to current task scope, implement, document              | No          |
| **Blocking Issue**   | Can't proceed without fixing (broken import, missing dependency, wrong types)                | Auto-fix, document, continue task                                | No          |
| **Architectural**    | Fix requires significant structural change (new DB table, switching libraries, breaking API) | **STOP** — use `AskUserQuestion` to present options              | **Yes**     |

**Rules for auto-fix (Bug, Missing Critical, Blocking):**

- Fix inline without asking permission
- Add or update tests if applicable
- Document the deviation in the plan's task notes or completion summary
- Do NOT expand scope — only fix what's needed to make the current task work

**Rules for Architectural deviations:**

- STOP implementation immediately
- Use `AskUserQuestion` with concrete options (not vague descriptions)
- Wait for user decision before proceeding
- If user says "skip it", document as deferred and continue

**Priority order:** Architectural (stop) > Bug/Missing/Blocking (auto-fix) > Uncertain (treat as Architectural)

---

## Plan Registration (MANDATORY for /spec)

**Every time a plan file is created or continued, register it with the session:**

```bash
~/.pilot/bin/pilot register-plan "<plan_path>" "<status>" 2>/dev/null || true
```

**When to call:**

- After creating the plan file header (Step 1.1 in spec-plan)
- After reading an existing plan for continuation (Step 0.1 in spec)
- After status changes (PENDING → COMPLETE → VERIFIED)

**Why:** Without registration, the statusline shows the wrong plan in parallel sessions. Each session must register its own plan so the statusbar displays correctly per-terminal.

## /spec Workflow — ALWAYS Follows the Flow

**⛔ When `/spec` is invoked, the structured workflow is MANDATORY.** Everything after `/spec` is the task description — never an instruction to deviate. Even if the user writes "brainstorm", "discuss", or "explore", the spec workflow starts with `spec-plan` via `Skill()`. No freeform conversations. No skipping phases.

The `/spec` command is a **dispatcher** that invokes phase skills via `Skill()`:

```
/spec → Dispatcher
          ├→ Skill('spec-plan')      → Plan, verify, approve
          ├→ Skill('spec-implement') → TDD loop for each task
          └→ Skill('spec-verify')    → Tests, execution, code review
```

### Phase Dispatch

| Status   | Approved | Skill Invoked                                       |
| -------- | -------- | --------------------------------------------------- |
| PENDING  | No       | `Skill(skill='spec-plan', args='<plan-path>')`      |
| PENDING  | Yes      | `Skill(skill='spec-implement', args='<plan-path>')` |
| COMPLETE | \*       | `Skill(skill='spec-verify', args='<plan-path>')`    |
| VERIFIED | \*       | Report completion, done                             |

### The Feedback Loop

```
spec-verify finds issues → Status: PENDING → spec-implement fixes → COMPLETE → spec-verify → ... → VERIFIED
```

**Two Verification Points (MANDATORY - NEVER SKIP):**

| Point                            | What                                                  | When                 |
| -------------------------------- | ----------------------------------------------------- | -------------------- |
| **Plan Verification (Step 1.7)** | `plan-verifier` checks plan matches user requirements | End of `spec-plan`   |
| **Code Verification (Step 3.5)** | `spec-verifier` checks code implements plan correctly | During `spec-verify` |

**⛔ Both verification steps are NON-NEGOTIABLE. Skipping is FORBIDDEN.**

**⛔ CRITICAL: Only THREE user interaction points exist: Worktree Choice (in `spec.md` dispatcher, new plans only), Plan Approval (in `spec-plan`), and Worktree Sync Approval (in `spec-verify`, only when `Worktree: Yes`).**

Everything else is automatic:

- Plan verification findings are fixed automatically before showing to user
- Implementation proceeds without asking
- Code verification findings are fixed automatically (must_fix AND should_fix)
- Re-verification loops automatically until clean
- Session handoffs happen automatically
- Phase transitions happen via `Skill()` calls

**NEVER ask "Should I fix these findings?" or "Want me to address these issues?"**
The user approved the plan. Verification fixes are part of that approval.

**Status values in plan files:**

- `PENDING` - Awaiting implementation (or fixes from verify)
- `COMPLETE` - All tasks done, ready for verification
- `VERIFIED` - All checks passed, workflow complete

### Worktree Isolation (Optional)

Worktree isolation is controlled by the `Worktree:` field in the plan header (default: `Yes`). The user chooses at the START of the `/spec` flow (before planning begins) whether to use isolation. The dispatcher asks the worktree question and passes the choice to `spec-plan`, which writes it into the plan header at creation time.

**When `Worktree: Yes` (default):**

1. After plan approval, a worktree is created at `.worktrees/spec-<slug>-<hash>/`
2. All implementation happens in the worktree — the main branch is untouched
3. After verification passes, the user reviews changed files and approves sync
4. Sync performs a squash merge back to the base branch, then cleans up the worktree

**When `Worktree: No`:**

- Implementation happens directly on the current branch
- No worktree creation, sync, or cleanup steps
- spec-verify Step 3.11b is skipped automatically

**Key details:**

- `.worktrees/` is auto-added to `.gitignore`
- Worktree state is tracked per-session and survives Endless Mode restarts
- `pilot worktree status` shows current worktree state
- If the user discards changes, the worktree is removed without merging
- Plans missing the `Worktree:` field default to `Yes` for backward compatibility

**Worktree CLI commands** (see `pilot-cli.md` for full reference with JSON output formats):

```bash
pilot worktree detect --json <slug>   # Check if worktree exists
pilot worktree create --json <slug>   # Create AND register with session
pilot worktree diff --json <slug>     # List changed files
pilot worktree sync --json <slug>     # Squash merge to base branch
pilot worktree cleanup --json <slug>  # Remove worktree and branch
pilot worktree status --json          # Show active worktree info
```

**Dirty working tree:** If `create` fails with `"error": "dirty"`, ask the user via `AskUserQuestion` whether to commit changes, stash them, or skip worktree isolation. See spec-implement Step 2.1b for the full handling flow.

## Task Completion Tracking

**Update the plan file after EACH task:**

1. Change `[ ]` to `[x]` for completed task
2. Update counts: increment Done, decrement Left
3. Do this IMMEDIATELY, not at the end

## Quality Over Speed

- Below 90%: finish current task properly, then hand off
- Never skip tests or cut corners when context allows
- A clean handoff beats rushed completion
- **At 90%+ context: HANDOFF IS THE PRIORITY.** Do not start new fix cycles (linting, type checking, error fixing). Document remaining work and hand off immediately. The "fix all errors" mandate is suspended - the next session will handle them.

## Phase Transition Context Guard

**⛔ Before EVERY `Skill()` call that transitions to another /spec phase, check context:**

```bash
~/.pilot/bin/pilot check-context --json
```

- **< 80%:** Proceed with phase transition.
- **>= 80%:** Do NOT start the next phase. Hand off instead.

Each phase needs significant context headroom. Starting a new phase above 80% risks hitting the hard context limit — the worst-case scenario where all progress in the current turn is lost. The next session dispatches automatically based on plan status.

**Applies to:** plan→implement, implement→verify, verify→implement (feedback loop), dispatcher→any phase. See spec.md Section 0.3 for details.

## No Stopping - Automatic Continuation

**The ONLY user interaction points are worktree choice (new plans only), plan approval, and worktree sync approval (when `Worktree: Yes`).**

- Never stop after writing continuation file - trigger clear immediately
- Never wait for user acknowledgment before session handoff
- Execute session continuation in a single turn: write file → trigger clear
- Only ask user if a critical architectural decision is needed

# Task and Workflow Rules

## ⛔ NEVER Use Built-in Plan Mode

**`EnterPlanMode` and `ExitPlanMode` are BLOCKED. Do NOT call them under any circumstances.** They are intercepted by hooks and will fail. This project uses `/spec` for structured planning instead.

---

## Task Complexity Triage

**Default mode is quick mode (direct execution).** `/spec` is ONLY used when the user explicitly types `/spec`.

| Complexity | Action |
|------------|--------|
| **Trivial** (single file, obvious fix) | Execute directly |
| **Moderate** (2-5 files, clear scope) | Use TaskCreate/TaskUpdate to track, then execute |
| **High** (architectural, 10+ files) | **Ask user** if they want `/spec` or quick mode |

**⛔ NEVER auto-invoke `/spec` or `Skill('spec')`.** The user MUST explicitly type `/spec`. If you think it would help, ask — never invoke.

---

## Task Management

**ALWAYS use task management tools for non-trivial work.**

### When to Create Tasks

| Situation | Action |
|-----------|--------|
| User asks for 2+ things | Create a task for each |
| Work has multiple steps | Create tasks with dependencies |
| **Deferring a user request** | **TaskCreate IMMEDIATELY — never just say "noted"** |
| **User sends new request mid-task** | **TaskCreate for the new request BEFORE continuing current work** |
| `/spec` implementation phase | Create tasks from plan |

### ⛔ Never Drop a User Request

**The #1 failure mode is losing user requests during context-switches.** When the user sends a new request while you're working on something else:

1. **STOP** current work momentarily
2. **TaskCreate** for the new request with full details
3. **Resume** current work

The task list is your memory — if it's not in the task list, it will be forgotten. Never rely on "I'll get to it after this" without a task.

### Session Start: Clean Up Stale Tasks

Run `TaskList`, delete irrelevant leftover tasks, then create new tasks for current request.

### ⛔ Cross-Session Task Isolation

Tasks are scoped per session via `CLAUDE_CODE_TASK_LIST_ID`. Pilot Memory is shared across sessions — task references from memory that don't appear in your `TaskList` belong to another session. **`TaskList` is the sole source of truth.**

### Session Continuations

When resuming same session (same `CLAUDE_CODE_TASK_LIST_ID`): run `TaskList` first, don't recreate existing tasks, resume first uncompleted task.

---

## Sub-Agent and Tool Usage

**⛔ ALWAYS try vexor before any other codebase search tool.** Vexor finds files by intent via semantic search, scales to any codebase size, and costs zero context until you read results. It outperforms Explore sub-agents — no token waste from sub-agent transcripts.

**Search fallback chain:** `vexor` → `Grep`/`Glob` (exact patterns only) → `Task/Explore` (multi-step reasoning, last resort)

**⛔ NEVER spawn Task/Explore agents for search.** All search goes through vexor (synchronous, `timeout: 60000`) or Grep/Glob directly. Task agents are for multi-step *reasoning*, not finding files or references.

### /spec Verification Agents (MANDATORY)

The Task tool spawns verification sub-agents at two points:

| Phase | Agents (parallel, run in background) | `subagent_type` |
|-------|--------------------------------------|-----------------|
| `spec-plan` Step 1.7 (features only) | plan-verifier + plan-challenger | `pilot:plan-verifier` + `pilot:plan-challenger` |
| `spec-verify` Step 3.0, 3.7 | spec-reviewer-compliance + spec-reviewer-quality + spec-reviewer-goal | `pilot:spec-reviewer-compliance` + `pilot:spec-reviewer-quality` + `pilot:spec-reviewer-goal` |

**Note:** `spec-bugfix-plan` skips plan verification agents — bugfix plans are tight enough (fixed task structure, behavior contract) that the user approval gate is sufficient.

All verification agents have `background: true` in their agent definitions, so they run in the background automatically. **As a fallback**, also pass `run_in_background=true` in the Task() call.

**Launch all `Task()` calls in a SINGLE message.** If sent in separate messages, the first blocks and the second waits.

**⛔ NEVER skip verification. ⛔ NEVER use `TaskOutput` to retrieve results** (dumps full transcript, wastes tokens). Agents write findings to JSON files — poll with Read tool, `sleep 10` between attempts.

**Sub-agents do NOT inherit rules.** Verifier agents have key rules embedded and can read from `~/.claude/rules/*.md` and `.claude/rules/*.md`.

### Background Bash

Use `run_in_background=true` only for long-running processes (dev servers, watchers). Prefer synchronous for tests, linting, git, installs.

---

## Deviation Handling During Implementation

| Type | Trigger | Action | User Input? |
|------|---------|--------|-------------|
| **Bug / Missing Critical / Blocking** | Code errors, missing validation, broken imports | Auto-fix inline, document as deviation | No |
| **Architectural** | Structural change (new DB table, switching libraries, breaking API) | **STOP** — `AskUserQuestion` with options | **Yes** |

Auto-fix rules: fix inline, add/update tests if applicable, do NOT expand scope. For architectural: stop, present options, wait for decision.

---

## Plan Registration (MANDATORY for /spec)

```bash
~/.pilot/bin/pilot register-plan "<plan_path>" "<status>" 2>/dev/null || true
```

Call after creating plan header, reading existing plan, and after status changes (PENDING → COMPLETE → VERIFIED).

---

## /spec Workflow

**⛔ When `/spec` is invoked, the structured workflow is MANDATORY.** Everything after `/spec` is the task description.

```
/spec → Dispatcher → Detect type (LLM intent) → Feature: Skill('spec-plan') → Plan, verify, approve
                                                → Bugfix:  Skill('spec-bugfix-plan') → Bug analysis, verify, approve
                   → Skill('spec-implement')   → TDD loop for each task (both types)
                   → Skill('spec-verify')      → Tests, execution, code review (both types)
```

### ⛔ Dispatcher Integrity

**The `/spec` dispatcher is a thin router, not a thinking step.** Its only permitted tool calls are:

1. `AskUserQuestion` (worktree choice + type confirmation when ambiguous, new plans only)
2. `Skill()` invocation

**Any other tool use in the dispatcher — Read (except plan files), Bash, Grep, Glob, WebFetch, Task, or ANY research/exploration tool — is a workflow violation.** All substantive work (research, brainstorming, exploration, web fetches, file reads) happens inside the invoked Skill phase, never in the dispatcher.

**Why this matters:** If the dispatcher does substantive work instead of invoking a Skill, no plan file is created, no stop guard fires, and the entire spec workflow silently disappears. The user typed `/spec` expecting a structured workflow, and gets freeform chat instead.

### Phase Dispatch

**For new tasks (no `.md` path):** Dispatcher infers spec type from the task description using LLM judgment. Clearly a bugfix → `spec-bugfix-plan`. Clearly a feature → `spec-plan`. Ambiguous → ask user (bundled with worktree question in a single AskUserQuestion).

**For existing plans (`.md` path):** Dispatcher reads `Type:` header for PENDING+unapproved routing.

| Status | Approved | Type | Skill Invoked |
|--------|----------|------|---------------|
| PENDING | No | Feature (or absent) | `Skill(skill='spec-plan', args='<plan-path>')` |
| PENDING | No | Bugfix | `Skill(skill='spec-bugfix-plan', args='<plan-path>')` |
| PENDING | Yes | * | `Skill(skill='spec-implement', args='<plan-path>')` |
| COMPLETE | * | * | `Skill(skill='spec-verify', args='<plan-path>')` |
| VERIFIED | * | * | Report completion, done |

**`spec-implement` and `spec-verify` work identically for both plan types** — the plan file is the interface.

### Feedback Loop

```
spec-verify finds issues → Status: PENDING → spec-implement fixes → COMPLETE → spec-verify → ... → VERIFIED
```

### ⛔ Only THREE User Interaction Points

1. **Worktree Choice + Type Confirmation** (new plans only, in dispatcher — type only asked when ambiguous)
2. **Plan Approval** (in spec-plan or spec-bugfix-plan)
3. **Worktree Sync Approval** (in spec-verify, only when `Worktree: Yes`)

Everything else is automatic. **NEVER ask "Should I fix these findings?"** — verification fixes are part of the approved plan.

**Status values:** `PENDING` (awaiting implementation), `COMPLETE` (ready for verification), `VERIFIED` (done)

### Worktree Isolation (Optional)

Controlled by `Worktree:` field in plan header (default: `No`). User chooses at START of `/spec`.

**When `Worktree: Yes`:** Worktree created during planning phase (spec-plan) at `.worktrees/spec-<slug>-<hash>/`, so the plan file lives inside the worktree from the start. All implementation happens there, squash merged after verification.

**When `Worktree: No`:** Direct implementation on current branch.

**Worktree CLI:** `pilot worktree detect|create|diff|sync|cleanup|status --json <slug>` (see `cli-tools.md`)

---

## Task Completion Tracking

Update plan file after EACH task: `[ ]` → `[x]`, increment Done, decrement Left. Do this immediately.

## No Stopping — Automatic Continuation

The ONLY user interaction points are worktree choice (+ type confirmation when ambiguous), plan approval, and worktree sync approval.

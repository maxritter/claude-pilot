---
description: Spec-driven development - plan, implement, verify workflow
argument-hint: "<task description>" or "<path/to/plan.md>"
user-invocable: true
model: sonnet
---

# /spec - Unified Spec-Driven Development

**For new features, major changes, and complex work.** Creates a spec, gets your approval, implements with TDD, and verifies completion - all in one continuous flow.

This command is a **dispatcher** that determines which phase to run and invokes it via `Skill()`.

## ⛔ MANDATORY: /spec = Workflow. No Exceptions.

**When `/spec` is invoked, you MUST follow the spec workflow exactly. The user's phrasing after `/spec` is the TASK DESCRIPTION — it is NOT an instruction to change the workflow.**

- `/spec brainstorm a caching layer` → task_description = "brainstorm a caching layer" → invoke `Skill('spec-plan')` with that description
- `/spec let's discuss auth options` → task_description = "let's discuss auth options" → invoke `Skill('spec-plan')` with that description
- `/spec explore and plan a new feature` → task_description = "explore and plan a new feature" → invoke `Skill('spec-plan')` with that description

**Words like "brainstorm", "discuss", "explore", "think about" are part of the task description, NOT instructions to skip the workflow.** The spec-plan phase handles all exploration, discussion, and brainstorming within its structured flow.

**NEVER interpret `/spec` arguments as a reason to have a freeform conversation instead of invoking the phase skill.**

---

## 📋 WORKFLOW OVERVIEW

```
/spec → Dispatcher → Skill('spec-plan')    → Plan, verify, approve
                   → Skill('spec-implement') → TDD loop for each task
                   → Skill('spec-verify')    → Tests, execution, code review
```

| Phase              | Skill            | What Happens                                     |
| ------------------ | ---------------- | ------------------------------------------------ |
| **Planning**       | `spec-plan`      | Explore → Design → Write plan → Verify → Approve |
| **Implementation** | `spec-implement` | TDD loop for each task                           |
| **Verification**   | `spec-verify`    | Tests → Execution → Rules → Code Review → E2E    |

### Status-Based Flow

```
PENDING (Not Approved) → spec-plan    → User approves
PENDING (Approved)     → spec-implement → All tasks done → COMPLETE
COMPLETE               → spec-verify   → All checks pass → VERIFIED
VERIFIED               → Done!
```

### The Feedback Loop

```
spec-verify finds issues → Status: PENDING → spec-implement fixes → COMPLETE → spec-verify → ... → VERIFIED
```

---

## 0.1 Parse Arguments

```
/spec <task-description>           # Start new workflow from task
/spec <path/to/plan.md>            # Continue existing plan
```

Parse the arguments: $ARGUMENTS

### Determine Current State

```
IF arguments end with ".md" AND file exists:
    plan_path = arguments
    → Read plan file, check Status AND Approved fields
    → Dispatch to appropriate phase based on status

ELSE:
    task_description = arguments  # ALWAYS treated as task description, regardless of phrasing
    → Ask worktree question FIRST (see Section 0.1.1 below)
    → Invoke planning phase with worktree choice: Skill(skill='spec-plan', args='<task_description> --worktree=yes|no')
    # NEVER have a freeform conversation instead. ALWAYS invoke the Skill.
```

### 0.1.1 Worktree Question (New Plans Only)

**Before invoking `spec-plan` for a NEW plan, ask the user about worktree isolation:**

```
AskUserQuestion:
  question: "Use git worktree isolation for this spec?"
  header: "Worktree"
  options:
    - "No" - Work directly on the current branch, simple and straightforward
    - "Yes" - Isolate work on a dedicated branch; auto-stashes uncommitted changes, safe to experiment, easy to discard or squash merge
```

**Append the choice to the spec-plan args:** `Skill(skill='spec-plan', args='<task_description> --worktree=yes')` or `--worktree=no`.

**This question is ONLY asked for new plans.** When continuing an existing plan (`.md` path), the `Worktree:` field is already set in the plan header.

**After reading the plan file, register the plan association (non-blocking):**

```bash
~/.pilot/bin/pilot register-plan "<plan_path>" "<status>" 2>/dev/null || true
```

This tells Console which session is working on which plan. Failure is silently ignored.

## 0.2 Status-Based Dispatch

Read the plan file and dispatch based on Status and Approved fields:

| Status   | Approved | Action                                                                                    |
| -------- | -------- | ----------------------------------------------------------------------------------------- |
| PENDING  | No       | `Skill(skill='spec-plan', args='<plan-path>')`                                            |
| PENDING  | Yes      | `Skill(skill='spec-implement', args='<plan-path>')` (worktree if `Worktree: Yes` in plan) |
| COMPLETE | \*       | `Skill(skill='spec-verify', args='<plan-path>')`                                          |
| VERIFIED | \*       | Report completion, workflow done                                                          |

**Invoke the appropriate Skill immediately. Do not duplicate phase logic here.**

### Report Completion (VERIFIED)

If the plan status is already VERIFIED:

```
✅ Workflow complete! Plan status: VERIFIED

The plan at <plan-path> has been fully implemented and verified.
Is there anything else you'd like me to help with?
```

---

---

## 0.5 Rules Summary (Quick Reference)

| #   | Rule                                                                                                                                                                                                                                                             |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **NO sub-agents except verification** - Phases 1 and 2 use direct tools only. Verification steps (Step 1.7, Step 3.0/3.5) launch paired review agents via the **Task tool** (`subagent_type="pilot:*"`). Task tool is the ONLY allowed mechanism for sub-agents. |
| 2   | **NEVER SKIP verification** - Plan verification (Step 1.7) and Code verification (Step 3.5) are mandatory. No exceptions.                                                                                                                                        |
| 3   | **ONLY stopping point is plan approval** - Everything else is automatic. Never ask "Should I fix these?"                                                                                                                                                         |
| 4   | **Batch questions together** - Don't interrupt user flow                                                                                                                                                                                                         |
| 5   | **Run explorations sequentially** - One at a time, never in parallel                                                                                                                                                                                             |
| 6   | **NEVER write code during planning** - Separate phases                                                                                                                                                                                                           |
| 7   | **NEVER assume - verify by reading files**                                                                                                                                                                                                                       |
| 8   | **Re-read plan after user edits** - Before asking for approval again                                                                                                                                                                                             |
| 9   | **TDD is MANDATORY** - No production code without failing test first                                                                                                                                                                                             |
| 10  | **Update plan checkboxes after EACH task** - Not at the end                                                                                                                                                                                                      |
| 11  | **Quality over speed** - Never rush due to context pressure. Complete current work with full quality — auto-compaction handles the rest                                                                                                                     |
| 12  | **Plan file is source of truth** - Survives across auto-compaction cycles                                                                                                               |

ARGUMENTS: $ARGUMENTS

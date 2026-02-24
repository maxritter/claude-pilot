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

- `/spec add user authentication with OAuth` → Feature → invoke `Skill('spec-plan')` with that description
- `/spec fix the crash when deleting nodes with two children` → Bugfix → invoke `Skill('spec-bugfix-plan')` with that description
- `/spec brainstorm a caching layer` → Feature → invoke `Skill('spec-plan')` with that description

**Words like "brainstorm", "discuss", "explore", "think about" are part of the task description, NOT instructions to skip the workflow.** The spec-plan phase handles all exploration, discussion, and brainstorming within its structured flow.

**NEVER interpret `/spec` arguments as a reason to have a freeform conversation instead of invoking the phase skill.**

---

## ⛔ DISPATCHER IS A THIN ROUTER — NO SUBSTANTIVE WORK

**The dispatcher performs exactly FOUR actions: Parse → Ask (worktree) → Detect type → Invoke `Skill()`. Nothing else.**

**Allowed tools:** `AskUserQuestion` (worktree choice, type confirmation) and `Skill()`. Any other tool use (Bash, Read, Grep, Glob, WebFetch, Task, etc.) is a workflow violation — all research, brainstorming, and exploration happens inside the invoked Skill, never here.

**Arguments containing URLs, "brainstorm", "research", or actionable language are passed verbatim as the task description to the invoked Skill. The dispatcher does NOT act on them.**

---

## 📋 WORKFLOW OVERVIEW

```
/spec → Dispatcher → Detect type (LLM intent) → Feature: Skill('spec-plan') → Plan, verify, approve
                                                → Bugfix:  Skill('spec-bugfix-plan') → Bug analysis, verify, approve
                   → Skill('spec-implement')   → TDD loop for each task
                   → Skill('spec-verify')      → Tests, execution, code review
```

| Phase              | Skill                | What Happens                                               |
| ------------------ | -------------------- | ---------------------------------------------------------- |
| **Feature Planning**| `spec-plan`         | Explore → Design → Plan → Verify → Approve                |
| **Bugfix Planning**| `spec-bugfix-plan`   | Bug analysis → Behavior Contract → Tasks → Approve           |
| **Implementation** | `spec-implement`     | TDD loop for each task                                     |
| **Verification**   | `spec-verify`        | Tests → Execution → Rules → Code Review → E2E             |

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

## 0.1 Parse Arguments and Route IMMEDIATELY

**⛔ Execute this section mechanically. Do NOT read URLs, research, or brainstorm. Route to a Skill.**

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
    → Dispatch to appropriate phase based on status (Section 0.2)

ELSE:
    task_description = arguments  # The ENTIRE argument string, verbatim, regardless of content
    → Detect spec type (Section 0.1.1)
    → Ask user questions if needed (Section 0.1.2)
    → Invoke the appropriate Skill and STOP
```

### 0.1.1 Detect Spec Type (New Plans Only)

**Infer the spec type from the task description using LLM judgment.**

Classify the task as **Bugfix** or **Feature** based on intent:

- **Bugfix:** The user describes something that is broken, crashing, producing wrong results, or regressing. The intent is to fix existing behavior, not add new behavior. Examples: "fix the crash when deleting nodes", "the login page returns 500", "sorting is broken for empty lists", "users can't upload files larger than 10MB".
- **Feature:** The user describes new functionality, enhancements, refactoring, migrations, or improvements. The intent is to build or change something. Examples: "add OAuth support", "migrate REST to GraphQL", "refactor the order pipeline".

**Confidence threshold:**

- **Clearly a bugfix** (high confidence) → `spec_type = "Bugfix"`, skip type question
- **Clearly a feature** (high confidence) → `spec_type = "Feature"`, skip type question
- **Ambiguous** (could be either — e.g., "improve error handling in auth" could be fixing broken handling or adding new handling) → ask user as part of Section 0.1.2

### 0.1.2 User Questions (New Plans Only)

**Bundle all necessary questions into a SINGLE AskUserQuestion call.** Never ask multiple separate questions.

**If spec type is clear (no ambiguity):**

```
AskUserQuestion:
  question: "Use git worktree isolation for this spec?"
  header: "Worktree"
  options:
    - "No" - Work directly on the current branch, simple and straightforward
    - "Yes" - Isolate work on a dedicated branch; auto-stashes uncommitted changes, safe to experiment, easy to discard or squash merge
```

**If spec type is ambiguous (needs user input):**

```
AskUserQuestion:
  question: "Two quick setup questions before we start:"
  header: "Spec Setup"
  subquestions:
    1. "Is this a bug fix or a new feature?"
       options:
         - "Bug fix" - Broken behavior that needs fixing (uses bugfix planning with Behavior Contract)
         - "New feature" - New functionality, enhancement, or refactoring (uses full feature planning)
    2. "Use git worktree isolation?"
       options:
         - "No" - Work directly on the current branch
         - "Yes" - Isolate work on a dedicated branch
```

**Note:** If AskUserQuestion does not support `subquestions`, ask a SINGLE question with combined options instead:

```
AskUserQuestion:
  question: "This could be a bug fix or a feature. Which type, and use worktree isolation?"
  header: "Spec Setup"
  options:
    - "Bug fix, no worktree" - Bugfix planning (Behavior Contract, test-before-fix), work on current branch
    - "Bug fix, yes worktree" - Bugfix planning, isolated branch
    - "Feature, no worktree" - Feature planning (full exploration), work on current branch
    - "Feature, yes worktree" - Feature planning, isolated branch
```

### 0.1.3 Invoke Skill and STOP

Based on the resolved spec type and worktree choice:

- **Bugfix:** `Skill(skill='spec-bugfix-plan', args='<task_description> --worktree=yes|no')`
- **Feature:** `Skill(skill='spec-plan', args='<task_description> --worktree=yes|no')`

**STOP. The dispatcher is done. Do not output anything else.**

**These questions are ONLY asked for new plans.** When continuing an existing plan (`.md` path), the `Worktree:` and `Type:` fields are already set in the plan header.

**After reading the plan file, register the plan association (non-blocking):**

```bash
~/.pilot/bin/pilot register-plan "<plan_path>" "<status>" 2>/dev/null || true
```

This tells Console which session is working on which plan. Failure is silently ignored.

## 0.2 Status-Based Dispatch

Read the plan file and dispatch based on Status, Approved, and Type fields:

| Status   | Approved | Type    | Action                                                                                    |
| -------- | -------- | ------- | ----------------------------------------------------------------------------------------- |
| PENDING  | No       | Feature (or absent) | `Skill(skill='spec-plan', args='<plan-path>')`                              |
| PENDING  | No       | Bugfix  | `Skill(skill='spec-bugfix-plan', args='<plan-path>')`                                     |
| PENDING  | Yes      | \*      | `Skill(skill='spec-implement', args='<plan-path>')` (worktree if `Worktree: Yes` in plan) |
| COMPLETE | \*       | \*      | `Skill(skill='spec-verify', args='<plan-path>')`                                          |
| VERIFIED | \*       | \*      | Report completion, workflow done                                                          |

**Type: absent or Feature → `spec-plan`. Type: Bugfix → `spec-bugfix-plan`. Default to Feature when Type: header is missing (backward compatible with existing plans).**

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
| 1   | **NO sub-agents except verification** - Phases 1 and 2 use direct tools only. Verification steps (Step 1.7 for features, Step 3.0/3.7) launch review agents via the **Task tool** (`subagent_type="pilot:*"`). Task tool is the ONLY allowed mechanism for sub-agents. |
| 2   | **NEVER SKIP verification** - Plan verification (Step 1.7, features only) and Code verification (Step 3.7) are mandatory. Bugfix plans skip plan verification — the fixed task structure and user approval gate are sufficient.                                        |
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

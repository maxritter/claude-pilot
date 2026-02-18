---
description: "Spec planning phase - explore codebase, design plan, get approval"
argument-hint: "<task description> or <path/to/plan.md>"
user-invocable: false
model: opus
hooks:
  Stop:
    - command: uv run python "${CLAUDE_PLUGIN_ROOT}/hooks/spec_plan_validator.py"
---

# /spec-plan - Planning Phase

**Phase 1 of the /spec workflow.** Explores the codebase, designs an implementation plan, verifies it, and gets user approval.

**Input:** Task description (new plan) or plan path (continue unapproved plan)
**Output:** Approved plan file at `docs/plans/YYYY-MM-DD-<slug>.md`
**Next phase:** On approval → `Skill(skill='spec-implement', args='<plan-path>')`

---

## ⛔ KEY CONSTRAINTS (Rules Summary)

| #   | Rule                                                                                                     |
| --- | -------------------------------------------------------------------------------------------------------- |
| 1   | **NO sub-agents during planning** - Use direct tools only. Exception: Step 1.7 launches `plan-verifier` + `plan-challenger` via the **Task tool** (`subagent_type="pilot:plan-verifier"` and `"pilot:plan-challenger"`). |
| 2   | **NEVER SKIP verification** - Plan verification (Step 1.7) is mandatory. No exceptions.                  |
| 3   | **ONLY stopping point is plan approval** - Everything else is automatic. Never ask "Should I fix these?" |
| 4   | **Batch questions together** - Don't interrupt user flow                                                 |
| 5   | **Run explorations sequentially** - One at a time, never in parallel                                     |
| 6   | **NEVER write code during planning** - Separate phases                                                   |
| 7   | **NEVER assume - verify by reading files**                                                               |
| 8   | **Re-read plan after user edits** - Before asking for approval again                                     |
| 9   | **Quality over speed** - Never rush due to context pressure                                              |
| 10  | **Plan file is source of truth** - Survives across auto-compaction cycles                                               |

---

> **WARNING: DO NOT use the built-in `ExitPlanMode` or `EnterPlanMode` tools.**

## Using AskUserQuestion - Core Planning Tool

**Questions are grouped into batches for smooth user experience:**

| Batch       | When                         | Purpose                                |
| ----------- | ---------------------------- | -------------------------------------- |
| **Batch 1** | Phase 0 (before exploration) | Clarify task, scope, priorities        |
| **Batch 2** | Phase 2 (after exploration)  | Architecture choices, design decisions |

**When to Use AskUserQuestion:**

| Situation                     | Example Question                                                     |
| ----------------------------- | -------------------------------------------------------------------- |
| **Unclear requirements**      | "Should this feature support batch processing or single items only?" |
| **Multiple valid approaches** | Present 2-3 options with trade-offs for user to choose               |
| **Ambiguous scope**           | "Should we include error recovery, or fail fast?"                    |
| **Technology choices**        | "Prefer async/await or callbacks for this integration?"              |
| **Priority decisions**        | "Performance or simplicity - which matters more here?"               |
| **Missing domain knowledge**  | "How does the existing auth flow work in production?"                |

**Questioning philosophy — Dream extraction, not requirements gathering:**

- **Start open, then narrow** — Begin with "What does success look like?" before diving into specifics
- **Follow energy** — If the user is excited about a detail, explore it; if they're vague, they may not care about the specifics
- **Challenge vagueness** — "Fast" means what? Sub-100ms? Under 2 seconds? Make abstract concrete
- **Present interpretations as options** — "I think you mean X — should we do X (simple, covers 80%) or Y (comprehensive, handles edge cases)?" is better than "What do you want?"

**Anti-patterns to avoid:**

- **Checklist walking** — Don't ask every possible question; focus on genuine ambiguities
- **Canned questions** — Adapt questions to the specific task, not generic templates
- **Shallow acceptance** — Don't accept "it should work well" — ask what "well" means concretely
- **Interrogation** — 1-2 focused questions are better than 4 vague ones

**Key principles:**

- Present options, not open-ended questions when possible
- Include trade-offs for each option
- **Batch related questions together** — don't interrupt user flow
- Don't proceed with assumptions — ASK
- **Scope guardrail** — Questions clarify HOW to implement, not WHETHER to expand scope

## Extending Existing Plans

**When adding tasks to existing plan:**

1. Load existing plan: `Read(file_path="docs/plans/...")`
2. Parse structure (architecture, completed tasks, pending tasks)
3. Check git status for partially completed work
4. Verify new tasks are compatible with existing architecture
5. Check total: If original + new > 12 tasks, suggest splitting
6. Mark new tasks with `[NEW]` prefix
7. Update total count: `Total Tasks: X (Originally: Y)`
8. Add extension history: `> Extended [Date]: Tasks X-Y for [feature]`

## ⚠️ CRITICAL: Migration/Refactoring Tasks

**When the task involves migrating, refactoring, or replacing existing code, you MUST complete these additional steps to prevent missing features.**

### Mandatory Feature Inventory (Phase 1.5)

**After exploration but BEFORE creating tasks:**

1. **List ALL files being replaced:**

   ```markdown
   ## Feature Inventory - Files Being Replaced

   | Old File         | Functions/Classes                | Status        |
   | ---------------- | -------------------------------- | ------------- |
   | `old/module1.py` | `func_a()`, `func_b()`, `ClassX` | ⬜ Not mapped |
   | `old/module2.py` | `func_c()`, `func_d()`           | ⬜ Not mapped |
   ```

2. **Map EVERY function/feature to a new task:**

   ```markdown
   ## Feature Mapping - Old → New

   | Old Feature        | New Location   | Task #        |
   | ------------------ | -------------- | ------------- |
   | `module1.func_a()` | `new/step1.py` | Task 3        |
   | `module1.func_b()` | `new/step1.py` | Task 3        |
   | `module2.func_c()` | `new/step2.py` | Task 5        |
   | `module2.func_d()` | ❌ MISSING     | ⚠️ NEEDS TASK |
   ```

3. **Verify 100% coverage before proceeding:**
   - Every row must have a Task # or explicit "Out of Scope" justification
   - "Out of Scope" means the feature is INTENTIONALLY REMOVED (with user confirmation)
   - "Out of Scope" does NOT mean "migrate as-is" - that still needs a task!

### "Out of Scope" Clarification

**CRITICAL: "Out of Scope" has a precise meaning:**

| Phrase                             | Meaning                                    | Requires Task?                      |
| ---------------------------------- | ------------------------------------------ | ----------------------------------- |
| "Out of Scope: Changes to X"       | X will be migrated AS-IS, no modifications | ✅ YES - migration task             |
| "Out of Scope: Feature X"          | X is intentionally REMOVED/not included    | ❌ NO - but needs user confirmation |
| "Out of Scope: New features for X" | X migrates as-is, no NEW features added    | ✅ YES - migration task             |

### Pre-Task Verification Gate

**Before finalizing tasks, verify:**

- [ ] All old files listed in Feature Inventory
- [ ] All functions/classes from old files identified
- [ ] Every feature mapped to a task OR explicitly marked "REMOVED" with user confirmation
- [ ] No row in Feature Mapping has "⬜ Not mapped" status
- [ ] User has confirmed any features marked for removal

**If any checkbox is unchecked, DO NOT proceed to implementation.**

---

## Creating New Plans

### Step 1.1: Create Plan File Header (FIRST)

**Immediately upon starting planning, create the plan file header for status bar detection.**

1. **Parse worktree choice from arguments:**
   - Look for `--worktree=yes` or `--worktree=no` at the end of the arguments
   - Strip the `--worktree=...` flag from the task description
   - Default to `Yes` if no flag is present (backward compatibility)

2. **Create worktree early (if `--worktree=yes`):**

   Creating the worktree NOW (before writing the plan file) ensures the plan file lives inside the worktree from the start. This avoids the plan file being stranded on the main branch.

   - Generate the plan slug from the task description (same logic as filename: first 3-4 words, lowercase, hyphens)
   - Check for existing worktree first:
     ```bash
     ~/.pilot/bin/pilot worktree detect --json <plan_slug>
     ```
   - If not found, create one:
     ```bash
     ~/.pilot/bin/pilot worktree create --json <plan_slug>
     # Returns: {"path": "...", "branch": "spec/<slug>", "base_branch": "main"}
     ```
   - Note the worktree `path` from the JSON output — all file writes (including the plan file) should use paths relative to this worktree directory
   - If creation fails due to old git version (error contains "git >= 2.15 required"): Log a warning and continue without worktree isolation. Set worktree choice to `No`.

3. **Generate filename:** `docs/plans/YYYY-MM-DD-<feature-slug>.md`
   - Use current date
   - Create slug from first 3-4 words of task description (lowercase, hyphens)
   - Example: "add user authentication" → `2026-01-24-add-user-authentication.md`
   - **If worktree is active:** Use the worktree path as the base directory (e.g., `<worktree_path>/docs/plans/...`)

4. **Create directory if needed:** `mkdir -p docs/plans`

5. **Write initial header immediately (with worktree choice from dispatcher):**

   ```markdown
   # [Feature Name] Implementation Plan

   Created: [Date]
   Status: PENDING
   Approved: No
   Iterations: 0
   Worktree: [Yes|No - from dispatcher's --worktree flag]

   > Planning in progress...

   ## Summary

   **Goal:** [Task description from user]

   ---

   _Exploring codebase and gathering requirements..._
   ```

6. **Register plan association (MANDATORY):**

   ```bash
   ~/.pilot/bin/pilot register-plan "<plan_path>" "PENDING" 2>/dev/null || true
   ```

   This tells the statusline which plan belongs to THIS session. Without it, parallel sessions show the wrong plan.

7. **Why this matters:**
   - Status bar shows "Spec: <name> [/plan]" immediately
   - User sees progress even during exploration phase
   - Plan file exists for continuation across auto-compaction cycles
   - Plan is correctly associated with this specific terminal

**CRITICAL:** Do this FIRST, before any exploration or questions.

---

### Step 1.2: Task Understanding, Discuss & Clarify

**First, clearly state your understanding of the task.**

Before any exploration:

1. Restate what the user is asking for in your own words
2. Identify the core problem being solved
3. List any assumptions you're making

**Then identify gray areas using domain-aware analysis:**

Analyze the task description to find ambiguities that NEED resolution before planning. Different types of work have different gray areas:

| Domain                                  | Typical Gray Areas                                                                         |
| --------------------------------------- | ------------------------------------------------------------------------------------------ |
| **Something users SEE** (UI/frontend)   | Layout density, interaction patterns, responsive breakpoints, empty states, loading states |
| **Something users CALL** (API/backend)  | Response shape, error codes, auth model, pagination, rate limiting                         |
| **Something users RUN** (CLI/scripts)   | Output format, flags/options, exit codes, interactive vs non-interactive                   |
| **Something users STORE** (data/config) | Schema shape, migration strategy, validation rules, default values                         |
| **Something users READ** (docs/content) | Audience level, structure, examples needed, update frequency                               |

**Scope guardrail:** Questions should clarify HOW to implement the task, not WHETHER to expand scope. If discussion surfaces new feature ideas, capture them as "Deferred Ideas" in the plan's Open Questions section — don't add them to scope.

**Then gather clarifications if needed (Question Batch 1):**

If gray areas exist, use AskUserQuestion to ask focused questions per area in a single interaction. Present your interpretation as options when possible — "Should the API return paginated results (recommended for large datasets) or all results at once?" is better than "How should the API handle large result sets?"

If the task is clear and unambiguous with no meaningful gray areas, skip directly to Step 1.3.

### Step 1.3: Exploration

**Explore the codebase systematically.** Run explorations **one at a time** (sequentially, not in parallel).

#### 🔧 Tools for Exploration

| Tool               | When to Use                | Example                                                                                            |
| ------------------ | -------------------------- | -------------------------------------------------------------------------------------------------- |
| **Context7**       | Library/framework docs     | `resolve-library-id(query="your question", libraryName="lib")` then `query-docs(libraryId, query)` |
| **Vexor**          | Semantic code search       | `vexor search "query" --mode code`                                                                 |
| **grep-mcp**       | Real-world GitHub examples | `searchGitHub(query="FastMCP", language=["Python"])`                                               |
| **Read/Grep/Glob** | Direct file exploration    | Use directly, no sub-agents                                                                        |

**Exploration areas (in order):**

1. **Architecture** - Project structure, entry points, how components connect
2. **Similar Features** - Existing patterns that relate to the task, what can be reused
3. **Dependencies** - Imports, modules, what will be impacted
4. **Tests** - Test infrastructure, existing patterns, available fixtures

**For each area:**

- Document hypotheses (not conclusions)
- Note full file paths for relevant code
- Track questions that remain unanswered

**After explorations complete:**

1. Read each identified file to verify hypotheses
2. Build a complete mental model of current architecture
3. Identify integration points and potential risks
4. Note reusable patterns

### Step 1.4: Design Decisions

**Present findings and gather all design decisions (Question Batch 2).**

Summarize what you found, then use AskUserQuestion with all decisions at once.

**After user answers:**

- Incorporate their choices into the plan design
- Proceed to Step 1.5 — the user will review the full plan at Step 1.8

### Step 1.5: Implementation Planning

**Task Granularity**

Each task should be:

- **Independently testable** — has its own tests that pass without other tasks being complete
- **Focused** — touches 2-4 files max; more means it should be split
- **Verifiable** — produces an observable result (test output, API response, UI change)

Split a task if it has multiple unrelated DoD criteria. Merge tasks if one can't be tested without the other. Don't create tasks for setup/boilerplate that have no standalone value — fold them into the first task that uses them.

**For each task, populate:**

- **Dependencies** — Which tasks must complete first? Use `None` for tasks with no ordering requirements.
- **Verify** — What concrete commands prove this task is done? Include test commands, build commands, or curl/CLI invocations. The implementation phase runs these after completing each task.

**Task Structure:**

```markdown
### Task N: [Component Name]

**Objective:** [1-2 sentences describing what to build]

**Dependencies:** [None | Task X, Task Y — tasks that must complete before this one]

**Files:**

- Create: `exact/path/to/file.py`
- Modify: `exact/path/to/existing.py`
- Test: `tests/exact/path/to/test.py`

**Key Decisions / Notes:**

- [Technical approach or algorithm to use]
- [Which existing pattern to follow, with file:line reference]
- [Integration points with other tasks or existing code]

**Definition of Done:**

- [ ] All tests pass (unit, integration if applicable)
- [ ] No diagnostics errors (linting, type checking)
- [ ] [Task-specific criterion with observable outcome]
- [ ] [Task-specific criterion with observable outcome]

**Verify:**

- `uv run pytest tests/path/to/test.py -q` — task-specific tests pass
- [Additional verification command or check]
```

**⚠️ DoD criteria must be verifiable.** The verification phase checks each criterion against the actual code and running program. Replace the `[Task-specific criterion]` placeholders with criteria that can be checked with a specific test, command, or observation.

✅ Good DoD examples:

- "GET /api/users?role=admin returns only admin users"
- "Form shows validation error when email field is empty"
- "CLI exits with code 1 and prints usage when no arguments given"
- "Retry logic attempts 3 times with exponential backoff before failing"

❌ Bad DoD (never use these):

- "Feature works correctly"
- "Edge cases handled appropriately"
- "Error messages are clear and actionable"

**Zero-context assumption:**

- Assume implementer knows nothing about codebase
- Provide exact file paths
- Explain domain concepts
- List integration points
- Reference similar patterns in codebase

### Step 1.6: Write Full Plan

**Save plan to:** `docs/plans/YYYY-MM-DD-<feature-name>.md`

**Required plan template:**

```markdown
# [Feature Name] Implementation Plan

Created: [Date]
Status: PENDING
Approved: No
Iterations: 0
Worktree: No

> **Status Lifecycle:** PENDING → COMPLETE → VERIFIED
> **Iterations:** Tracks implement→verify cycles (incremented by verify phase)
>
> - PENDING: Initial state, awaiting implementation
> - COMPLETE: All tasks implemented
> - VERIFIED: All checks passed
>
> **Approval Gate:** Implementation CANNOT proceed until `Approved: Yes`
> **Worktree:** Set at plan creation (from dispatcher). `Yes` uses git worktree isolation; `No` works directly on current branch (default)

## Summary

**Goal:** [One sentence describing what this builds]

**Architecture:** [2-3 sentences about chosen approach]

**Tech Stack:** [Key technologies/libraries]

## Scope

### In Scope

- [What WILL be changed/built]
- [Specific components affected]

### Out of Scope

- [What will NOT be changed]
- [Explicit boundaries]

## Prerequisites

- [Any requirements before starting]
- [Dependencies that must exist]
- [Environment setup needed]

## Context for Implementer

> This section is critical for cross-session continuity. Write it for an implementer who has never seen the codebase.

- **Patterns to follow:** [Reference existing file:line that demonstrates the pattern, e.g., "Follow the route handler pattern in `src/routes/users.ts:45`"]
- **Conventions:** [Naming, file organization, error handling approach used in this project]
- **Key files:** [Important files the implementer must read first, with brief description of each]
- **Gotchas:** [Non-obvious dependencies, quirks, things that look wrong but are intentional]
- **Domain context:** [Business logic or domain concepts needed to understand the task]

## Runtime Environment (if applicable)

> Include this section when the project has a running service, API, or UI.
> Delete if the project is a library or CLI tool with no long-running process.

- **Start command:** [How to start the service, e.g., `bun worker-service.cjs`]
- **Port:** [What port it listens on]
- **Deploy path:** [Where built artifacts are installed, if different from source]
- **Health check:** [How to verify the service is running, e.g., `curl http://localhost:PORT/health`]
- **Restart procedure:** [How to restart after code changes]

## Feature Inventory (FOR MIGRATION/REFACTORING ONLY)

> **Include this section when replacing existing code. Delete if not applicable.**

### Files Being Replaced

| Old File       | Functions/Classes      | Mapped to Task |
| -------------- | ---------------------- | -------------- |
| `old/file1.py` | `func_a()`, `func_b()` | Task 3         |
| `old/file2.py` | `ClassX`, `func_c()`   | Task 4, Task 5 |

### Feature Mapping Verification

- [ ] All old files listed above
- [ ] All functions/classes identified
- [ ] Every feature has a task number
- [ ] No features accidentally omitted

**⚠️ If any feature shows "❌ MISSING", add a task before implementation!**

## Progress Tracking

**MANDATORY: Update this checklist as tasks complete. Change `[ ]` to `[x]`.**

- [ ] Task 1: [Brief summary]
- [ ] Task 2: [Brief summary]
- [ ] ...

**Total Tasks:** [Number] | **Completed:** 0 | **Remaining:** [Number]

## Implementation Tasks

### Task 1: [Component Name]

**Objective:** ...
**Dependencies:** None
**Files:** ...
**Key Decisions / Notes:** ...
**Definition of Done:** ...
**Verify:** [Concrete commands to verify this task]

### Task 2: [Component Name]

**Objective:** ...
**Dependencies:** Task 1
**Files:** ...
**Key Decisions / Notes:** ...
**Definition of Done:** ...
**Verify:** [Concrete commands to verify this task]

## Testing Strategy

- Unit tests: [What to test in isolation]
- Integration tests: [What to test together]
- Manual verification: [Steps to verify manually]

## Risks and Mitigations

> Consider: breaking changes, backward compatibility, data loss/migration, performance regression, security implications, state management complexity, cross-component coupling, external dependency failures.

| Risk     | Likelihood   | Impact       | Mitigation                           |
| -------- | ------------ | ------------ | ------------------------------------ |
| [Risk 1] | Low/Med/High | Low/Med/High | [Concrete, implementable mitigation] |

**⚠️ Risk mitigations are commitments.** The verification phase (spec-reviewer-compliance) will check that every mitigation listed here is actually implemented in code. Write mitigations as concrete, implementable behaviors, not vague statements.

✅ Good: "If selected project not in available list, reset to null (All Projects)"
❌ Bad: "Handle edge cases appropriately"

## Open Questions

- [Any remaining questions for the user]
- [Decisions deferred to implementation]

### Deferred Ideas

- [Ideas surfaced during discussion that are out of scope for this plan]
```

### Step 1.7: Plan Verification

**⛔ THIS STEP IS NON-NEGOTIABLE. You MUST run plan verification before asking for approval.**

Before presenting the plan to the user, verify it with TWO dedicated reviewer agents running in parallel. This provides both alignment checking (plan-verifier) and adversarial review (plan-challenger) BEFORE the user sees the plan.

#### Resolve Session Path for Findings Persistence

```bash
echo $PILOT_SESSION_ID
```

Define output paths (replace `<session-id>` with the resolved value):
- **Verifier findings:** `~/.pilot/sessions/<session-id>/findings-plan-verifier.json`
- **Challenger findings:** `~/.pilot/sessions/<session-id>/findings-plan-challenger.json`

#### Launch Plan Verification (Parallel Review)

**⛔ CRITICAL: You MUST send BOTH Task calls in a SINGLE message.** Set `run_in_background=true` on both so they run in parallel. If you send them in separate messages, the first blocks and the second waits — defeating the purpose.

**Agent 1: plan-verifier** (alignment and completeness)
```
Task(
  subagent_type="pilot:plan-verifier",
  run_in_background=true,
  prompt="""
  **Plan file:** <plan-path>
  **User request:** <original task description from user>
  **Clarifications:** <any Q&A that clarified requirements>
  **Output path:** <absolute path to findings-plan-verifier.json>

  Verify this plan correctly captures the user's requirements.
  Check for missing features, scope issues, and ambiguities.

  **IMPORTANT:** Write your final findings JSON to the output_path using the Write tool.
  """
)
```

**Agent 2: plan-challenger** (adversarial review)
```
Task(
  subagent_type="pilot:plan-challenger",
  run_in_background=true,
  prompt="""
  **Plan file:** <plan-path>
  **User request:** <original task description from user>
  **Clarifications:** <any Q&A that clarified requirements>
  **Output path:** <absolute path to findings-plan-challenger.json>

  Challenge this plan from an adversarial perspective.
  Find untested assumptions, missing failure modes, and hidden dependencies.

  **IMPORTANT:** Write your final findings JSON to the output_path using the Write tool.
  """
)
```

The verifiers work in parallel:

- **plan-verifier**: Reviews plan against original user request, checks if clarification answers are incorporated, identifies missing requirements or scope issues
- **plan-challenger**: Challenges assumptions, finds failure modes, questions optimism, identifies architectural weaknesses

Both agents persist their findings JSON to the session directory for reliable retrieval.

#### Collect and Fix Findings (Progressive)

**⛔ NEVER use `TaskOutput` to retrieve agent results.** TaskOutput dumps the full verbose agent transcript (all JSON messages, hook progress, tool calls) into context, wasting thousands of tokens. Instead, poll the output files with the Read tool.

**Progressive polling — fix findings as each agent completes:**

**⚠️ IMPORTANT: Wait between polling attempts.** Run `sleep 10` via Bash before each Read attempt. Agents typically take 3-7 minutes. Rapid-fire Read calls waste context and produce dozens of "file not found" errors.

1. **Wait 10 seconds, then attempt to read BOTH findings files** using the Read tool on the paths defined above
2. **If neither file exists yet** → run `sleep 10` and retry. Repeat up to 30 times (5 minutes total) before considering the agents failed.
3. **If one file exists but the other doesn't** → start fixing findings from the ready agent immediately (by severity: must_fix → should_fix → suggestion). Track which findings you fixed.
4. After fixing the first batch, **wait 10 seconds and poll for the second file** (retry with `sleep 10` between attempts)
5. **If a file is still missing after 30 retries**, re-launch that specific agent synchronously (without `run_in_background`) with the same prompt
6. When the second file is ready, **skip findings that overlap** with already-fixed items from the first batch (same file + same issue), then fix the remaining findings
7. **If both files are ready simultaneously**, deduplicate first (keep higher severity for duplicates on same file + line), then fix all

**Severity actions:**

| Severity       | Action                                               |
| -------------- | ---------------------------------------------------- |
| **must_fix**   | Fix immediately - update plan before proceeding      |
| **should_fix** | Fix immediately - update plan before proceeding      |
| **suggestion** | Incorporate if reasonable, or note in Open Questions |

**Only proceed to Step 1.8 after all must_fix and should_fix issues are resolved.**

### Step 1.8: Get User Approval

**⛔ MANDATORY APPROVAL GATE - This is NON-NEGOTIABLE**

**After saving plan:**

1. **Summarize the plan** - Provide a brief overview of:
   - What will be built (goal)
   - Key tasks (numbered list)
   - Tech stack / approach

2. **Use AskUserQuestion to request approval:**

   ```
   Question: "Do you approve this plan for implementation?"
   Header: "Plan Review"
   Options:
   - "Yes, proceed with implementation" - I've reviewed the plan and it looks good
   - "No, I need to make changes" - I want to edit the plan first
   ```

   Note: The `Worktree:` field was already set at plan creation time (Step 1.1) based on the user's choice from the dispatcher. It does NOT need to be asked again here.

3. **Based on user response:**

   **If user approves (selects "Yes" or any approval option):**
   - Update `Approved: No` → `Approved: Yes` in the plan file
   - **Invoke implementation phase:** `Skill(skill='spec-implement', args='<plan-path>')`

   **If user selects "No, I need to make changes":**
   - Tell user: "Please edit the plan file at `<plan-path>`, then say 'ready' when done"
   - Wait for user to confirm they're done editing
   - Re-read the plan file to see their changes
   - Ask for approval again using AskUserQuestion

   **If user provides OTHER feedback (corrections, config values, clarifications):**
   - This is NOT approval - they're giving you changes to incorporate
   - Update the plan with their feedback
   - Ask for approval AGAIN with a fresh AskUserQuestion

4. **DO NOT proceed to implementation until user explicitly selects "Yes, proceed"**

**⚠️ CRITICAL: Any response other than selecting "Yes, proceed with implementation" is NOT approval. Config feedback, threshold changes, clarifications = update plan, then re-ask.**

**⚠️ CRITICAL: Claude handles the `Approved:` field update - user never edits it manually**

---

## Context Management

Context is managed automatically by auto-compaction. No agent action needed — just keep working.

ARGUMENTS: $ARGUMENTS

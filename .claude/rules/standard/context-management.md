## Context Management

### Understanding Token Usage

System warnings display message tokens only: `Token usage: X/200000`

This excludes ~30-35k overhead from system prompts, tools, and MCP servers. Always add 32k to the displayed value to estimate real context usage.

**Quick calculation:** System warning + 32k = Real total

| System Warning | Real Total | Real % | Status   |
| -------------- | ---------- | ------ | -------- |
| 140k           | 172k       | 86%    | Safe     |
| 150k           | 182k       | 91%    | Critical |
| 160k           | 192k       | 96%    | Danger   |
| 168k+          | 200k+      | 100%+  | Stop     |

### Behavior by Context Level

**Below 80% (< 148k displayed)**
- Work normally on any task
- No restrictions

**80-85% (148k-158k displayed)**
- Finish current work
- Avoid large refactors or reading many files
- Prefer focused, small changes

**85-90% (158k-168k displayed)**
- Complete small fixes only
- No new features
- Wrap up current task
- Suggest user run `/context` if uncertain

**90%+ (168k+ displayed)**
- STOP immediately - no exceptions
- Follow mandatory sequence below

### Mandatory Sequence at 90%

When system warning shows 168k or higher:

1. Calculate real percentage: `(displayed + 32k) / 200k`
2. Inform user:
   ```
   Context at ~XX% (displayed Xk + 32k overhead = Xk real).
   Running /remember to preserve work.
   Please run /clear then continue with /implement.
   ```
3. Run `/remember` to store learnings in Cipher
4. Stop all work - do not attempt "one more fix"

If uncertain about percentage, ask user to run `/context` for exact value.

### After Context Clear

**Preserved:**
- Repository code and tests
- Plan files in `docs/plans/`
- Cipher memory (via `/remember`)
- Searchable codebase

**Lost:**
- Conversation history
- Undocumented decisions

**Resume workflow:**
1. Read plan from `docs/plans/`
2. Check `git status` for completed work
3. Query Cipher for stored context
4. Continue from unchecked tasks (`[ ]` in plan)

### Why 90% Threshold

Tool calls, file reads, and error traces can consume 5-10k tokens unexpectedly. The 90% threshold provides safety margin to complete current operations and preserve state before overflow.

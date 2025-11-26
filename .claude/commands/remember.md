---
description: Cross-session persistent memory storage for learnings within a session
---
# REMEMBER: Session Learnings with Structured Knowledge

**Purpose:** Preserve architectural understanding, design decisions, and implementation learnings in Cipher before `/clear`.

**Workflows:** `/remember` → `/clear` → `/implement [plan]` (continues with fresh context)

## The Process

### Step 1: Update Plan Progress (Only if using /plan → /implement workflow)

**CRITICAL:** Only mark tasks as complete if FULLY WORKING (tests pass + actual code executes successfully)

Check `git status --short` → Update plan's Progress Tracking:
- Mark completed: `- [ ]` → `- [x]` ONLY if tests pass AND code works
- Leave incomplete: `- [ ]` if tests fail OR code not executed OR broken functionality
- Add sub-tasks for incomplete work: Task 6.1, 6.2
- Update counts and percentages

**DO NOT mark tasks complete if:**
- Tests failing
- Code not executed
- Program crashes
- Outputs incorrect
- Only partially implemented

### Step 2: Identify Key Learnings with Call Chain Impact

**Must Capture:**
- **Architectural Decisions:** Why specific patterns were chosen
- **Call Chain Changes:** Functions affected upstream/downstream
- **Side Effects:** Database, cache, external system impacts
- **Integration Points:** How components interact
- **Performance Considerations:** Bottlenecks identified/solved
- **Security Measures:** Auth/validation/sanitization added
- **Testing Strategies:** Test patterns that worked well

**Skip:** Trivial changes | Obvious implementations | Temporary debug steps

### Step 3: Store Structured Knowledge in Cipher

```
mcp__cipher__ask_cipher("Store: [Feature] - [Title]

## Architecture & Design
- Pattern: [Pattern used] → [Why chosen over alternatives]
- Integration: [How it connects to existing system]

## Implementation Details
- Built: [What/how with file:line references]
- Call Chains: [Modified functions] → [Upstream/downstream impacts]
- Side Effects: [Database/cache/external changes]

## Decisions & Trade-offs
- [Decision]: [Why] → [Alternative considered]
- Performance: [Trade-off made] → [Impact]

## Critical Code Locations
- [file:line] - [Core logic/entry point]
- [file:line] - [Complex algorithm/validation]
- [file:line] - [Integration point]

## Gotchas & Solutions
- Problem: [Issue encountered]
  Solution: [How resolved]
  Prevention: [How to avoid in future]

## Testing Insights
- Pattern: [Test approach] → [Why effective]
- Edge case: [Discovered case] → [How to test]

Docs: [plan path if exists]")
```

### Step 4: Confirm Storage

```
✅ Stored [N] learnings in Cipher
Next: `/clear` → `/implement [plan]` to continue
```

## Key Principles & What to Store

**Principles:** Run BEFORE `/clear` | Be specific (file:line) | Explain WHY | Update plan inline | Store gotchas

**✅ Store:** Architecture decisions | Working patterns | Problem solutions | Complex logic | Integration points | Gotchas

**❌ Skip:** Trivial changes | Obvious implementations | Debug steps | Vague progress statements

---
description: Execute implementation plans in batches
---
# IMPLEMENT MODE: Task Execution with Mandatory Context Gathering

**Execute ALL tasks continuously. NO stopping unless context manager says context is full.**

## Mandatory Context Gathering Phase (REQUIRED)

**Before ANY implementation, you MUST:**

1. **Read the COMPLETE plan** - Understanding overall architecture and design
2. **Verify comprehension** - Summarize what you learned to demonstrate understanding
3. **Identify dependencies** - List files, functions, classes that need modification
4. **Check current state:**
   - Git status: `git status --short` and `git diff --name-only`
   - Diagnostics: `mcp__ide__getDiagnostics()`
   - Plan progress: Check for `[x]` completed tasks
5. **Query knowledge base:**
   - Cipher: Past implementations and gotchas
   - Codebase: Related patterns and components

## Per-Task Execution Flow

**For EVERY task, follow this exact sequence:**

1. **READ PLAN'S IMPLEMENTATION STEPS** - List all files to create/modify/delete
2. **Perform Call Chain Analysis:**
   - **Trace Upwards (Callers):** Identify what calls the code you're modifying
   - **Trace Downwards (Callees):** Identify what the modified code calls
   - **Side Effects:** Check for database, cache, external system impacts
3. **Mark task as in_progress** in TodoWrite
4. **Check diagnostics** - `mcp__ide__getDiagnostics()`
5. **Execute TDD Flow:**
   - Write failing test first (RED phase)
   - Implement minimal code to pass (GREEN phase)
   - Refactor if needed (REFACTOR phase)
6. **Verify tests pass** - `uv run pytest tests/path/to/test.py -v`
7. **Run actual program** - Show real output with sample data
8. **Check diagnostics again** - Must be zero errors
9. **Validate Definition of Done** - Check all criteria from plan
10. **Mark task completed** in TodoWrite
11. **Update plan file** - Change `[ ]` to `[x]`
12. **Check context usage**

## Critical Task Rules

**⚠️ NEVER SKIP TASKS:**
- EVERY task MUST be fully implemented
- NO exceptions for "MVP scope" or complexity
- If blocked: STOP and report specific blockers
- NEVER mark complete without doing the work

## Verification Checklist

Before marking complete:
- [ ] Test written and FAILED (RED phase)
- [ ] Implementation written
- [ ] Test PASSES (GREEN phase)
- [ ] Program executed with verified output
- [ ] No diagnostics errors

## When All Tasks Complete

1. Quick verification: `mcp__ide__getDiagnostics()` and `uv run pytest`
2. Store learnings in Cipher
3. Inform user: "✅ All tasks complete. Run `/verify`"
4. DO NOT run /verify yourself


## Coding Standards

Apply these standards to all code changes. Prioritize simplicity, clarity, and maintainability.

### Core Principles

**DRY (Don't Repeat Yourself)**: When you see duplicated logic, extract it into a reusable function immediately. If you're about to copy-paste code, stop and create a shared function instead.

**YAGNI (You Aren't Gonna Need It)**: Build only what's explicitly required. Don't add abstractions, features, or complexity for hypothetical future needs. Add them when you have concrete evidence they're needed.

**Single Responsibility**: Each function should do one thing well. If you need "and" to describe what a function does, it's doing too much and should be split.

### Naming Conventions

Use descriptive names that reveal intent without requiring comments:
- Functions: `calculate_discount`, `validate_email`, `fetch_active_users`
- Avoid: `process`, `handle`, `data`, `temp`, `x`, `do_stuff`
- Use domain terminology familiar to the project
- Spell out words unless the abbreviation is universally understood

### Code Organization

**Imports**: Order as standard library → third-party → local application. Remove unused imports immediately.

**Dead Code**: Delete unused functions, commented-out blocks, and unreachable code. Use version control to recover old code if needed.

**Function Size**: Keep functions small and focused. Extract complex logic into well-named helper functions.

### Quality Checks

**Diagnostics**: Use `getDiagnostics` tool before starting work and after making changes. Fix all errors before considering the task complete.

**Formatting**: Let automated formatters handle code style. Don't manually format code.

**Backward Compatibility**: Only add compatibility logic when explicitly required by the user. Don't assume you need to support old versions.

### Decision Framework

When writing code, ask:
1. Is this the simplest solution that works?
2. Am I duplicating existing logic?
3. Will the names make sense to someone reading this in 6 months?
4. Does each function have a single, clear purpose?
5. Have I removed all unused code and imports?
6. Have I checked diagnostics?

If any answer is no, refactor before proceeding.


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


## Execution Verification

**Core Rule:** Tests passing ≠ Program working. Always execute and verify real output.

### Mandatory Execution

Run the actual program after tests pass. Tests use mocks and fixtures - they don't prove the real program works.

**Execute after:**
- Tests pass
- Refactoring code
- Modifying imports or dependencies
- Changing configuration
- Working with entry points
- Before marking any task complete

**If there's a runnable program, RUN IT.**

### How to Execute by Type

**Scripts/CLI Tools:**
```bash
# Run the actual command
python script.py --args
node cli.js command

# Verify: exit code, stdout/stderr, file changes
```

**API Services:**
```bash
# Start server (use controlBashProcess for long-running)
npm start
# Or for quick verification
python -m uvicorn app:app

# Test endpoints with curl or httpie
curl http://localhost:8000/api/endpoint

# Verify: response status, payload, database changes
```

**ETL/Data Pipelines:**
```bash
# Run the pipeline
python etl/pipeline.py

# Verify: logs, database records, output files
```

**Build Artifacts:**
```bash
# Build the package
npm run build
# Or
python -m build

# Run the built artifact, not source
node dist/index.js
# Or
pip install dist/*.whl && run-command
```

### Verification Checklist

After execution, confirm:
- [ ] No import/module errors
- [ ] No runtime exceptions
- [ ] Expected output in logs/stdout
- [ ] Side effects correct (files created, DB updated, API called)
- [ ] Configuration loaded properly
- [ ] Dependencies resolved
- [ ] Performance reasonable

### Evidence Required

Show concrete evidence, not assumptions:

❌ **Insufficient:**
- "Tests pass so it should work"
- "I'm confident the imports are correct"
- "It will probably work"

✅ **Required:**
- "Ran `python app.py` - output: [paste logs]"
- "Server started on port 8000, GET /health returned 200"
- "Database query returned 150 records as expected"
- "Script created output.csv with 1000 rows"

### Integration with TDD

1. Write failing test (RED)
2. Verify test fails correctly
3. Write minimal code (GREEN)
4. Verify tests pass
5. **⚠️ RUN ACTUAL PROGRAM** ← Don't skip
6. Verify real output matches expectations
7. Refactor if needed
8. Re-verify execution
9. Mark complete

Tests validate logic. Execution validates integration.

### Common Issues Caught

Execution catches what tests miss:

- **Import errors:** Tests mock imports, real code has wrong paths
- **Missing dependencies:** Tests mock libraries, real program needs installed packages
- **Configuration errors:** Tests use fixtures, real program reads missing env vars
- **Build issues:** Tests run source, built package has missing files
- **Path issues:** Tests run from project root, real program runs from different directory

### When to Skip Execution

Skip ONLY for:
- Documentation-only changes
- Test-only changes
- Pure internal refactoring (no entry points affected)
- Configuration files (where validation is the execution)

**If uncertain, execute.**

### When Execution Fails

If execution fails after tests pass:

1. This is a real bug - don't ignore it
2. Fix the issue immediately
3. Run tests again (should still pass)
4. Execute again to verify fix
5. Add test to catch this failure type

This reveals gaps in test coverage.

### Completion Checklist

Before marking work complete:

- [ ] All tests pass
- [ ] Executed actual program
- [ ] Verified real output (shown evidence)
- [ ] No errors in execution
- [ ] Side effects verified

**If you can't check all boxes, the work isn't complete.**

### Quick Reference

| Situation              | Action          |
| ---------------------- | --------------- |
| Tests just passed      | Execute program |
| About to mark complete | Execute program |
| Changed imports        | Execute program |
| Refactored code        | Execute program |
| Modified config        | Execute program |
| Uncertain if needed    | Execute program |
| Documentation only     | Skip execution  |

**Default action: Execute.**


## Git Operations - Read-Only Mode

**Rule:** You may READ git state but NEVER WRITE to git. User controls all version control decisions.

### What You Can Do

Execute these commands freely to understand repository state:

```bash
git status              # Check working tree
git status --short      # Compact status
git diff                # Unstaged changes
git diff --staged       # Staged changes
git diff HEAD~1         # Compare with previous commit
git log                 # Commit history
git log --oneline -10   # Recent commits
git show <commit>       # Commit details
git branch              # Local branches
git branch -a           # All branches
git branch -r           # Remote branches
```

Use these to:
- Understand what files changed
- Check current branch
- Review recent commits
- Identify merge conflicts
- Verify repository state before suggesting actions

### What You Cannot Do

**NEVER execute these commands under any circumstances:**

```bash
git add                 # Staging
git commit              # Committing
git push                # Pushing
git pull                # Pulling
git fetch               # Fetching
git merge               # Merging
git rebase              # Rebasing
git checkout            # Switching branches/files
git switch              # Switching branches
git restore             # Restoring files
git reset               # Resetting
git revert              # Reverting
git stash               # Stashing
git cherry-pick         # Cherry-picking
git tag                 # Tagging
git remote add/remove   # Remote management
git submodule           # Submodule operations
```

### When User Asks for Git Operations

If user requests git write operations:

1. **Acknowledge** the request
2. **Provide exact command** they should run
3. **Explain what it does** if complex
4. **Do not execute** the command yourself

Example response:
```
I can't execute git commits, but here's what you should run:

git add .
git commit -m "feat: add user authentication"

This stages all changes and creates a commit with a conventional commit message.
```

### Suggesting Commit Messages

You can suggest commit messages following conventional commits:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `refactor:` - Code refactoring
- `test:` - Test changes
- `chore:` - Maintenance tasks

Format: `<type>: <description>`

Example: `feat: add password reset functionality`

### Checking Work Before Completion

Always check git status before marking work complete:

```bash
git status              # Verify expected files changed
git diff                # Review actual changes
```

This helps you:
- Confirm changes were applied correctly
- Identify unintended modifications
- Verify no files were accidentally created/deleted

### Exception: Explicit User Override

If user explicitly says "checkout branch X" or "switch to branch Y", you may execute `git checkout` or `git switch` as directly requested. This is the only write operation exception.


## MCP Tools - Core Workflow Integration

**Rule:** Query memory first, verify with diagnostics, store learnings last

### Cipher - Project Memory

**Tool:** `mcp_cipher_ask_cipher`

**Query existing knowledge:**
```
"How did we implement authentication?"
"What pattern did we use for error handling?"
"Why did we choose library X over Y?"
```

**Store new learnings:**
```
"Store: Fixed race condition in user service using mutex locks"
"Store: API rate limit is 100 req/min, implemented exponential backoff"
"Store: Database migration pattern: create migration → test locally → review → deploy"
```

**When to use:**
- Start of every task: Query for relevant past decisions
- End of every task: Store what you learned
- Before implementing: Check if similar problem was solved
- After debugging: Document the solution for future reference

### Claude Context - Semantic Code Search

**Tools:**
- `mcp_claude-context_index_codebase` - Index repository for search
- `mcp_claude-context_search_code` - Find code patterns semantically
- `mcp_claude-context_get_indexing_status` - Check if index is ready

**Search patterns:**
```
"authentication middleware implementation"
"error handling in API routes"
"database connection pooling"
"test fixtures for user model"
```

**When to use:**
- Finding existing implementations to follow patterns
- Locating where specific functionality lives
- Understanding how features are structured
- Before writing new code: Search for similar existing code

**Workflow:**
1. Check indexing status first
2. If not indexed, index the codebase
3. Search for relevant patterns
4. Review results to understand existing approaches

### IDE - Diagnostics and Execution

**Tools:**
- `mcp_ide_getDiagnostics` - Get errors, warnings, and type issues
- `mcp_ide_executeCode` - Run code in Jupyter kernel (notebooks only)

**Mandatory usage:**
- **Before starting work:** Check existing diagnostics to understand current state
- **After every file change:** Verify no new errors introduced
- **Before marking complete:** Confirm clean diagnostics

**Never skip diagnostics.** Passing tests don't guarantee no type errors or linting issues.

### Ref - External Documentation

**Tools:**
- `mcp_Ref_ref_search_documentation` - Search docs, examples, articles
- `mcp_Ref_ref_read_url` - Read specific documentation pages

**Search for:**
- Library API documentation
- Code examples and snippets
- GitHub repository documentation
- Technical articles and guides
- Best practices and patterns

**Usage patterns:**
```
ref_search_documentation("fastapi dependency injection")
ref_search_documentation("pytest fixtures scope")
ref_read_url("https://raw.githubusercontent.com/org/repo/main/README.md")
```

**When to use:**
- Learning unfamiliar library APIs
- Finding code examples for specific features
- Understanding best practices
- Researching implementation approaches

**Important:** Use exact URLs from search results, including hash fragments for specific sections.

### MCP Funnel - Tool Discovery

**Tools:**
- `mcp_mcp-funnel_discover_tools_by_words` - Find tools by keywords
- `mcp_mcp-funnel_get_tool_schema` - Get tool parameters
- `mcp_mcp-funnel_bridge_tool_request` - Execute discovered tools

**When to use:**
- Need specialized functionality not in core tools
- Exploring available MCP servers
- Extending capabilities for specific tasks

**Pattern:**
1. Discover tools: `discover_tools_by_words("database migration")`
2. Get schema: `get_tool_schema("discovered_tool_name")`
3. Execute: `bridge_tool_request("tool_name", {args})`

Use sparingly - core tools handle most needs.

## Mandatory Workflow Patterns

### Task Start Sequence

1. **Check diagnostics:** `getDiagnostics()` - Understand current state
2. **Query memory:** `ask_cipher("How did we handle X?")` - Learn from past
3. **Search codebase:** `search_code(path, "relevant pattern")` - Find examples
4. **Search docs if needed:** `ref_search_documentation("library feature")` - External knowledge

### Task End Sequence

1. **Verify diagnostics:** `getDiagnostics()` - Confirm no new errors
2. **Store learnings:** `ask_cipher("Store: [what you learned]")` - Document for future

### When Stuck

1. Query Cipher for past solutions to similar problems
2. Search codebase for existing patterns
3. Search Ref for external documentation and examples
4. Consider MCP Funnel for specialized tools

## Common Mistakes to Avoid

**Don't skip diagnostics:** "Tests pass" ≠ "No errors". Always check diagnostics.

**Don't forget to store learnings:** If you solved a problem, store it. Future you will thank you.

**Don't search externally first:** Check Cipher and codebase before searching external docs. Project-specific knowledge is more relevant.

**Don't ignore indexing status:** If Claude Context search returns nothing, check if codebase is indexed.

**Don't use MCP Funnel as first resort:** Core tools handle 95% of needs. Only use Funnel for specialized requirements.

## Tool Selection Decision Tree

```
Need to check for errors? → getDiagnostics
Need to remember past decisions? → ask_cipher (query)
Need to find existing code? → search_code
Need external documentation? → ref_search_documentation
Need specialized functionality? → discover_tools_by_words
Finished task? → getDiagnostics + ask_cipher (store)
```


## Systematic Debugging

**Core Principle:** Never propose fixes without completing root cause investigation. Random fixes waste time and create new bugs.

**Apply this process for ANY technical issue:** test failures, runtime errors, build failures, unexpected behavior, performance problems, CI/CD failures, integration issues.

### Mandatory Rule

**NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST**

If you haven't completed Phase 1, you cannot propose fixes.

**Never skip this process when:**
- Issue seems simple (simple bugs have root causes too)
- Under time pressure (systematic debugging is faster than guess-and-check)
- "Just one quick fix" seems obvious (first fix sets the pattern)
- You've already tried multiple fixes (return to Phase 1 with new information)

### Four-Phase Debugging Process

Complete each phase sequentially. Do not skip ahead.

#### Phase 1: Root Cause Investigation

**Complete ALL steps before proposing any fix:**

1. **Read Error Messages Completely**
   - Read full stack traces, don't skim
   - Note line numbers, file paths, error codes
   - Error messages often contain the exact solution

2. **Reproduce Consistently**
   - Document exact steps to trigger the issue
   - Verify it happens reliably
   - If not reproducible: gather more data, never guess

3. **Check Recent Changes**
   - Review git diff and recent commits
   - Check for new dependencies or config changes
   - Identify environmental differences

4. **Add Diagnostic Instrumentation for Multi-Component Systems**

   When debugging systems with multiple layers (CI → build → signing, API → service → database):

   **Add logging at EACH component boundary:**
   - Log input data entering component
   - Log output data exiting component
   - Verify environment/config propagation
   - Check state at each layer

   **Run once to gather evidence, THEN analyze to identify failing component**

   Example for multi-layer system:
   ```bash
   # Layer 1: Check workflow environment
   echo "=== Workflow secrets: ==="
   echo "IDENTITY: ${IDENTITY:+SET}${IDENTITY:-UNSET}"

   # Layer 2: Check build script environment
   echo "=== Build script environment: ==="
   env | grep IDENTITY || echo "IDENTITY not in environment"

   # Layer 3: Check signing state
   echo "=== Keychain state: ==="
   security list-keychains
   security find-identity -v

   # Layer 4: Verbose signing
   codesign --sign "$IDENTITY" --verbose=4 "$APP"
   ```

   This reveals which layer fails (e.g., secrets → workflow ✓, workflow → build ✗)

#### Phase 2: Pattern Analysis

**Understand the pattern before proposing fixes:**

1. **Find Working Examples**
   - Locate similar working code in the codebase
   - Identify what works that's similar to what's broken

2. **Compare Against References**
   - If implementing a pattern, read reference implementation COMPLETELY
   - Read every line, don't skim
   - Understand the full pattern before applying

3. **Identify All Differences**
   - List every difference between working and broken code
   - Include small differences - don't assume "that can't matter"

4. **Understand Dependencies**
   - Identify required components, settings, config, environment
   - Document assumptions the code makes

#### Phase 3: Hypothesis and Testing

**Apply scientific method:**

1. **Form Single, Specific Hypothesis**
   - State clearly: "I think X is the root cause because Y"
   - Be specific, avoid vague statements

2. **Test with Minimal Change**
   - Make the SMALLEST possible change to test hypothesis
   - Change one variable at a time
   - Never fix multiple things simultaneously

3. **Verify Result**
   - If it worked → proceed to Phase 4
   - If it didn't work → form NEW hypothesis, return to step 1
   - Never add more fixes on top of failed fixes

4. **Acknowledge Uncertainty**
   - If you don't understand something, say so explicitly
   - Ask for clarification or research more
   - Never pretend to know or guess

#### Phase 4: Implementation

**Fix the root cause, not symptoms:**

1. **Create Failing Test Case First**
   - Write simplest possible reproduction
   - Use automated test if possible, otherwise one-off test script
   - MUST create test before implementing fix
   - Follow TDD principles

2. **Implement Single Fix**
   - Address only the root cause identified
   - Make ONE change at a time
   - No "while I'm here" improvements
   - No bundled refactoring

3. **Verify Fix Completely**
   - Confirm new test passes
   - Confirm no other tests broken
   - Verify issue actually resolved

4. **If Fix Doesn't Work**
   - STOP and count attempted fixes
   - If < 3 attempts: Return to Phase 1 with new information
   - If ≥ 3 attempts: Proceed to step 5
   - Never attempt 4th fix without architectural discussion

5. **After 3 Failed Fixes: Question Architecture**

   **Indicators of architectural problems:**
   - Each fix reveals new problems in different places
   - Fixes require massive refactoring
   - Each fix creates new symptoms elsewhere

   **Action required:**
   - Question whether the pattern is fundamentally sound
   - Discuss with user before attempting more fixes
   - Consider architectural refactoring vs. symptom fixing

   This is not a failed hypothesis - this indicates wrong architecture.

### Red Flags - STOP and Follow Process

If you catch yourself thinking:
- "Quick fix for now, investigate later"
- "Just try changing X and see if it works"
- "Add multiple changes, run tests"
- "Skip the test, I'll manually verify"
- "It's probably X, let me fix that"
- "I don't fully understand but this might work"
- "Pattern says X but I'll adapt it differently"
- "Here are the main problems: [lists fixes without investigation]"
- Proposing solutions before tracing data flow
- **"One more fix attempt" (when already tried 2+)**
- **Each fix reveals new problem in different place**

**ALL of these mean: STOP. Return to Phase 1.**

**If 3+ fixes failed:** Question the architecture (see Phase 4.5)

### your human partner's Signals You're Doing It Wrong

**Watch for these redirections:**
- "Is that not happening?" - You assumed without verifying
- "Will it show us...?" - You should have added evidence gathering
- "Stop guessing" - You're proposing fixes without understanding
- "Ultrathink this" - Question fundamentals, not just symptoms
- "We're stuck?" (frustrated) - Your approach isn't working

**When you see these:** STOP. Return to Phase 1.

### Common Rationalizations

| Excuse                                       | Reality                                                                 |
| -------------------------------------------- | ----------------------------------------------------------------------- |
| "Issue is simple, don't need process"        | Simple issues have root causes too. Process is fast for simple bugs.    |
| "Emergency, no time for process"             | Systematic debugging is FASTER than guess-and-check thrashing.          |
| "Just try this first, then investigate"      | First fix sets the pattern. Do it right from the start.                 |
| "I'll write test after confirming fix works" | Untested fixes don't stick. Test first proves it.                       |
| "Multiple fixes at once saves time"          | Can't isolate what worked. Causes new bugs.                             |
| "Reference too long, I'll adapt the pattern" | Partial understanding guarantees bugs. Read it completely.              |
| "I see the problem, let me fix it"           | Seeing symptoms ≠ understanding root cause.                             |
| "One more fix attempt" (after 2+ failures)   | 3+ failures = architectural problem. Question pattern, don't fix again. |

### Quick Reference

| Phase                 | Key Activities                                         | Success Criteria            |
| --------------------- | ------------------------------------------------------ | --------------------------- |
| **1. Root Cause**     | Read errors, reproduce, check changes, gather evidence | Understand WHAT and WHY     |
| **2. Pattern**        | Find working examples, compare                         | Identify differences        |
| **3. Hypothesis**     | Form theory, test minimally                            | Confirmed or new hypothesis |
| **4. Implementation** | Create test, fix, verify                               | Bug resolved, tests pass    |

### When Process Reveals "No Root Cause"

If systematic investigation reveals issue is truly environmental, timing-dependent, or external:

1. You've completed the process
2. Document what you investigated
3. Implement appropriate handling (retry, timeout, error message)
4. Add monitoring/logging for future investigation

**But:** 95% of "no root cause" cases are incomplete investigation.

### Real-World Impact

From debugging sessions:
- Systematic approach: 15-30 minutes to fix
- Random fixes approach: 2-3 hours of thrashing
- First-time fix rate: 95% vs 40%
- New bugs introduced: Near zero vs common


## TDD (Test-Driven Development) - Mandatory Workflow

**Core Rule:** No production code without a failing test first. No exceptions.

### The Red-Green-Refactor Cycle

Follow this exact sequence for every feature, function, or behavior change:

#### 1. RED - Write Failing Test

Write one minimal test that describes the desired behavior.

**Test requirements:**
- Tests one specific behavior
- Has descriptive name: `test_<function>_<scenario>_<expected_result>`
- Uses real code (avoid mocks unless testing external dependencies)
- Focuses on behavior, not implementation details

**Example:**
```python
def test_calculate_discount_with_valid_coupon_returns_discounted_price():
    result = calculate_discount(price=100, coupon="SAVE20")
    assert result == 80
```

#### 2. VERIFY RED - Confirm Test Fails

**MANDATORY STEP - Never skip this verification.**

Execute the test and verify:
- Test fails with expected failure message
- Fails because feature doesn't exist (not syntax errors or typos)
- Failure message clearly indicates what's missing

**If test passes:** You're testing existing behavior. Rewrite the test.
**If test errors:** Fix the error first, then re-run until it fails correctly.

**Why this matters:** A test that passes immediately proves nothing. You must see it fail to know it actually tests the feature.

#### 3. GREEN - Write Minimal Code

Write the simplest code that makes the test pass.

**Rules:**
- Implement only what the test requires
- No extra features or "improvements"
- No refactoring of other code
- Hardcoding is acceptable if it passes the test

**Example:**
```python
def calculate_discount(price, coupon):
    if coupon == "SAVE20":
        return price * 0.8
    return price
```

#### 4. VERIFY GREEN - Confirm Test Passes

**MANDATORY STEP.**

Execute the test and verify:
- New test passes
- All existing tests still pass
- No errors or warnings in output
- Use `getDiagnostics` to check for type errors or linting issues

**If test fails:** Fix the implementation, not the test.
**If other tests fail:** Fix immediately before proceeding.

#### 5. REFACTOR - Improve Code Quality

Only after tests are green, improve code quality:
- Remove duplication
- Improve variable/function names
- Extract helper functions
- Simplify logic

**Critical:** Keep tests passing throughout refactoring. Re-run tests after each change.

**Do not add new behavior during refactoring.**

### AI Assistant Workflow

When implementing features, follow this exact sequence:

1. **Announce intention:** "Writing test for [behavior]"
2. **Write test:** Create failing test file
3. **Execute test:** Run test and show failure output
4. **Verify failure:** Confirm it fails for the right reason
5. **Announce implementation:** "Writing minimal code to pass test"
6. **Write code:** Implement minimal solution
7. **Execute test:** Run test and show passing output
8. **Verify success:** Confirm all tests pass, check diagnostics
9. **Refactor if needed:** Improve code while keeping tests green
10. **Confirm completion:** Show final test run with all tests passing

### When TDD Applies

**Always use TDD for:**
- New functions or methods
- New API endpoints
- New business logic
- Bug fixes (write test that reproduces bug first)
- Behavior changes

**TDD not required for:**
- Documentation-only changes
- Configuration file updates
- Dependency version updates
- Formatting/style-only changes

**When uncertain, use TDD.**

### Common Mistakes to Avoid

**Writing code before test:**
If you catch yourself writing implementation code before a failing test exists, stop immediately. Delete the code and start with the test.

**Test passes immediately:**
This means you're testing existing behavior or the test is wrong. Rewrite the test to actually test new functionality.

**Skipping verification steps:**
Always execute tests and show output. Don't assume tests pass or fail - verify it.

**Testing implementation instead of behavior:**
Test what the code does, not how it does it. Tests should survive refactoring.

**Using mocks unnecessarily:**
Only mock external dependencies (APIs, databases, file systems). Don't mock your own code.

### Verification Checklist

Before marking any implementation complete, verify:

- [ ] Every new function/method has at least one test
- [ ] Watched each test fail before implementing
- [ ] Each test failed for expected reason (missing feature, not typo)
- [ ] Wrote minimal code to pass each test
- [ ] All tests pass (executed and verified)
- [ ] `getDiagnostics` shows no errors or warnings
- [ ] Tests use real code (mocks only for external dependencies)
- [ ] Can explain why each test failed initially

**If any checkbox is unchecked, TDD was not followed. Start over.**

### Why This Order Matters

**Test-after proves nothing:** Tests written after implementation pass immediately, which doesn't prove they test the right thing. You never saw them catch the bug.

**Test-first proves correctness:** Seeing the test fail first proves it actually tests the feature. When it passes, you know the implementation is correct.

**Minimal code prevents over-engineering:** Writing only enough code to pass the test prevents unnecessary complexity and wasted effort.

**Refactor-after-green prevents breaking changes:** Refactoring with passing tests ensures you don't accidentally break functionality.

### Decision Tree

```
Need to add/change behavior?
├─ YES → Write failing test first
│   ├─ Test fails correctly? → Write minimal code
│   │   ├─ Test passes? → Refactor if needed → Done
│   │   └─ Test fails? → Fix code, re-run
│   └─ Test passes immediately? → Rewrite test
└─ NO (docs/config only) → Skip TDD
```


## Testing Strategies and Coverage

**Core Rule:** Unit tests for logic, integration tests for interactions, E2E tests for workflows. Minimum 80% coverage required.

### Test Organization

Check existing structure before creating tests:

```
tests/
├── unit/              # Fast, isolated (< 1ms each)
├── integration/       # Real dependencies
└── e2e/              # Complete workflows
    └── postman/      # API collections (if applicable)
```

### Test Type Selection

**Unit Tests - Use When:**
- Testing pure functions and calculations
- Business logic without external dependencies
- Data transformations and parsing
- Input validation rules
- Utility functions

**Requirements:**
- Fast execution (< 1ms per test)
- Zero external dependencies (mock databases, APIs, filesystem)
- Test single behavior per test
- Use test markers (`@pytest.mark.unit`)

**Integration Tests - Use When:**
- Testing database queries and transactions
- External API calls
- Message queue operations
- File system operations
- Authentication flows

**Requirements:**
- Use real dependencies (test databases, not production)
- Setup/teardown fixtures for isolation
- Clean up data after each test
- Use test markers (`@pytest.mark.integration`)

**E2E Tests - Use When:**
- Testing complete user workflows
- API endpoint chains
- Data pipeline end-to-end flows

### Test Naming Convention

**Mandatory Pattern:** `test_<function>_<scenario>_<expected_result>`

Examples:
- `test_process_payment_with_insufficient_funds_raises_error`
- `test_fetch_users_with_admin_role_returns_filtered_list`
- `test_parse_csv_with_missing_columns_uses_defaults`

Names must be self-documenting without reading code.

### Running Tests

Identify framework first (pytest, jest, vitest, mocha):

```bash
# Run all tests
pytest                    # Python
npm test                  # Node.js

# Run by type
pytest -m unit           # Unit only
pytest -m integration    # Integration only

# Run specific file/test
pytest tests/unit/test_auth.py
pytest tests/unit/test_auth.py::test_login_success

# With output
pytest -v -s            # Verbose with prints
```

### Coverage Requirements

**Before marking work complete:**

1. Run coverage: `pytest --cov=src --cov-report=term-missing --cov-fail-under=80`
2. Verify ≥ 80% coverage
3. Add tests for uncovered critical paths

**Must cover:**
- All business logic functions
- All API endpoints
- All data transformations
- All validation rules
- All error handling paths
- All conditional branches

**Exclude from coverage:**
- `if __name__ == "__main__"` blocks
- Generated code (migrations, protobuf)
- Configuration files
- Simple getters/setters with no logic

### Test Fixtures

Reuse setup code via fixtures:

```python
# Python (pytest)
@pytest.fixture
def db_session():
    session = create_test_session()
    yield session
    session.close()
```

```javascript
// JavaScript (Jest)
beforeEach(() => { /* Setup */ });
afterEach(() => { /* Cleanup */ });
```

Each test must start with clean, isolated state.

### AI Assistant Workflow

When implementing functionality:

1. Search codebase for similar test patterns
2. Determine test type (unit/integration/E2E) based on dependencies
3. Write failing test first (TDD)
4. Reuse existing fixtures
5. Follow naming convention
6. Run test to verify failure
7. Implement minimal code to pass
8. Run all tests to prevent regressions
9. Verify coverage ≥ 80%
10. Execute actual program

### E2E Testing Patterns

**For APIs (Newman/Postman):**

```bash
newman run postman/collections/api-tests.json \
  -e postman/environments/dev.json \
  --reporters cli,json
```

Test assertions:
- HTTP status codes (200, 201, 400, 401, 404, 500)
- Response time thresholds
- JSON schema validation
- State changes (database records)

**For Data Pipelines:**

Run actual pipeline, verify:
- Source extraction completes
- Transformations produce expected output
- Destination receives correct data
- Data quality checks pass
- Logs show expected flow

### Common Mistakes

**Dependent tests:**
```python
# BAD - test2 depends on test1 running first
def test1_create_user():
    create_user("test")

def test2_update_user():
    get_user("test")  # Assumes test1 ran
```

**Testing implementation instead of behavior:**
```python
# BAD - tests internal variable
def test_internal_counter_increments():
    obj._counter += 1
    assert obj._counter == 1

# GOOD - tests behavior
def test_process_increments_total():
    obj.process()
    assert obj.get_total() == 1
```

**Other mistakes to avoid:**
- Ignoring failing tests (fix or remove immediately)
- Committing commented-out tests
- Time-dependent assertions (causes flakiness)
- Relying on external services in unit tests
- Missing cleanup between tests

### Test Markers

Organize tests by type for selective execution:

```python
# Python
@pytest.mark.unit
@pytest.mark.integration
@pytest.mark.slow
```

```javascript
// JavaScript
describe.skip('integration tests', () => {});
```

Use to run fast tests during development, full suite in CI/CD.

### Decision Tree

```
Does function use external dependencies?
├─ NO → Unit test (mock all external calls)
└─ YES → Integration test (use real dependencies)

Is this a complete user workflow?
├─ YES → E2E test (test entire flow)
└─ NO → Unit or integration test
```

### Completion Checklist

Before marking testing complete:

- [ ] All new functions have tests
- [ ] Tests follow naming convention
- [ ] Unit tests mock external dependencies
- [ ] Integration tests use real dependencies
- [ ] All tests pass
- [ ] Coverage ≥ 80% verified
- [ ] No flaky or dependent tests
- [ ] Actual program executed and verified

**If any checkbox unchecked, testing is incomplete.**


## Verification Before Completion

**Core Principle:** Evidence before claims. Never claim success without fresh verification output.

### Mandatory Rule

NO completion claims without executing verification commands and showing output in the current message.

### Verification Workflow

Before ANY claim of success, completion, or correctness:

1. **Identify** - What command proves this claim?
2. **Execute** - Run the FULL command (not partial, not cached)
3. **Read** - Check exit code, count failures, read full output
4. **Confirm** - Does output actually prove the claim?
5. **Report** - State claim WITH evidence from step 3

**If you haven't run the command in this message, you cannot claim it passes.**

### What Requires Verification

| Claim                   | Required Evidence           | Insufficient                |
| ----------------------- | --------------------------- | --------------------------- |
| "Tests pass"            | Fresh test run: 0 failures  | Previous run, "should pass" |
| "Linter clean"          | Linter output: 0 errors     | Partial check, assumption   |
| "Build succeeds"        | Build command: exit 0       | Linter passing              |
| "Bug fixed"             | Test reproducing bug passes | Code changed                |
| "Regression test works" | Red-green cycle verified    | Test passes once            |
| "Requirements met"      | Line-by-line checklist      | Tests passing               |

### Stop Signals

Run verification immediately if you're about to:
- Use uncertain language: "should", "probably", "seems to", "looks like"
- Express satisfaction: "Great!", "Perfect!", "Done!", "All set!"
- Commit, push, or create PR
- Mark task complete or move to next task
- Trust agent/tool reports without independent verification
- Think "just this once" or rely on confidence without evidence

### Correct Patterns

**Tests:**
- ✅ Run `pytest` → See "34 passed" → "All 34 tests pass"
- ❌ "Should pass now" / "Tests look correct"

**TDD Red-Green Cycle:**
- ✅ Write test → Run (fails) → Implement → Run (passes) → Verified
- ❌ "I wrote a regression test" (without seeing it fail first)

**Build:**
- ✅ Run `npm run build` → Exit 0 → "Build succeeds"
- ❌ "Linter passed, so build should work"

**Requirements:**
- ✅ Read plan → Check each item → Verify completion → Report status
- ❌ "Tests pass, so requirements are met"

### Why This Matters

**Consequences of unverified claims:**
- Trust broken with human partner
- Undefined functions shipped (crashes in production)
- Incomplete features deployed
- Time wasted on rework
- Violates core value: honesty

**The rule exists because assumptions fail. Evidence doesn't.**


## Available Skills

**Testing:** @testing-anti-patterns | @testing-writing-guidelines
**Backend:** @backend-api-standards | @backend-migration-standards | @backend-models-standards | @backend-python-standards | @backend-queries-standards
**Frontend:** @frontend-accessibility-standards | @frontend-components-standards | @frontend-css-standards | @frontend-responsive-design-standards

---
description: Create structured implementation plans
---
# PLAN MODE: Six-Phase Planning Discovery Process

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

## Creating New Plans

### Phase 0: Research and Discovery

**Always start with:**
1. Query Cipher: `mcp__cipher__ask_cipher("What do we know about <feature>? Past implementations?")`
2. Search codebase: `mcp__claude-context__search_code(path="/workspaces/...", query="related features")`
3. Query relevant MCP servers for external systems

**Goals:**
- Understand existing patterns and architecture
- Find similar implementations to learn from
- Identify reusable components
- Learn from past decisions and gotchas

### Phase 1: Requirements Definition with EARS

**Generate formal requirements using EARS syntax:**
- Transform user request into User Stories with acceptance criteria
- Use EARS keywords: WHEN, THEN, IF, WHILE, WHERE, SHALL
- Be comprehensive - include edge cases and error conditions
- Don't ask multiple clarifying questions before first draft

**Required Format:**
```markdown
### Requirement 1
**User Story:** As a [role], I want [feature], so that [benefit]

#### Acceptance Criteria
1. WHEN [event] THEN the system SHALL [response]
2. IF [precondition] THEN the system SHALL [response]
3. WHERE [state] the system SHALL [behavior]
4. WHILE [ongoing condition] the system SHALL [maintain behavior]
```

**After generating requirements:**
- Present draft and ask: "Do the requirements look good? If so, we can move on to the design phase."
- MUST receive explicit approval (yes/approved/looks good) before proceeding
- Iterate based on feedback until approved

### Phase 2: Exploration

**Propose 2-3 architectural approaches:**
- Use **AskUserQuestion tool** to present options
- Each approach should have:
  - Brief description (2-3 sentences)
  - Key benefits
  - Trade-offs or limitations

**Example:**
```
Option A: Client-side filtering (Fast, no server load, limited scalability)
Option B: Server-side filtering (Scalable, secure, requires API changes)
Option C: Hybrid approach (Best of both, more complex)
```

Let the user choose the direction based on their priorities.

### Phase 3: Design Validation

**Present the chosen design in sections:**
- Keep each section 200-300 words
- Cover:
  - Architecture overview
  - Component breakdown
  - Data flow
  - Error handling strategy
  - Testing approach

**After each section:** Ask "Does this approach work for your needs?"
- Adjust based on feedback
- Don't proceed until design is validated

### Phase 4: Implementation Planning with Definition of Done

**CRITICAL: Task Count Limit**
- **Maximum: 10-12 tasks per plan**
- If initial breakdown exceeds 12 tasks, STOP
- Ask user to split into multiple features

**Enhanced Task Structure:**
```markdown
### Task N: [Component Name]

**Objective:** [1-2 sentences describing what to build]

**Files:**
- Create: `exact/path/to/file.py`
- Modify: `exact/path/to/existing.py`
- Test: `tests/exact/path/to/test.py`

**Implementation Steps:**
1. Write failing test - Define expected behavior
2. Implement minimal code - Make test pass
3. Verify execution - Run actual program
4. Integration test - Test with other components

**Definition of Done:**
- [ ] All tests pass (unit, integration if applicable)
- [ ] No diagnostics errors (linting, type checking)
- [ ] Code functions correctly with real data
- [ ] Edge cases handled appropriately
- [ ] Error messages are clear and actionable

**Requirements Traceability:**
- Satisfies: Requirement 1.2, 1.3 (reference to EARS requirements)
```

**Zero-context assumption:**
- Assume implementer knows nothing about codebase
- Provide exact file paths
- Explain domain concepts
- List integration points
- Reference similar patterns in codebase

### Phase 5: Documentation

**Save plan to:** `docs/plans/YYYY-MM-DD-<feature-name>.md`

**Required plan header:**
```markdown
# [Feature Name] Implementation Plan

> **IMPORTANT:** Start with fresh context. Run `/clear` before `/implement`.

**Goal:** [One sentence describing what this builds]

**Architecture:** [2-3 sentences about approach]

**Tech Stack:** [Key technologies/libraries]

**Context for Implementer:**
- [Key codebase convention or pattern]
- [Domain knowledge needed]
- [Integration points or dependencies]

## Progress Tracking
- [ ] Task 1: [Brief summary]
- [ ] Task 2: [Brief summary]

**Total Tasks:** [Number] (Max: 12)
```

### Phase 6: Implementation Handoff

**After saving plan:**
1. Store in Cipher: `mcp__cipher__ask_cipher("Store this implementation plan for <feature>")`
2. Inform user: "✅ Plan saved to docs/plans/YYYY-MM-DD-<feature>.md"
3. Provide next steps: "Ready for implementation. Run `/clear` then `/implement <plan-path>`"


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


## Available Skills

**Testing:** @testing-anti-patterns | @testing-writing-guidelines
**Backend:** @backend-api-standards | @backend-migration-standards | @backend-models-standards | @backend-python-standards | @backend-queries-standards
**Frontend:** @frontend-accessibility-standards | @frontend-components-standards | @frontend-css-standards | @frontend-responsive-design-standards

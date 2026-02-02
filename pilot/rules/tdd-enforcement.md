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

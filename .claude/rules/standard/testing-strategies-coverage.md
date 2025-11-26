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

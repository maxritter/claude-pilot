## Testing

### TDD — Mandatory Workflow

**⛔ STOP: Do you have a failing test? If not, write the test FIRST.**

#### The Red-Green-Refactor Cycle

1. **RED** — Write one minimal test for the desired behavior. Focus on behavior, not implementation. Mocks only for external deps.
   - **Naming:** Python: `test_<function>_<scenario>_<expected>` | TS: `it("should <behavior> when <condition>")`
2. **VERIFY RED** — Run the test, confirm it fails because the feature doesn't exist (not syntax errors). If it passes → rewrite.
3. **GREEN** — Write the simplest code that passes. No extras, no refactoring. Hardcoding is fine.
4. **VERIFY GREEN** — Run all tests, confirm they pass. Check diagnostics.
5. **REFACTOR** — Improve code quality (tests must stay green). No new behavior.

**When TDD applies:** New functions, API endpoints, business logic, bug fixes (reproduce first), behavior changes.

**Skip:** Documentation, config updates, dependency versions, formatting-only.

**Recovery (code written before test):** Don't revert — write the test immediately, verify it catches regressions. Goal is coverage, not ritual.

---

### Test Strategy & Coverage

**Unit tests for logic, integration tests for interactions, E2E tests for workflows. Minimum 80% coverage.**

| Type | Use When | Requirements |
|------|----------|--------------|
| **Unit** | Pure functions, business logic, validation, utilities | < 1ms each, mock ALL external deps, `@pytest.mark.unit` |
| **Integration** | DB queries, external APIs, file I/O, auth flows | Real test deps, fixtures, cleanup, `@pytest.mark.integration` |
| **E2E** | Complete user workflows, API chains, data pipelines | Test entire flow |

```
External dependencies? NO → Unit test | YES → Integration test
Complete user workflow? YES → E2E test | NO → Unit or integration
```

### Running Tests

```bash
uv run pytest -q                              # Python (quiet)
uv run pytest --cov=src --cov-fail-under=80  # Coverage
bun test                                      # Bun
npm test -- --silent                          # Jest/Vitest
```

### Mandatory Mocking in Unit Tests

| Call Type | MUST Mock | Example |
|-----------|-----------|---------|
| HTTP/Network | `httpx`, `requests` | `@patch("module.httpx.Client")` |
| Subprocess | `subprocess.run` | `@patch("module.subprocess.run")` |
| File I/O | `open`, `Path.read_text` | `@patch("builtins.open")` or `tmp_path` |
| Database | SQLite, PostgreSQL | Use test fixtures |
| External APIs | Any third-party | Mock the client |

Mock at module level (where imported, not where defined). Test > 1s = likely unmocked I/O.

### E2E: Frontend/UI (MANDATORY for web apps)

Use `playwright-cli` to verify what the user sees. See `playwright-cli.md` for commands.

### Anti-Patterns

- **Dependent tests** — each test must work independently
- **Testing implementation, not behavior** — test outputs, not internals
- **Incomplete mock data** — must match real API structure
- **Unnecessary mocks** — only for external deps

### Completion Checklist

- [ ] All new functions have tests
- [ ] Tests follow naming convention
- [ ] Unit tests mock external dependencies
- [ ] All tests pass
- [ ] Coverage ≥ 80% verified
- [ ] Actual program executed and verified

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

### Property-Based Testing (PBT)

**Use PBT when behavior depends on data shape, ranges, or combinations — not a single known input.**

| Language | Tool | Example |
|----------|------|---------|
| Python | `hypothesis` | `@given(st.lists(st.integers()))` |
| TypeScript | `fast-check` | `fc.assert(fc.property(fc.array(fc.integer()), ...))` |
| Go | `go test -fuzz` | `func FuzzFoo(f *testing.F) { f.Fuzz(...) }` |

**When to use:** Parsers, serializers, data structure invariants, encode/decode roundtrips, bugfix preservation properties (see `/spec` bugfix workflow).

**When NOT to use:** Simple CRUD, UI interactions, fixed-input validation, config changes.

**Rules:** PBT supplements example-based tests — don't replace them. Keep strategies simple (avoid deeply nested custom strategies). Set `max_examples` / `numRuns` low enough for CI (100–200).

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

**⛔ Session isolation:** In `/spec` workflows or any parallel context, ALWAYS use `-s="${PILOT_SESSION_ID:-default}"` on all `playwright-cli` commands to prevent cross-session browser interference. See `playwright-cli.md` Session Isolation section.

### Anti-Patterns

- **Dependent tests** — each test must work independently
- **Testing implementation, not behavior** — assert outputs and state changes, not that specific mocks were called. `assert result == expected` not `mock.assert_called_with(...)`. If the implementation changes but behavior stays the same, tests should still pass.
- **Incomplete mocks hiding structural assumptions** — mocks must mirror the complete real API structure, not just the fields you think you need. Partial mocks hide coupling to downstream fields and break when the real API returns additional or different data.
- **Unnecessary mocks** — only for external deps
- **Test-only methods in production** — never add methods, properties, or flags to production classes purely for test access. If you need internal state for testing, refactor the design so the behavior is observable through public interfaces.
- **Mocking without understanding** — before mocking a dependency, understand what it actually does. A mock that doesn't reflect real behavior is a lie — tests pass against the lie, then fail against reality.

### Completion Checklist

- [ ] All new functions have tests
- [ ] Tests follow naming convention
- [ ] Unit tests mock external dependencies
- [ ] All tests pass
- [ ] Coverage ≥ 80% verified
- [ ] Actual program executed and verified

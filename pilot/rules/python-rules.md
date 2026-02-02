## Python Development Standards

**Standards:** Always use uv | pytest for tests | ruff for quality | Self-documenting code

### Package Management - UV ONLY

**MANDATORY: Use `uv` for ALL Python package operations. NEVER use `pip` directly.**

```bash
# Package operations
uv pip install package-name
uv pip install -r requirements.txt
uv pip list
uv pip show package-name

# Running Python
uv run python script.py
uv run pytest
```

**Why uv:** Project standard, faster resolution, better lock files, consistency across team.

**If you type `pip`:** STOP. Use `uv pip` instead.

### Testing & Quality

**⚠️ CRITICAL: Always use minimal output flags to avoid context bloat.**

```bash
# Tests - USE MINIMAL OUTPUT
uv run pytest -q                                    # Quiet mode (preferred)
uv run pytest -q -m unit                            # Unit only, quiet
uv run pytest -q -m integration                     # Integration only, quiet
uv run pytest -q --tb=short                         # Short tracebacks on failure
uv run pytest -q --cov=src --cov-fail-under=80     # Coverage with quiet mode

# AVOID these verbose flags unless actively debugging:
# -v, --verbose, -vv, -s, --capture=no

# Code quality
ruff format .                                       # Format code
ruff check . --fix                                  # Fix linting
basedpyright src                                    # Type checker
```

**Why minimal output?** Verbose test output consumes context tokens rapidly. Use `-q` (quiet) by default. Only add `-v` or `-s` when you need to debug a specific failing test.

**Diagnostics & Linting - also minimize output:**
```bash
# Prefer concise output formats
ruff check . --output-format=concise    # Shorter than default
basedpyright src 2>&1 | head -50        # Limit type checker output if many errors

# When many errors exist, fix incrementally:
# 1. Run tool, note first few errors
# 2. Fix those specific errors
# 3. Re-run to see next batch
# DON'T dump 100+ errors into context at once
```

### Code Style Essentials

**Docstrings:** One-line for most functions. Multi-line only for complex logic.
```python
def calculate_total(items: list[Item]) -> float:
    """Calculate total price of all items."""
    return sum(item.price for item in items)
```

**Type Hints:** Required on all public function signatures.
```python
def process_order(order_id: str, user_id: int) -> Order:
    pass
```

**Imports:** Standard library → Third-party → Local. Ruff auto-sorts with `ruff check . --fix`.

**Comments:** Write self-documenting code. Use comments only for complex algorithms, non-obvious business logic, or workarounds.

### Project Configuration

**Python Version:** 3.12+ (requires-python = ">=3.12" in pyproject.toml)

**Project Structure:**
- Dependencies in `pyproject.toml` (not requirements.txt)
- Tests in `src/*/tests/` directories
- Use `@pytest.mark.unit` and `@pytest.mark.integration` markers

### Verification Checklist

Before completing Python work:
- [ ] Used `uv` for all package operations
- [ ] Tests pass: `uv run pytest`
- [ ] Code formatted: `ruff format .`
- [ ] Linting clean: `ruff check .`
- [ ] Type checking: `basedpyright src`
- [ ] Coverage ≥ 80%
- [ ] No unused imports (check with `getDiagnostics`)

### Quick Reference

| Task              | Command                       |
| ----------------- | ----------------------------- |
| Install package   | `uv pip install package-name` |
| Run tests         | `uv run pytest`               |
| Coverage          | `uv run pytest --cov=src`     |
| Format            | `ruff format .`               |
| Lint              | `ruff check . --fix`          |
| Type check        | `basedpyright src`           |
| Run script        | `uv run python script.py`     |

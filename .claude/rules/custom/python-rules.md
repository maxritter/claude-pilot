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
uv run mypy src
```

**Why uv:** Project standard, faster resolution, better lock files, consistency across team.

**If you type `pip`:** STOP. Use `uv pip` instead.

### Testing & Quality

```bash
# Tests
uv run pytest                                       # All tests
uv run pytest -m unit                               # Unit only
uv run pytest -m integration                        # Integration only
uv run pytest --cov=src --cov-fail-under=80        # With coverage (80% minimum)

# Code quality
ruff format .                                       # Format code
ruff check . --fix                                  # Fix linting
mypy src --strict                                   # Type checking
basedpyright src                                    # Alternative type checker
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
- [ ] Type checking: `mypy src --strict` or `basedpyright src`
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
| Type check        | `mypy src --strict`           |
| Run script        | `uv run python script.py`     |

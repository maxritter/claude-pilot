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

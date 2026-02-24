## Verification

**Core Rules:** (1) Tests passing ≠ program working — always execute. (2) No completion claims without fresh evidence in the current message.

### Execution Verification

Unit tests with mocks prove nothing about real-world behavior. After tests pass:

- CLI command → **run it** | API endpoint → **call it** | Frontend UI → **open with `playwright-cli -s="${PILOT_SESSION_ID:-default}"`** (session isolation — see `playwright-cli.md`)
- Any runnable program → **run it**

**When:** After tests pass, after refactoring, after changing imports/deps/config, before marking any task complete.

**Skip only for:** documentation-only, test-only, pure internal refactoring (no entry points), config-only changes.

### ⛔ Frontend Changes Require playwright-cli Verification

**Unit tests and typechecks are NOT sufficient for frontend/UI changes.** After tests pass, you MUST verify with `playwright-cli` that the change works in the actual running application.

| Step | Command |
|------|---------|
| Build | Build the viewer/bundle and deploy to the served location |
| Open | `playwright-cli -s="$PW_SESSION" open <url>` |
| Verify | `snapshot`, `click`, `run-code` — confirm the UI behaves correctly |
| Close | `playwright-cli -s="$PW_SESSION" close` |

**Common pitfalls to verify against:**
- Built bundle not deployed to the location the server actually reads from
- Server/worker caching stale bundles (check DOM classes match source)
- CSS layout issues invisible to unit tests (scroll containers, overflow, z-index)
- Elements present in DOM but not visible/interactive at runtime

**If you skip this step, you WILL ship broken UI.** A passing `renderToString` test does not prove the feature works.

### Output Correctness

**Running without errors ≠ correct output.** If code processes external data, fetch that data independently and compare. Numbers and content MUST match.

### Evidence Before Claims

1. **Identify** — What command proves this claim?
2. **Execute** — Run the full command (not cached)
3. **Read output** — Check exit code, count failures
4. **Report** — State claim WITH evidence

**If you haven't run the command in this message, you cannot claim it passes.**

| Claim | Required Evidence | Insufficient |
|-------|-------------------|-------------|
| "Tests pass" | Fresh run: 0 failures | Previous run, "should pass" |
| "Build succeeds" | Build exit 0 | "Linter passed" |
| "Bug fixed" | Reproducing test passes | "Code changed" |
| "UI works" | playwright-cli snapshot | "API returns 200" |

### ⛔ Fix ALL Errors — No Exceptions, No Asking

When verification reveals errors, fix ALL of them. Never ask "should I fix these?" — just fix them. "Pre-existing" and "unrelated to my changes" are not valid excuses.

### ⛔ Auto-Fix in /spec Workflow

**must_fix** and **should_fix** → Fix immediately. **suggestions** → Implement if quick. The ONLY user interaction in /spec is plan approval.

### Stop Signals — Verify NOW

If you're about to use uncertain language ("should", "probably"), express satisfaction ("Done!"), commit/push, or mark task complete — run verification first.

### When Execution Fails After Tests Pass

This is a real bug. Fix immediately → re-run tests → re-execute → add test to catch this failure type.

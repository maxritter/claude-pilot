## Systematic Debugging

**Rule:** No fixes without root cause investigation. Complete phases sequentially.

### Tools for Debugging Research

| Tool | When to Use |
|------|-------------|
| **Context7** | Library/framework API lookup (see `context7-docs.md` for full docs) |
| **Vexor** | Find similar patterns in codebase (`vexor search "error handling"`) |

**Context7 Quick Reference:**
```
resolve-library-id(query="descriptive question", libraryName="lib")
query-docs(libraryId="/npm/lib", query="specific question")
```
Both parameters required. Descriptive queries enable server-side reranking.

### Phase 1: Root Cause Investigation

Complete ALL before proposing fixes:

1. **Read errors completely** - Full stack traces, line numbers, error codes
2. **Reproduce consistently** - Document exact steps; if not reproducible, gather more data
3. **Check recent changes** - git diff, new dependencies, config changes
4. **Instrument multi-component systems** - Log at each boundary (input/output/state), run once to identify failing layer

### Phase 2: Pattern Analysis

1. **Find working examples** - Similar working code in codebase
2. **Compare against references** - Read reference implementations completely, every line
3. **Identify ALL differences** - Include small differences
4. **Understand dependencies** - Required components, settings, assumptions

### Phase 3: Hypothesis and Testing

1. **Form specific hypothesis** - "X is root cause because Y"
2. **Test with minimal change** - One variable at a time
3. **Verify result** - Worked → Phase 4; Failed → new hypothesis, return to step 1
4. **Acknowledge uncertainty** - Say so explicitly, never guess

### Phase 4: Implementation

1. **Create failing test first** - TDD principles
2. **Implement single fix** - ONE change, no bundled improvements
3. **Verify completely** - New test passes, no regressions
4. **If fix fails:**
   - < 3 attempts → Return to Phase 1 with new information
   - ≥ 3 attempts → **Question architecture** (each fix reveals new problems = wrong pattern)

### Red Flags → STOP, Return to Phase 1

- "Quick fix for now" / "Just try X"
- Multiple changes at once
- "Skip the test" / "Probably X"
- "Don't fully understand but might work"
- Proposing fixes before tracing data flow
- 2+ failed fixes and wanting "one more attempt"

### User Signals You're Wrong

- "Is that not happening?" → You assumed without verifying
- "Stop guessing" → Proposing fixes without understanding
- "We're stuck?" → Your approach isn't working

### Quick Reference

| Phase | Activities | Criteria |
|-------|------------|----------|
| 1. Root Cause | Read errors, reproduce, check changes, instrument | Understand WHAT and WHY |
| 2. Pattern | Find working examples, compare | Identify differences |
| 3. Hypothesis | Form theory, test minimally | Confirmed or new hypothesis |
| 4. Implementation | Create test, fix, verify | Bug resolved, tests pass |

**3+ failed fixes = architectural problem. Question the pattern, don't fix again.**

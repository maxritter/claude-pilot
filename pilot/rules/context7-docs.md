## Library Documentation with Context7

**MANDATORY: Use Context7 BEFORE writing code with unfamiliar libraries.** Context7 provides up-to-date documentation, code examples, and best practices that prevent mistakes and save time.

### When to Use Context7 (Proactively!)

| Situation | Action |
|-----------|--------|
| Adding new dependency | Query Context7 for setup and usage patterns |
| Using library for first time | Query Context7 for API overview and examples |
| Implementing specific feature | Query Context7 for that feature's documentation |
| Getting errors from a library | Query Context7 for correct usage patterns |
| Unsure about library capabilities | Query Context7 to understand what's available |

**Don't guess or assume** - Context7 has 1000s of indexed libraries with real documentation.

### Workflow

```
# Step 1: Get library ID
resolve-library-id(query="your question", libraryName="package-name")
→ Returns libraryId (e.g., "/npm/react")

# Step 2: Query docs (can call multiple times with different queries)
query-docs(libraryId="/npm/react", query="specific question")
→ Returns relevant documentation with code examples
```

### Query Tips

Use descriptive queries - they drive result relevance:
- ❌ `"fixtures"` → ✅ `"how to create and use fixtures in pytest"`
- ❌ `"hooks"` → ✅ `"useState and useEffect patterns in React"`
- ❌ `"auth"` → ✅ `"how to implement JWT authentication with refresh tokens"`

**Multiple queries are encouraged** - each query can reveal different aspects of the library.

### Tool Selection Guide

| Need | Primary Tool | Fallback |
|------|--------------|----------|
| Library API reference | Context7 | Official docs |
| Framework patterns | Context7 | Official docs |
| Code examples | Context7 | GitHub search |
| Error message lookup | WebSearch | Stack Overflow |
| General web research | WebSearch | - |
| Codebase patterns | Vexor | Grep/Glob |

### Example: Learning a New Library

When asked to use `pytest` for the first time:

```
# 1. Resolve the library
resolve-library-id(query="how to create and use fixtures in pytest", libraryName="pytest")
→ /pytest-dev/pytest

# 2. Query for overview
query-docs(libraryId="/pytest-dev/pytest", query="complete overview features capabilities installation")

# 3. Query for specific use case
query-docs(libraryId="/pytest-dev/pytest", query="fixtures and dependency injection patterns")

# 4. Query for advanced usage
query-docs(libraryId="/pytest-dev/pytest", query="parametrize decorator and test variants")
```

### Troubleshooting

- **Library not found:** Try variations like `@types/react` vs `react`, or `node:fs` for built-ins
- **Poor results:** Make query more specific, describe what you're trying to accomplish
- **Empty results:** Library may not be indexed - check official docs directly
- **Multiple libraries found:** Check the benchmark score and code snippet count to pick the best one

### Key Principle

**Learn before you code.** Spending 30 seconds querying Context7 prevents hours of debugging from incorrect assumptions about library behavior.

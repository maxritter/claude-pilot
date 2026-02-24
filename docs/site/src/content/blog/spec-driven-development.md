---
slug: "spec-driven-development"
title: "Spec-Driven Development with Claude Code"
description: "Structure large features with a plan-implement-verify loop. Stop Claude from drifting and ensure every feature matches your requirements."
date: "2026-02-10"
author: "Max Ritter"
tags: [Guide, Workflow]
readingTime: 5
keywords: "Claude Code spec, spec-driven development, Claude Code planning, AI development workflow, Claude Code features, structured AI coding"
---

# Spec-Driven Development with Claude Code

Large features fail when you let AI freestyle. Without structure, Claude drifts — implementing the wrong thing, skipping edge cases, or building something that doesn't match what you needed. Spec-driven development solves this by adding a plan-implement-verify loop.

## The Problem with "Just Build It"

Asking Claude to "add user authentication" without a plan leads to:

- **Scope creep** — Claude adds features you didn't ask for
- **Wrong assumptions** — It picks JWT when you wanted sessions, or bcrypt when you use Argon2
- **Incomplete work** — The happy path works, but error handling is missing
- **Lost progress** — Long sessions hit context limits and lose track of what was done

Spec-driven development fixes all of these by making Claude follow a structured workflow.

## The Three Phases

### Phase 1: Plan

Before writing any code, Claude explores the codebase, understands the architecture, and writes a detailed plan. The plan includes:

- **Tasks** — Numbered, ordered steps with clear acceptance criteria
- **Files affected** — Which files will be created or modified
- **Dependencies** — Which tasks must complete before others can start
- **Testing strategy** — How each task will be verified

You review and approve the plan before implementation begins. This is your checkpoint — if Claude misunderstood the requirement, you catch it here, not after hours of coding.

### Phase 2: Implement

Claude works through each task using TDD:

1. Write a failing test for the task
2. Implement the minimum code to pass
3. Run tests, fix failures
4. Mark the task complete, move to the next

Each task is tracked with progress indicators. If Claude discovers something unexpected during implementation (a missing dependency, a blocking issue), it handles it automatically for minor problems or asks you for architectural decisions.

### Phase 3: Verify

After all tasks are complete, three automated review agents check the work in parallel:

- **Compliance review** — Does the code match the plan? Are all tasks actually done?
- **Quality review** — Code quality, test coverage, security, error handling
- **Goal review** — Does the implementation achieve its intended outcome? Are all artifacts substantive and wired together?

Issues found during verification are fixed automatically. The verify phase loops back to implementation if needed, then re-verifies until clean.

## When to Use Spec-Driven Development

| Task | Use Spec? |
|------|-----------|
| Fix a typo | No — just fix it |
| Add a single function | No — too simple |
| New API endpoint with tests | Maybe — depends on complexity |
| New subsystem (auth, payments) | **Yes** — multiple files, architectural decisions |
| Cross-cutting refactor | **Yes** — affects many files, needs coordination |
| Multi-session project | **Yes** — plan file persists across sessions |

The threshold: if the task touches more than 5 files or requires architectural decisions, spec-driven development pays off.

## How Pilot Automates This

Pilot Shell's `/spec` command orchestrates the entire workflow:

```
/spec Add password reset with email verification
```

This triggers the full plan → implement → verify pipeline. Pilot handles:

- **Plan verification** — Review agents challenge the plan before you see it
- **Worktree isolation** — Implementation happens on a separate branch so your main branch stays clean
- **TDD enforcement** — Hooks ensure tests are written before production code
- **Automatic context management** — If context fills up, auto-compaction preserves state and work continues seamlessly
- **Progress tracking** — Real-time task status visible in your terminal

The only manual steps are approving the plan and (optionally) reviewing the final changes before merging.

## Key Insight

Spec-driven development isn't about bureaucracy. It's about **making the plan the contract**. Claude knows exactly what to build, you know exactly what to expect, and automated verification ensures the result matches both.

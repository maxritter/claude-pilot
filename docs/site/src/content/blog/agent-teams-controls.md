---
slug: "agent-teams-controls"
title: "Claude Code Agent Teams Controls: Delegate Mode, Hooks & More"
description: "Stop your agent team lead from grabbing implementation work. Configure delegate mode, plan approval, quality hooks, and CLAUDE.md optimization for teams."
date: "2026-02-12"
author: "Max Ritter"
tags: [Guide, Agents]
readingTime: 20
keywords: "agent, teams, controls, delegate, mode, hooks, plan, approval, claude, code"
---

Agents

# Claude Code Agent Teams Controls: Delegate Mode, Hooks & More

Stop your agent team lead from grabbing implementation work. Configure delegate mode, plan approval, quality hooks, and CLAUDE.md optimization for teams.

**Problem**: You enabled Claude Code Agent Teams and your first team is running. But the lead keeps doing work itself instead of delegating. Teammates edit the same files. You can't see what anyone is working on. The controls exist to solve all of this, but they're not obvious out of the box.

**Quick Win**: Press **Shift+Tab** after starting a team to cycle into delegate mode. The lead stops touching code and focuses entirely on coordination.

**Note**: This is a companion guide to the [Agent Teams overview](/blog/guide/agents/agent-teams). Start there if you haven't set up your first team yet.

## Display Modes

Agent Teams offers two display modes that change how you monitor and interact with teammates.

### In-Process Mode (Default)

All teammates run inside your main terminal. You navigate between them with keyboard shortcuts:

| Shortcut | Action |
| --- | --- |
| Shift+Up/Down | Select a teammate to view or message |
| Enter | View a teammate's full session |
| Escape | Interrupt a teammate's current turn |
| Ctrl+T | Toggle the task list |
| Shift+Tab | Cycle through modes (including delegate) |

This works in any terminal. No extra setup, no dependencies. You see one teammate's output at a time and switch between them as needed. For most workflows, in-process mode is enough.

### Split Pane Mode

Each teammate gets its own terminal pane. You see everyone's output simultaneously and click into any pane to interact directly. This is useful when you need to watch multiple teammates working through a complex problem at the same time.

Split pane mode requires tmux or iTerm2. Using `tmux -CC` in iTerm2 is the recommended entry point on macOS. **Important**: split-pane mode is NOT supported in VS Code's integrated terminal, Windows Terminal, or Ghostty. tmux has known compatibility limitations on certain operating systems and works best on macOS.

Configure your preferred mode via `settings.json`:

Three options:

- `"auto"` (default) uses split panes if you're already running inside tmux, otherwise falls back to in-process
- `"tmux"` enables split panes and auto-detects whether you're in tmux or iTerm2
- `"in-process"` forces everything into your main terminal

Override per session with the CLI flag.

## Delegate Mode

Without delegate mode, the lead sometimes starts implementing tasks itself instead of waiting for teammates to handle them. This defeats the purpose of having a team. You told it to coordinate, but it grabbed a wrench and started building.

Press **Shift+Tab** to cycle into delegate mode after starting a team. This restricts the lead to coordination-only tools: spawning teammates, messaging, shutting them down, and managing tasks. The lead can't touch code directly. It focuses entirely on orchestration.

Use delegate mode when you want the lead to act as a project manager rather than an individual contributor. This is especially important for larger teams where the lead's job is coordination, not implementation. In practice, enabling delegate mode on 4+ teammate sessions noticeably reduces wasted lead context and prevents the lead from competing with its own teammates for work.

If you notice the lead racing ahead while teammates are still working, you can also tell it directly: "Wait for your teammates to complete their tasks before proceeding." Sometimes a natural language nudge is all you need. But for consistent behavior across sessions, delegate mode enforces the constraint automatically.

## Plan Approval

For complex or risky tasks, require teammates to plan before they implement anything. The teammate works in read-only plan mode until the lead reviews and approves their approach.

The workflow:

1. Teammate receives the task and enters read-only mode
2. Teammate creates a plan and sends a plan approval request to the lead
3. Lead reviews the plan and either approves or rejects with feedback
4. If rejected, the teammate stays in plan mode, revises, and resubmits
5. Once approved, the teammate exits plan mode and begins implementation

The lead makes approval decisions autonomously. You influence its judgment through your initial prompt. Tell it "only approve plans that include test coverage" or "reject plans that modify the database schema without a migration." The lead applies those rules as a filter on every plan it receives.

Plan mode is particularly valuable when teammates are working on shared infrastructure, touching database schemas, or making changes that are expensive to reverse. The cost of planning is a fraction of the cost of rolling back a bad implementation across multiple files.

## Quality Gate Hooks

Agent Teams integrates with Claude Code's hook system for automated quality checks. Two hooks are built specifically for team workflows:

**TeammateIdle**: Runs when a teammate is about to go idle. Exit with code 2 to send feedback and keep the teammate working. Use this to automatically assign follow-up tasks or redirect a teammate that finished early. If a teammate completes its primary task while others are still working, a TeammateIdle hook can assign it review work or cleanup tasks without manual intervention.

**TaskCompleted**: Runs when a task is being marked complete. Exit with code 2 to prevent completion and send feedback. Use this to enforce quality gates: require tests to pass, lint checks to succeed, or specific acceptance criteria to be met before a task can close.

These hooks let you build structured quality gates without watching every teammate manually. A TaskCompleted hook that runs your test suite means no task closes with broken tests, regardless of which teammate worked on it. For a full walkthrough of the hook system and configuration, see the [hooks guide](/blog/tools/hooks/hooks-guide).

## Direct Communication with Teammates

Each teammate is a full, independent Claude Code session. You can message any teammate directly without going through the lead.

**In-process mode**: Use Shift+Up/Down to select a teammate, then type to send them a message. Press Enter to view a teammate's full session and see everything they've done. Press Escape to interrupt their current turn if they're heading in the wrong direction.

**Split-pane mode**: Click into a teammate's pane to interact with their session directly. Each pane behaves exactly like a standalone Claude Code session.

This is useful when you want to redirect a specific teammate, give additional context the lead doesn't have, or ask a targeted follow-up question. Sometimes the fastest path is talking to the worker directly instead of routing through a coordinator.

## Task Coordination

The shared task list coordinates all work across the team. The lead creates tasks and teammates work through them. Tasks have three states: **pending**, **in progress**, and **completed**. Tasks can depend on other tasks: a pending task with unresolved dependencies cannot be claimed until those dependencies are completed. This mirrors the dependency chain patterns from [team orchestration](/blog/guide/agents/team-orchestration).

The lead can assign tasks explicitly to specific teammates, or teammates can self-claim available work. After finishing a task, a teammate picks up the next unassigned, unblocked task on its own. This self-claiming behavior keeps the team moving without constant lead intervention.

Task claiming uses file locking to prevent race conditions where two teammates grab the same task simultaneously. The system manages task dependencies automatically: when a teammate completes a task that other tasks depend on, blocked tasks unblock without manual intervention. A teammate waiting on a dependency starts working the moment that dependency resolves.

For more on task coordination patterns, see [task distribution](/blog/guide/agents/task-distribution) and [todo workflows](/blog/guide/development/todo-workflows).

## Team Size and Model Mix

Claude decides the number of teammates based on the complexity of your task, or you can specify exactly what you want.

You can also mix models within a team. Run the lead on Opus for strategic coordination while teammates run on Sonnet for focused implementation. This balances cost with capability. The lead needs strong reasoning for task decomposition and plan approval. Teammates doing scoped implementation work often perform well on Sonnet at a fraction of the cost.

For even faster lead responses during coordination-heavy phases, combine agent teams with [fast mode](/blog/guide/performance/fast-mode).

## Token Cost Management

Agent Teams use significantly more tokens than a single session. Each teammate has its own context window, and token usage scales with the number of active teammates. When teammates run in plan mode before implementation, expect roughly 7x the tokens of a standard session for that phase.

**Where the tokens go:**

- Each teammate loads project context independently (CLAUDE.md, skills, project files)
- Communication adds cost: every message between agents consumes tokens in both the sender's and receiver's context
- Broadcasting multiplies cost by the number of teammates receiving the message
- The lead consumes tokens for coordination, task management, and result synthesis

**When the cost is worth it:**

- Research and review tasks where multiple perspectives catch issues a single pass would miss
- Debugging sessions where parallel hypothesis testing resolves issues faster than sequential guessing
- Large feature implementations where the time savings justify the token spend
- Architectural decisions where thorough evaluation prevents costly mistakes later

**When to keep costs down:**

- Use Sonnet for teammates doing focused implementation work and reserve Opus for the lead
- Prefer direct messages over broadcasts when possible
- Limit team size to what the task actually requires (3 teammates is often better than 6)
- Use [subagents](/blog/guide/agents/agent-fundamentals) or single sessions for routine tasks that don't need inter-agent communication
- Set clear scope for each teammate to prevent unnecessary exploration

**Rough guideline**: A 3-teammate team running for 30 minutes will use roughly 3-4x the tokens of a single session doing the same work sequentially. The trade-off is speed and coverage versus cost.

## CLAUDE.md Optimization for Teams

Every teammate loads your CLAUDE.md on startup with a fresh context window. The lead's previous discussion doesn't carry over, which is why CLAUDE.md quality matters so much for teams. If your CLAUDE.md is vague, each teammate wastes tokens re-exploring the codebase independently. Three teammates loading context simultaneously means three times the token cost if that context requires exploration instead of a quick read.

Three rules that make agent teams significantly more effective:

### Rule 1: Describe Your Module Boundaries

The clearer your module boundaries in CLAUDE.md, the smarter Claude splits work across teammates. Use a table to map directories to their purpose and ownership. When you tell Claude to "create a team and split by file ownership," it reads this structure and assigns explicit file lists to each teammate. Zero conflicts.

### Rule 2: Keep Project Context Short and Operational

Stack, entry point, test command, database. Short reads, not explorations. No teammate should need to ask the lead what the project is about or where files live. Every round of "what framework is this?" costs tokens in both the teammate's context and the lead's context when it answers.

### Rule 3: Define What "Verified" Means

When your CLAUDE.md lists how to check that things work, teammates use those signals to self-verify their own work before reporting back. Claude adapts verification per task. For a cleanup task, teammates might use grep to verify removals. For a feature, they run the test suite. Having project-wide gates gives the lead a vocabulary for "done" that it can apply automatically.

With clear rules in CLAUDE.md, teammates self-report exactly what they did without lead intervention. Clear rules in, clear reports out. For more on structuring your project files, see [CLAUDE.md mastery](/blog/guide/mechanics/claude-md-mastery).

## Next Steps

You now have the controls to run agent teams effectively. Start with delegate mode on your next team session and watch the difference it makes in lead behavior. Add a TaskCompleted hook to enforce your test suite. Write module boundaries in your CLAUDE.md and let Claude split work automatically.

For real-world prompts you can copy and adapt, see [Agent Teams Use Cases and Prompt Templates](/blog/guide/agents/agent-teams-use-cases). For troubleshooting common issues and current limitations, see [Agent Teams Best Practices](/blog/guide/agents/agent-teams-best-practices).

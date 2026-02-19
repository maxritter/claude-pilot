---
slug: "claude-sonnet-4-6"
title: "Claude Sonnet 4.6: Opus-Level Intelligence at Sonnet Pricing"
description: "Claude Sonnet 4.6 brings Opus-level intelligence to the $3/$15 price point. 70% preferred over Sonnet 4.5 in coding, 1M context, and major computer use gains."
date: "2026-02-17"
author: "Max Ritter"
tags: [Reference, Models]
readingTime: 12
keywords: "claude, sonnet, 4.6, model, coding, computer, use, pricing, benchmark, opus"
---

Models

# Claude Sonnet 4.6: Opus-Level Intelligence at Sonnet Pricing

Claude Sonnet 4.6 brings Opus-level intelligence to the $3/$15 price point. 70% preferred over Sonnet 4.5 in coding, 1M context, and major computer use gains.

Claude Sonnet 4.6 delivers Opus-level intelligence at a price point that makes it practical for far more tasks. In Claude Code testing, developers preferred it over Sonnet 4.5 approximately 70% of the time. It was even preferred to Opus 4.5 (the November 2025 frontier model) 59% of the time. That is a mid-tier model beating the previous generation's flagship in head-to-head coding evaluations.

Computer use took a major leap forward. The model hit 94% accuracy on insurance benchmarks, the highest of any model tested. And across enterprise document tasks, it matches Opus 4.6 on OfficeQA. Pricing stays at $3/$15 per million tokens.

## Specifications

| Spec | Details |
| --- | --- |
| **API ID** | `claude-sonnet-4-6` |
| **Release Date** | February 17, 2026 |
| **Context Window** | 200K tokens (standard), 1M tokens (beta) |
| **Max Output** | 16,384 tokens |
| **Pricing (Input)** | $3 per million tokens |
| **Pricing (Output)** | $15 per million tokens |
| **Status** | Active, current recommended Sonnet |

## What Improved

The improvements in Sonnet 4.6 are specific and practical. In long development sessions, the model reads context more carefully before modifying code, consolidates shared logic rather than duplicating it, and reduces the overengineering that made earlier models frustrating to work with.

**Better context comprehension.** The model reads and understands existing code more thoroughly before making changes. It picks up on project conventions, avoids redundant patterns, and produces edits that fit the surrounding codebase.

**Reduced overengineering.** When you ask for a simple fix, you get a simple fix. Sonnet 4.6 significantly cuts the hallucinations and false success claims that plagued earlier models. Fewer "I've refactored the entire module for you" responses when all you needed was a one-line change.

**Stronger on complex tasks.** Bug detection improved enough that teams can now run Sonnet-level reviewers in parallel where they previously needed Opus. Complex code fixes across large codebases, including multi-step refactors and cross-file dependency chains, complete more reliably.

**Improved design sensibility.** Frontend code generation produces more polished results. Better layouts, cleaner animations, and outputs that require fewer iterations to reach production quality. Early testers described the model as having "perfect design taste" for building frontend pages and data reports.

**Long-horizon planning.** On Vending-Bench Arena, a strategic simulation benchmark, Sonnet 4.6 outperformed Sonnet 4.5 by investing in capacity early and pivoting to profitability in the final stretch. This kind of multi-step strategic reasoning translates directly to better performance on complex, branched tasks.

## Benchmarks

Sonnet 4.6 consistently performs at or above what previously required Opus-class models:

| Metric | Result |
| --- | --- |
| **vs Sonnet 4.5 (Claude Code)** | 70% developer preference |
| **vs Opus 4.5 (Nov 2025)** | 59% developer preference |
| **Computer use (Pace insurance)** | 94% accuracy, highest model tested |
| **OfficeQA (Databricks)** | Matches Opus 4.6 |
| **Box heavy reasoning Q&A** | +15 percentage points over Sonnet 4.5 |
| **Prompt injection resistance** | Comparable to Opus 4.6 |

The Claude Code preference numbers are the most telling for developers. A model at $3/$15 being preferred over Opus 4.5 (which was $5/$25) in 59% of coding sessions rewrites the value equation for daily development work.

Third-party validation backs this up. Cursor's co-founder called it "a notable improvement over Sonnet 4.5 across the board, including long-horizon tasks and more difficult problems." GitHub reported "strong resolution rates and the kind of consistency developers need" on complex code fixes across large codebases. Cognition found it "meaningfully closed the gap with Opus on bug detection," letting them run more parallel reviewers without increasing cost.

## Computer Use

Computer use saw a major leap with Sonnet 4.6. The model navigates complex spreadsheets, fills multi-step web forms, and processes enterprise documents with substantially higher accuracy. Pace, an insurance technology company, reported 94% accuracy on their submission intake and first notice of loss workflows, making it the highest-performing model they have tested.

Prompt injection resistance also improved. Sonnet 4.6 performs similarly to Opus 4.6 on prompt injection benchmarks, meaning computer use sessions are harder for adversarial content to derail.

## Safety

Intelligence gains did not come at the cost of safety. Anthropic's safety evaluations concluded that Sonnet 4.6 is "broadly warm, honest, prosocial, and at times funny" in character, with "very strong safety behaviors and no signs of major concerns around high-stakes forms of misalignment."

Prompt injection resistance improved compared to Sonnet 4.5, performing on par with Opus 4.6. For teams deploying computer use or processing untrusted documents, this is a meaningful improvement in the model's ability to resist adversarial manipulation.

## Platform Features

Alongside the model, several platform features shipped or expanded:

- **Claude in Excel with MCP.** The Claude in Excel add-in now supports MCP connectors, integrating with data providers like S&P Global, LSEG, Daloopa, PitchBook, Moody's, and FactSet. Available on Pro, Max, Team, and Enterprise plans.
- **Free tier upgrades.** Free plan users now get file creation, connectors, skills, and context compaction. Previously Pro-only features are becoming baseline capabilities.
- **Default on Free and Pro.** Sonnet 4.6 replaces Sonnet 4.5 as the default model for Free and Pro plan users on claude.ai and Claude Cowork.
- **Expanded tool access.** Web search with dynamic filtering, code execution, memory, programmatic tool calling, and tool search are all generally available with the new model.

## Pricing

No price increase. Sonnet 4.6 costs the same as Sonnet 4.5:

| Tier | Cost |
| --- | --- |
| **Standard context** (up to 200K) | $3 input / $15 output per 1M tokens |
| **Pro plan** | $20/month |
| **Max plan** | $100/month |

If you have been running Sonnet 4.5 and managing your [usage and costs](/blog/guide/development/usage-optimization), the upgrade is pure upside at the same price.

## How to Use

Switch your default model with one command:

```p-4
/model claude-sonnet-4-6
```

For per-session overrides without changing your default, use the CLI flag. The model is available across all platforms: claude.ai (default for Free and Pro), Claude Cowork, the Messages API, Claude Code, Amazon Bedrock, and Google Vertex AI. The API model identifier is `claude-sonnet-4-6`.

## Sonnet 4.5 vs 4.6

| Feature | Sonnet 4.5 | Sonnet 4.6 |
| --- | --- | --- |
| **Context window** | 200K (standard), 1M (beta) | 200K (standard), 1M (beta) |
| **Coding preference** | Baseline | 70% preferred over 4.5 |
| **vs Opus 4.5 (Nov)** | Below Opus tier | 59% preferred |
| **Computer use** | Good | 94% insurance benchmark (highest) |
| **OfficeQA** | Not reported | Matches Opus 4.6 |
| **Heavy reasoning Q&A** | Baseline | +15pp (Box evaluation) |
| **Instruction following** | Good | Significantly reduced overengineering |
| **Prompt injection** | Baseline | Comparable to Opus 4.6 |
| **Design quality** | Good | "Perfect design taste" (Triple Whale) |
| **Standard pricing** | $3/$15 per 1M | $3/$15 per 1M (unchanged) |

The core improvements are in coding quality, computer use, and instruction following. Everything Sonnet 4.5 did well (speed, cost efficiency, agent performance) carries forward with a significant intelligence upgrade on top.

## Model Selection

For [model selection](/blog/models/model-selection), the calculus is straightforward. Use Sonnet 4.6 as your daily driver for fast iteration and the 90%+ of coding tasks where speed and cost matter. Use [Opus 4.6](/blog/models/claude-opus-4-6) for the deepest reasoning, codebase refactoring, multi-agent coordination, and precision-critical work. Opus 4.6 remains the top performer on Terminal-Bench 2.0 and Humanity's Last Exam.

## Related

- [All Claude Models](/blog/models) for the complete model timeline
- [Opus 4.6](/blog/models/claude-opus-4-6) for the top-tier option in the same generation
- [Sonnet 4.5](/blog/models/claude-sonnet-4-5) for the previous Sonnet release
- [Model selection guide](/blog/models/model-selection) for strategic model switching
- [Usage optimization](/blog/guide/development/usage-optimization) for managing costs across models

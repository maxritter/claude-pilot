---
slug: "model-selection"
title: "Claude Code Models: Choose the Right AI for Every Task"
description: "Master tactical model selection in Claude Code. Learn when to use Sonnet vs Opus for optimal performance, cost efficiency, and speed."
date: "2025-08-23"
author: "Max Ritter"
tags: [Reference, Models]
readingTime: 8
keywords: "ai, choose, claude, code, every, model, models, right, selection, task"
---

# Claude Code Models: Choose the Right AI for Every Task

Master tactical model selection in Claude Code. Learn when to use Sonnet vs Opus for optimal performance, cost efficiency, and speed.

**Problem**: Developers waste money using Opus for everything, or struggle with Haiku when they need more power. Tactical model switching can [optimize your usage costs](/blog/guide/development/usage-optimization) by 60-80%.

**Quick Win**: Set Sonnet as your default model right now:

```p-4
claude --model sonnet
```

This saves 80% on costs while maintaining excellent performance for 90% of development tasks.

## [Model Aliases](#model-aliases)

Claude Code provides model aliases so you don't need to remember exact version numbers. These are the shortcuts you'll use daily:

| Alias | Behavior |
| --- | --- |
| **`default`** | Recommended model for your account type. Max users get auto-fallback from Opus to Sonnet at limits |
| **`sonnet`** | Latest Sonnet model (currently Sonnet 4.5) for daily coding tasks |
| **`opus`** | Opus model (currently Opus 4.6) for complex reasoning |
| **`haiku`** | Fast and efficient Haiku model for simple tasks |
| **`sonnet[1m]`** | Sonnet with a 1 million token context window for long sessions (Console/API users) |
| **`opusplan`** | Uses Opus during plan mode, then switches to Sonnet for execution automatically |

The `default` alias adapts to your account type. For certain Max users, Claude Code automatically falls back from Opus to Sonnet when you hit a usage threshold, keeping you productive without manual switching.

The `sonnet[1m]` alias is available to Console and API users and unlocks a 1 million token context window. This is valuable for extended sessions where you'd otherwise hit [context compaction limits](/blog/guide/mechanics/context-buffer-management). Note that extended context models have different pricing.

For Console/API users, the `[1m]` suffix can also be added to full model names:

```p-4
/model anthropic.claude-sonnet-4-5-20250929-v1:0[1m]
```

## [The Smart Model Strategy](#the-smart-model-strategy)

Most developers make a costly mistake: using one model for everything. Claude Code offers multiple models, each optimized for different scenarios. Strategic switching can reduce your usage costs by 80% while improving performance.

### [Sonnet: Your Daily Driver](#sonnet-your-daily-driver)

**Best for**: 90% of development work

```p-4
# Start Claude Code with Sonnet (usually the default)
claude --model sonnet
```

Perfect for:

- Feature implementation and bug fixes
- Code reviews and refactoring
- API integration and database work
- Writing tests and documentation

**Why Sonnet wins**: 90% of Opus capability at 2x the speed, rarely hits usage limits, ideal for pair programming workflow.

### [Opus: The Heavy Hitter](#opus-the-heavy-hitter)

**When to upgrade**: Complex architectural decisions only

```p-4
# Start with Opus for deep analysis sessions
claude --model opus
```

Use Opus for:

- Large-scale refactoring across multiple systems
- Complex debugging with intricate dependencies
- Architectural decisions requiring deep reasoning
- Advanced security reviews

**Cost reality**: 5x more expensive than Sonnet, but justified for tasks requiring maximum reasoning power.

### [Haiku: The Speed Demon](#haiku-the-speed-demon)

**When to downgrade**: Simple, repetitive tasks

```p-4
# Fast and cheap for basic operations
claude --model haiku
```

Perfect for:

- Simple file reads and formatting
- Basic syntax validation
- Quick status checks
- Text transformations

**Warning**: Don't use Haiku for actual development. It struggles with complex logic and multi-file projects.

### [Opusplan: The Best of Both Worlds](#opusplan-the-best-of-both-worlds)

**When to use**: Complex tasks where you want Opus reasoning without Opus costs for everything

```p-4
# Hybrid mode: Opus plans, Sonnet executes
claude --model opusplan
```

How it works:

- **In plan mode**: Uses Opus for complex reasoning and architecture decisions
- **In execution mode**: Automatically switches to Sonnet for code generation and implementation

This gives you Opus-quality planning with Sonnet-speed execution. You get the deep architectural reasoning of Opus where it matters most (the planning phase), then the fast, cost-efficient execution of Sonnet for the actual code changes.

`opusplan` is an excellent choice for refactoring sessions, feature planning, and any workflow where you use [planning mode](/blog/guide/mechanics/planning-modes) regularly. It is also a strong [cost optimization strategy](/blog/guide/development/usage-optimization) since you only pay Opus rates during the planning phase.

## [Tactical Model Switching](#tactical-model-switching)

### [During Development Sessions](#during-development-sessions)

```p-4
# Start your session with Sonnet
claude --model sonnet

# Mid-session: switch to Opus for complex refactoring
/model opus

# Back to Sonnet for regular work
/model sonnet

# Drop to Haiku for simple tasks
/model haiku
```

### [Cost Optimization Pattern](#cost-optimization-pattern)

1. **Default**: Sonnet for all standard development
2. **Hybrid**: Use `opusplan` for sessions that mix planning and implementation
3. **Escalate**: Switch to full Opus only when Sonnet struggles on execution tasks
4. **Delegate**: Use Haiku for simple file operations
5. **Monitor**: Track usage to optimize model selection

This approach can reduce costs by 60-80% compared to using Opus for everything.

## [Model Selection by Task Type](#model-selection-by-task-type)

### [Code Analysis Speed Rankings](#code-analysis-speed-rankings)

1. **Haiku**: Instant but shallow analysis
2. **Sonnet**: Fast with excellent depth
3. **Opus**: Slower but deepest analysis

### [Reasoning Quality Rankings](#reasoning-quality-rankings)

1. **Opus**: Superior for complex multi-step problems
2. **Sonnet**: Excellent for most development scenarios
3. **Haiku**: Basic reasoning only

### [Cost Efficiency Rankings](#cost-efficiency-rankings)

1. **Haiku**: Cheapest per task (limited capability)
2. **Sonnet**: Best performance per dollar
3. **Opus**: Premium pricing for premium capability

## [Model Configuration](#model-configuration)

**If you use Pilot Shell:** The easiest way to configure models is through the [Pilot Shell Console](http://localhost:41777/#/settings). You can set a different model for each `/spec` phase, slash command, and sub-agent, then restart Pilot to apply. Pilot injects your preferences into all the right places automatically — no manual file editing needed.

For users without Pilot, or for temporary changes, Claude Code gives you multiple ways to set your model, with a clear priority chain. Higher-priority settings override lower ones:

1. **During session** - `/model <alias|name>` switches models mid-session (highest priority)
2. **At startup** - `claude --model <alias|name>` sets the model for that session
3. **Environment variable** - `ANTHROPIC_MODEL=<alias|name>` persists across sessions
4. **Settings file** - The `model` field in [settings.json](/blog/guide/configuration-basics) for permanent configuration (lowest priority)

For permanent model configuration, add the `model` field to your settings file:

```p-4
// ~/.claude/settings.json
{
  "permissions": {},
  "model": "sonnet"
}
```

This eliminates the need to pass `--model` every time you start Claude Code.

### [Controlling Which Models Aliases Map To](#controlling-which-models-aliases-map-to)

If you need to override which actual model an alias points to (for example, to pin a specific version or use a Bedrock/Vertex deployment), use these environment variables:

| Environment Variable | Controls |
| --- | --- |
| `ANTHROPIC_DEFAULT_OPUS_MODEL` | Model used for `opus`, and for `opusplan` during plan mode |
| `ANTHROPIC_DEFAULT_SONNET_MODEL` | Model used for `sonnet`, and for `opusplan` during execution |
| `ANTHROPIC_DEFAULT_HAIKU_MODEL` | Model used for `haiku` and background functionality |
| `CLAUDE_CODE_SUBAGENT_MODEL` | Model used for sub-agents (overrides the default sub-agent model) |

The deprecated `ANTHROPIC_SMALL_FAST_MODEL` variable has been replaced by `ANTHROPIC_DEFAULT_HAIKU_MODEL`.

These are especially useful for Bedrock, Foundry, and Vertex users who need to specify inference profile ARNs, deployment names, or version names instead of standard Anthropic model IDs.

### [Checking Your Current Model](#checking-your-current-model)

You can see which model you're currently using in two ways:

- Run `/status` to display your current model and account information
- Configure a StatusLine to show the model persistently in your terminal

## [Prompt Caching Configuration](#prompt-caching-configuration)

Claude Code automatically uses prompt caching to optimize performance and reduce costs. If you need to disable it (for debugging, benchmarking, or specific API configurations), use these environment variables:

| Environment Variable | Effect |
| --- | --- |
| `DISABLE_PROMPT_CACHING` | Disables caching for all models (overrides per-model) |
| `DISABLE_PROMPT_CACHING_HAIKU` | Disables caching for Haiku models only |
| `DISABLE_PROMPT_CACHING_SONNET` | Disables caching for Sonnet models only |
| `DISABLE_PROMPT_CACHING_OPUS` | Disables caching for Opus models only |

Set any of these to `1` to disable. The global `DISABLE_PROMPT_CACHING` takes precedence over per-model settings. Disabling prompt caching increases costs and latency, so only do this when you have a specific reason.

## [Common Model Selection Mistakes](#common-model-selection-mistakes)

**Mistake 1**: Using Opus for everything

- **Problem**: 5x higher costs with slower responses
- **Solution**: Default to Sonnet, escalate selectively

**Mistake 2**: Staying on Haiku too long

- **Problem**: Poor code quality, missed issues
- **Solution**: Upgrade to Sonnet for any real development

**Mistake 3**: Not switching models mid-session

- **Problem**: Using wrong model for current task
- **Solution**: Use `/model opus` or `/model sonnet` to switch instantly

## [Quick Reference](#quick-reference)

| Task Type | Recommended Model | Why |
| --- | --- | --- |
| Daily coding | Sonnet | Best balance of speed and capability |
| Plan + implement | opusplan | Opus reasoning for plans, Sonnet for code |
| Complex architecture | Opus | Maximum reasoning depth |
| Simple file ops | Haiku | Fast and cheap |
| Long sessions | sonnet[1m] | 1M token window avoids compaction |
| Debugging | Start Sonnet, escalate to Opus if stuck | Progressive escalation |

**For beginners**: Start with Sonnet to learn workflows.

**For daily development**: Sonnet as default with Opus for complex debugging.

**For budget optimization**: Strategic switching based on task complexity.

**For learning**: Check our [configuration guide](/blog/guide/configuration-basics) to set up model defaults.

Master model selection and you'll code faster while spending less. Most tasks need Sonnet's balanced power, not Opus's premium capabilities.

**Next Action**: Set up your optimal model configuration with our [performance optimization guide](/blog/guide/performance/speed-optimization), then learn advanced [context management](/blog/guide/performance/context-preservation) techniques.

For detailed specs on every Claude model Anthropic has released, see the [complete model timeline](/blog/models).

**Related Guides**:

- [Deep Thinking Techniques](/blog/guide/performance/deep-thinking-techniques) - When to use extended thinking with Opus
- [Efficiency Patterns](/blog/guide/performance/efficiency-patterns) - Build frameworks for consistent output
- [Usage Optimization](/blog/guide/development/usage-optimization) - Track and reduce your costs

Last updated on

[Previous

Claude Models](/blog/models)[Next

Claude Opus 4.5 Guide](/blog/models/claude-opus-4-5-guide)

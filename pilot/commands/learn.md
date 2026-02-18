---
description: Extract reusable knowledge into skills - online learning system
model: sonnet
---

# /learn - Online Learning System

**Extract reusable knowledge from this session into skills.** Evaluates what was learned, checks for existing skills, and creates new ones when valuable patterns are discovered.

---

## TABLE OF CONTENTS

| Phase       | Description                                            | Steps   |
| ----------- | ------------------------------------------------------ | ------- |
| **Phase 0** | Reference: triggers, quality criteria, skill structure | 0.1–0.4 |
| **Phase 1** | Evaluate: assess if knowledge is worth extracting      | 1.1     |
| **Phase 2** | Check Existing: search for related skills              | 2.1     |
| **Phase 3** | Create Skill: write the skill file                     | 3.1–3.2 |
| **Phase 4** | Quality Gates: final checklist before saving           | 4.1     |

**Quick Step Reference:**

- 0.1 Triggers, 0.2 Quality criteria, 0.3 What NOT to extract, 0.4 Skill structure
- 1.1 Self-evaluation questions
- 2.1 Search existing skills
- 3.1 Choose location, 3.2 Write SKILL.md
- 4.1 Final checklist

---

## PHASE 0: REFERENCE

### Step 0.1: Triggers

Invoke `/learn` after ANY task involving:

| Trigger                      | Example                                                          |
| ---------------------------- | ---------------------------------------------------------------- |
| **Non-obvious debugging**    | Spent 10+ minutes investigating; solution wasn't in docs         |
| **Misleading errors**        | Error message pointed wrong direction; found real cause          |
| **Workarounds**              | Found limitation and creative solution                           |
| **Tool integration**         | Figured out how to use tool/API in undocumented way              |
| **Trial-and-error**          | Tried multiple approaches before finding what worked             |
| **Repeatable workflow**      | Multi-step task that will recur; worth standardizing             |
| **External service queries** | Fetched data from Jira, GitHub, Confluence, or other APIs        |
| **User-facing automation**   | Built something user will ask for again (reports, status checks) |

### Step 0.2: Quality Criteria

Skills must be:

- **Reusable**: Will help with future tasks (not just this instance)
- **Non-trivial**: Required discovery, OR is a valuable workflow pattern
- **Verified**: Solution actually worked, not theoretical

### Step 0.3: What NOT to Extract

- Single-step tasks with no workflow value
- One-off fixes unlikely to recur
- Knowledge easily found in official docs

### Step 0.4: Skill Structure

**Location:** `.claude/skills/[skill-name]/SKILL.md`

**Template:**

```markdown
---
name: descriptive-kebab-case-name
description: |
  [CRITICAL: This determines when the skill triggers. Include:]
  - What the skill does
  - Specific trigger conditions (exact error messages, symptoms)
  - When to use it (contexts, scenarios)
author: Claude Code
version: 1.0.0
---

# Skill Name

## Problem

[Clear description of the problem]

## Context / Trigger Conditions

[When to use - exact error messages, symptoms, scenarios]

## Solution

[Step-by-step solution]

## Verification

[How to verify it worked]

## Example

[Concrete example]

## References

[Links to documentation]
```

<details>
<summary>Writing Effective Descriptions</summary>

The description field is CRITICAL for skill discovery:

**Good:**

```yaml
description: |
  Fix for "ENOENT: no such file or directory" errors in npm monorepos.
  Use when: (1) npm run fails with ENOENT, (2) paths work in root but
  not in packages, (3) symlinked dependencies cause failures.
```

**Bad:**

```yaml
description: Helps with npm problems in monorepos.
```

</details>

**Guidelines:**

- **Concise** - Claude is smart; only add what it doesn't know
- **Under 500 lines** - Move large docs to `references/`
- **Examples over explanations** - Show, don't tell

---

## PHASE 1: EVALUATE

### Step 1.1: Self-Evaluation Questions

Ask yourself:

1. "What did I just learn that wasn't obvious before starting?"
2. "Would future-me benefit from having this documented?"
3. "Was the solution non-obvious from documentation alone?"
4. "Is this a multi-step workflow I'd repeat on similar tasks?"
5. "Did I query an external service the user will ask about again?"

**If NO to all → Skip extraction, nothing to learn.**

**Note:** External service queries (Jira tickets, GitHub PRs, Confluence pages) are almost always worth extracting - users frequently repeat these requests.

---

## PHASE 2: CHECK EXISTING

### Step 2.1: Search for Related Skills

Before creating, search for related skills:

```bash
ls .claude/skills/ 2>/dev/null
rg -i "keyword" .claude/skills/ 2>/dev/null
ls ~/.claude/pilot/skills/ 2>/dev/null
rg -i "keyword" ~/.claude/pilot/skills/ 2>/dev/null
```

| Found                | Action                           |
| -------------------- | -------------------------------- |
| Nothing related      | Create new skill                 |
| Same trigger and fix | Update existing (bump version)   |
| Partial overlap      | Update existing with new variant |

---

## PHASE 3: CREATE SKILL

### Step 3.1: Choose Location

**Project skills**: `.claude/skills/[skill-name]/SKILL.md`

### Step 3.2: Write SKILL.md

Use the template from Step 0.4. Ensure the description field contains specific trigger conditions.

---

## PHASE 4: QUALITY GATES

### Step 4.1: Final Checklist

Before finalizing:

- [ ] Description contains specific trigger conditions
- [ ] Solution verified to work
- [ ] Content specific enough to be actionable
- [ ] Content general enough to be reusable
- [ ] No sensitive information

---

## EXAMPLE

**Scenario**: Discovered LSP `findReferences` can find dead code by checking if functions have only 1 reference (their definition) or only test references.

**Skill Created**: `.claude/skills/lsp-dead-code-finder/SKILL.md`

```markdown
---
name: lsp-dead-code-finder
description: |
  Find dead/unused code using LSP findReferences. Use when: (1) user asks
  to find dead code, (2) cleaning up codebase, (3) refactoring. Key insight:
  function with only 1 reference (definition) or only test refs is dead code.
---

# LSP Dead Code Finder

...
```

---

## REMEMBER

**Continuous improvement.** Every valuable discovery should benefit future sessions.
Evaluate after significant work. Extract selectively. Create carefully.

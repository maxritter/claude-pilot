## Online Learning System

**Rule:** Evaluate sessions for extractable knowledge. Only act when there's something valuable.

### Context Warning Response (90%+)

When the context monitor shows the `/learn check` reminder at 90%+ context:

1. **Quickly evaluate:** Does this session have a non-obvious solution OR repeatable workflow?
2. **If YES** → Invoke `Skill(learn)` to extract the knowledge before handoff
3. **If NO** → Continue with normal handoff, no mention of learning needed

**Do NOT say "nothing to learn" or similar.** Just proceed silently if there's nothing to extract.

### Triggers for /learn

| Trigger | Example |
|---------|---------|
| **Non-obvious debugging** | Spent 10+ minutes investigating; solution wasn't in docs |
| **Misleading errors** | Error message pointed wrong direction; found real cause |
| **Workarounds** | Discovered limitation and found creative solution |
| **Tool integration** | Figured out how to use tool/API in undocumented way |
| **Trial-and-error** | Tried multiple approaches before finding what worked |
| **Repeatable workflow** | Multi-step task that will recur; worth standardizing |

### What NOT to Extract (Stay Silent)

- Simple tasks (reading files, running commands, answering questions)
- Single-step fixes with no workflow value
- One-off fixes unlikely to recur
- Knowledge easily found in official docs
- Unverified or theoretical solutions

### Quick Decision Tree

```
Hook fires → Was there non-obvious discovery OR multi-step reusable workflow?
├─ YES → Invoke Skill(learn)
└─ NO  → Output nothing, let stop proceed
```

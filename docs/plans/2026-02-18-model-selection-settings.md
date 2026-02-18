# Model Selection Settings Implementation Plan

Created: 2026-02-18
Status: COMPLETE
Approved: Yes
Iterations: 0
Worktree: Yes

> **Status Lifecycle:** PENDING → COMPLETE → VERIFIED
> **Iterations:** Tracks implement→verify cycles (incremented by verify phase)
>
> - PENDING: Initial state, awaiting implementation
> - COMPLETE: All tasks implemented
> - VERIFIED: All checks passed
>
> **Approval Gate:** Implementation CANNOT proceed until `Approved: Yes`
> **Worktree:** Set at plan creation (from dispatcher). `Yes` uses git worktree isolation; `No` works directly on current branch (default)

## Summary

**Goal:** Add granular, per-component model selection to Claude Pilot — users can configure the model for the main session, each command, and each agent via a Console Settings page. Preferences persist in `~/.pilot/config.json` and the launcher injects them into installed files before Claude launches.

**Architecture:** Config file (`~/.pilot/config.json`) → Console Settings UI (read/write via API) → Launcher injection on startup (modifies `~/.claude/pilot/settings.json`, commands, agents in-place) → Claude Code reads modified files.

**Tech Stack:** Python (launcher), TypeScript/Bun (Console API), React/DaisyUI (Console UI)

## Scope

### In Scope

- Model preference storage in `~/.pilot/config.json`
- Console Settings page with per-component model dropdowns
- Console API endpoints (GET/PUT) for reading/writing config
- Launcher startup injection into installed plugin files
- Fix hardcoded 200K context window assumptions
- Update ModelRoutingInfo in Usage view to show dynamic config
- Restart notification in Console UI after settings change
- 1M context availability warning

### Out of Scope

- Auto-detection of user's Claude subscription tier
- Live model switching without restart
- Changes to the installer — it installs defaults; launcher handles user overrides

## Prerequisites

- Console worker running (`localhost:41777`)
- Pilot installed with plugin at `~/.claude/pilot/`

## Context for Implementer

- **Patterns to follow:**
  - Route handler pattern: extend `BaseRouteHandler` (see `console/src/services/worker/http/BaseRouteHandler.ts`)
  - View pattern: see any view in `console/src/ui/viewer/views/` (e.g., `Usage/index.tsx`)
  - Route registration: `worker-service.ts` imports and registers route handlers
  - Sidebar nav: add entry to `navItems` array in `SidebarNav.tsx`
  - Config reading: `~/.pilot/config.json` is already read by the launcher (`launcher/config.py`, `launcher/updater.py`)
- **Conventions:**
  - Python: `from __future__ import annotations`, type hints, pytest markers
  - TypeScript: ESM imports, `.js` extensions in imports
  - React: functional components, DaisyUI classes
- **Key files:**
  - `~/.pilot/config.json` — user preferences (existing, add model fields)
  - `pilot/settings.json` → installed to `~/.claude/pilot/settings.json` — Claude Code reads `"model"` field
  - `pilot/commands/*.md` — YAML front matter has `model:` field
  - `pilot/agents/*.md` — YAML front matter has `model:` field
  - `launcher/wrapper.py` — startup flow, `start()` method
  - `launcher/config.py` — `MAX_CONTEXT_TOKENS = 200_000` (hardcoded)
  - `pilot/hooks/context_monitor.py` — hardcoded `200000` for context calculations
  - `launcher/helper.py` — `MAX_CONTEXT_TOKENS` fallback for context percentage
- **Gotchas:**
  - Command YAML headers use `---` delimiters — must preserve all other fields when updating `model:`
  - Agent model field only accepts `sonnet` or `opus` (no `[1m]` variants)
  - `context_window_size` is provided by Claude Code via statusline JSON — the hardcoded values are only fallbacks
  - The `~/.claude/pilot/` directory is the installed plugin copy, not the source `pilot/` directory

## Runtime Environment

- **Console start:** Managed by Pilot launcher (auto-started)
- **Port:** 41777
- **Health check:** `curl http://localhost:41777/api/health`

## Model Options

| Context | Main Session / Commands | Agents (subagents) |
|---------|------------------------|-------------------|
| **Standard** | `sonnet`, `opus` | `sonnet`, `opus` |
| **1M** | `sonnet[1m]`, `opus[1m]` | ❌ Not available |

Display names: "Sonnet 4.6", "Sonnet 4.6 1M", "Opus 4.6", "Opus 4.6 1M"

## Default Config (matches current routing, without 1M)

```json
{
  "model": "sonnet",
  "commands": {
    "spec": "sonnet",
    "spec-plan": "opus",
    "spec-implement": "sonnet",
    "spec-verify": "opus",
    "vault": "sonnet",
    "sync": "sonnet",
    "learn": "sonnet"
  },
  "agents": {
    "plan-challenger": "sonnet",
    "plan-verifier": "sonnet",
    "spec-reviewer-compliance": "sonnet",
    "spec-reviewer-quality": "opus"
  }
}
```

## Progress Tracking

**MANDATORY: Update this checklist as tasks complete. Change `[ ]` to `[x]`.**

- [x] Task 1: Config schema and Python utilities
- [x] Task 2: Console API endpoints for settings
- [x] Task 3: Launcher settings injection on startup
- [x] Task 4: Fix hardcoded 200K context window
- [x] Task 5: Console Settings view (React UI)
- [x] Task 6: Update ModelRoutingInfo in Usage view
- [x] Task 7: Update README and website model routing docs
- [x] Task 8: Integration testing and verification

**Total Tasks:** 8 | **Completed:** 8 | **Remaining:** 0

## Implementation Tasks

### Task 1: Config Schema and Python Utilities

**Objective:** Define the model config schema, defaults, and read/write utilities in the launcher package.

**Dependencies:** None

**Files:**

- Create: `launcher/model_config.py`
- Modify: `launcher/config.py` (add model-related constants)
- Test: `launcher/tests/unit/test_model_config.py`

**Key Decisions / Notes:**

- Config path: `~/.pilot/config.json` (already exists, add `model`, `commands`, `agents` keys)
- Read existing config, merge with defaults for any missing keys (forward-compatible)
- Validate model values: main/commands accept `sonnet`, `sonnet[1m]`, `opus`, `opus[1m]`; agents accept only `sonnet`, `opus`
- Function: `read_model_config() -> ModelConfig` — returns dataclass with all model settings
- Function: `write_model_config(config: ModelConfig) -> None` — writes to config.json preserving other keys
- Function: `get_context_tokens_for_model(model: str) -> int` — returns 200_000 or 1_000_000
- Constants: `MODEL_CHOICES_FULL = ["sonnet", "sonnet[1m]", "opus", "opus[1m]"]`, `MODEL_CHOICES_AGENT = ["sonnet", "opus"]`
- Constants: `DEFAULT_MODEL_CONFIG` dict with defaults shown above
- Constants: `MODEL_DISPLAY_NAMES` mapping model IDs to display names

**Definition of Done:**

- [ ] `read_model_config()` reads `~/.pilot/config.json` and returns defaults for missing keys
- [ ] `write_model_config()` preserves existing non-model keys in config.json
- [ ] `write_model_config()` writes atomically (write to temp file then `os.rename`) to prevent partial reads
- [ ] `get_context_tokens_for_model()` returns correct token count for all 4 model IDs
- [ ] Invalid model values raise `ValueError` with descriptive message
- [ ] All tests pass

**Verify:**

- `uv run pytest launcher/tests/unit/test_model_config.py -q`

---

### Task 2: Console API Endpoints for Settings

**Objective:** Add REST API endpoints so the Console UI can read and write model preferences.

**Dependencies:** Task 1 (uses same config.json schema)

**Files:**

- Create: `console/src/services/worker/http/routes/SettingsRoutes.ts`
- Modify: `console/src/services/worker-service.ts` (register new route handler)
- Test: `console/tests/settings-routes.test.ts`

**Key Decisions / Notes:**

- Follow `BaseRouteHandler` pattern from `console/src/services/worker/http/BaseRouteHandler.ts`
- `GET /api/settings` — reads `~/.pilot/config.json`, returns model/commands/agents with defaults merged
- `PUT /api/settings` — accepts partial body; missing keys are left unchanged in config.json (merge, not replace). E.g., `PUT {"model": "opus"}` only updates the main model, leaving commands/agents untouched
- Validation: reject invalid model values (not in allowed list)
- Config file path: `path.join(homedir(), '.pilot', 'config.json')`
- Use atomic write (write to temp file, then rename) to prevent partial reads
- Import and register in `worker-service.ts` following existing pattern (e.g., `VaultRoutes`)

**Definition of Done:**

- [ ] `GET /api/settings` returns model config with defaults for missing keys
- [ ] `PUT /api/settings` validates model values and merges into config.json (partial update supported)
- [ ] `PUT` with only `{"model": "opus"}` does not overwrite existing commands/agents keys
- [ ] Invalid model values return 400 with descriptive error
- [ ] Non-model keys in config.json are preserved on write
- [ ] PUT uses atomic write (temp file + rename) when persisting config.json
- [ ] Route handler registered in worker-service.ts

**Verify:**

- `curl http://localhost:41777/api/settings` returns JSON with model, commands, agents
- `curl -X PUT http://localhost:41777/api/settings -H 'Content-Type: application/json' -d '{"model":"opus"}'` updates config

---

### Task 3: Launcher Settings Injection on Startup

**Objective:** On startup, the launcher reads `~/.pilot/config.json` and injects model preferences into the installed plugin files before launching Claude.

**Dependencies:** Task 1

**Files:**

- Create: `launcher/settings_injector.py`
- Modify: `launcher/wrapper.py` (call injector in `start()` before launching Claude)
- Test: `launcher/tests/unit/test_settings_injector.py`

**Key Decisions / Notes:**

- Injection happens in `wrapper.py:start()`, after license check but before `_start_claude()`
- Inject into `~/.claude/pilot/settings.json`: update `"model"` field to config's main model
- Inject into `~/.claude/pilot/commands/*.md`: update `model:` in YAML front matter for each command
- Inject into `~/.claude/pilot/agents/*.md`: update `model:` in YAML front matter for each agent
- YAML front matter parsing: extract content between first pair of `---` delimiters (true front matter scope), then replace `model:` line within that scope only. Don't use a YAML library — the files have markdown after the front matter
- Pattern within front matter: `re.sub(r'^(model:\s*).+$', r'\1' + new_model, front_matter, count=1, flags=re.MULTILINE)`. If no `model:` line found in front matter, insert `model: <value>` after the first `---` line and log a warning
- For command/agent files with no corresponding key in config, apply the global `model` default (not the source file's model value). This ensures new commands added in future Pilot versions inherit the user's global preference
- Use atomic writes for plugin files (write to temp file, then `os.rename`) to prevent corruption on interrupted writes or concurrent sessions
- Injection runs on every `pilot` startup, so after a Pilot upgrade (which reinstalls source files), the next `pilot` launch re-applies the user's model preferences. No gap for users who always launch via `pilot`
- Per-component injection: if `model` key present → inject settings.json; if `commands` key present → inject command files; if `agents` key present → inject agent files. Missing component keys → that component's files stay unchanged (don't suppress all injection globally)
- For partial `commands`/`agents` dicts: only inject files whose names appear as keys. Missing per-command/per-agent keys → that file stays unchanged
- If `~/.claude/pilot/commands/` or `~/.claude/pilot/agents/` directories are missing, or a specific file doesn't exist, log debug warning and continue — never crash
- On first run, injection replaces any `[1m]` models currently in source files with the non-1M defaults. This is intentional — users must explicitly select 1M models via the Settings UI
- Log injection actions at debug level

**Definition of Done:**

- [ ] `inject_model_settings()` updates settings.json model field when `model` key present
- [ ] `inject_model_settings()` updates each command's YAML model field when that command key is in `commands`
- [ ] `inject_model_settings()` updates each agent's YAML model field when that agent key is in `agents`
- [ ] Missing `model` key → settings.json not updated; missing `commands` key → command files not updated; missing per-command key → that command file not updated (per-component granularity)
- [ ] Missing installed plugin files → injection skipped for those files, no exception raised
- [ ] Command/agent files with no config key → global `model` default applied
- [ ] Front matter without `model:` line → line inserted after first `---`, warning logged
- [ ] Injection uses atomic writes (temp file + rename) for all plugin files
- [ ] Injection preserves all non-model content in files
- [ ] Called in wrapper.py start() before Claude launches

**Verify:**

- `uv run pytest launcher/tests/unit/test_settings_injector.py -q`
- Manual: change model in `~/.pilot/config.json`, run `pilot`, check `~/.claude/pilot/settings.json` has updated model

---

### Task 4: Fix Hardcoded 200K Context Window

**Objective:** Replace hardcoded 200K context window assumptions with dynamic values based on the user's model selection.

**Dependencies:** Task 1

**Files:**

- Modify: `launcher/config.py` (make `MAX_CONTEXT_TOKENS` a function or remove constant)
- Modify: `launcher/helper.py` (use dynamic context tokens)
- Modify: `pilot/hooks/context_monitor.py` (replace hardcoded 200000)
- Modify: `launcher/tests/unit/test_context_monitor.py` (update test expectations)
- Modify: `launcher/tests/unit/statusline/test_formatter.py` (update test values if affected)

**Key Decisions / Notes:**

- `launcher/config.py`: Add `get_max_context_tokens() -> int` that reads model from config and returns 200_000 or 1_000_000. Keep `MAX_CONTEXT_TOKENS = 200_000` as default/fallback constant.
- `launcher/config.py`: Make `COMPACTION_THRESHOLD_PCT` dynamic. Currently hardcoded at 83.5% (calibrated for 200K: (200K - 33K buffer) / 200K = 83.5%). With 1M context, the same 33K buffer means compaction fires at 96.7%. Formula: `(window_size - 33000) / window_size * 100`. Add `get_compaction_threshold_pct() -> float` that computes this based on current model's context window.
- Update all consumers of `COMPACTION_THRESHOLD_PCT`: `pilot/hooks/_util.py`, `context_monitor.py` (via `_util.py`), and the statusline widget that renders the grayed-out buffer section
- `launcher/helper.py:123`: Change `actual_tokens / MAX_CONTEXT_TOKENS` to `actual_tokens / get_max_context_tokens()`
- `pilot/hooks/context_monitor.py:134`: Change `tokens / 200000` to use `_get_max_context_tokens()` from `_util.py`
- `pilot/hooks/context_monitor.py:153`: Change `statusline_pct / 100 * 200000` similarly
- **Critical:** Hooks run as standalone scripts and CANNOT import from `launcher`. Add `_read_model_from_config() -> str` and `_get_max_context_tokens() -> int` to `pilot/hooks/_util.py`. These read `~/.pilot/config.json` directly (intentional duplication from `launcher/model_config.py` to avoid import dependencies). Map model ID → token count: `[1m]` suffix → 1_000_000, else → 200_000
- Add a test that verifies `context_monitor.py` can be executed as a standalone script without ImportError
- Note: The statusline receives `context_window_size` from Claude Code itself — the hardcoded values are only used in fallback paths when the statusline cache isn't available. So this is a correctness fix for edge cases.

**Definition of Done:**

- [ ] No hardcoded `200000` or `200_000` in context calculation paths
- [ ] `COMPACTION_THRESHOLD_PCT` is dynamic: 83.5% for 200K, 96.7% for 1M (formula: `(window - 33K) / window * 100`)
- [ ] Statusline buffer visualization (grayed-out section) uses dynamic threshold
- [ ] `_util.py` has `_read_model_from_config()`, `_get_max_context_tokens()`, and `_get_compaction_threshold_pct()` functions (no launcher imports)
- [ ] 1M model users see correct context percentages in fallback path
- [ ] Existing 200K behavior unchanged for users without 1M
- [ ] `context_monitor.py` executable as standalone script without ImportError
- [ ] All affected tests updated and passing

**Verify:**

- `uv run pytest launcher/tests/unit/test_context_monitor.py -q`
- `uv run pytest launcher/tests/ -q`

---

### Task 5: Console Settings View (React UI)

**Objective:** Create a Settings page in the Console with model selection dropdowns for main session, each command, and each agent.

**Dependencies:** Task 2

**Files:**

- Create: `console/src/ui/viewer/views/Settings/index.tsx`
- Create: `console/src/ui/viewer/views/Settings/ModelSelect.tsx`
- Modify: `console/src/ui/viewer/views/index.ts` (export SettingsView)
- Modify: `console/src/ui/viewer/App.tsx` (add route)
- Modify: `console/src/ui/viewer/layouts/Sidebar/SidebarNav.tsx` (add nav item)
- Create: `console/src/ui/viewer/hooks/useSettings.ts`

**Key Decisions / Notes:**

- Add nav item: `{ icon: 'lucide:settings', label: 'Settings', href: '#/settings' }` — place it at the bottom of the nav list (after Vault)
- Route: `{ path: '/settings', component: SettingsView }`
- Settings page layout:
  - **Section 1: Main Model** — single dropdown for quick mode model (4 choices)
  - **Section 2: Commands** — table with command name + dropdown per row (4 choices each)
  - **Section 3: Agents** — table with agent name + dropdown per row (2 choices each: sonnet, opus)
  - **Info alert** at top: "1M context models (Sonnet 4.6 1M, Opus 4.6 1M) require a compatible Anthropic subscription. Not all users have access."
  - **Restart notice** (shown after saving): "Settings saved. Restart Pilot to apply changes."
- `useSettings` hook: fetches `GET /api/settings`, provides `save()` function that calls `PUT /api/settings`
- `ModelSelect` component: reusable dropdown with model display names, accepts `choices` prop to restrict options
- Use DaisyUI `select` component for dropdowns, `alert` for notices, `card` for sections
- Save button at bottom of page (not auto-save — explicit action)

**Definition of Done:**

- [ ] Settings page accessible at `#/settings` via sidebar navigation
- [ ] Main model dropdown shows 4 choices with correct display names
- [ ] Each command has a dropdown with 4 model choices
- [ ] Each agent has a dropdown with 2 model choices (sonnet, opus only)
- [ ] 1M context warning displayed
- [ ] Save button writes to API, shows restart notice on success
- [ ] Page loads current settings from API on mount
- [ ] Dropdowns are disabled or show a loading skeleton while settings are being fetched
- [ ] If the API call fails on mount, the page shows an error message rather than silently using empty defaults

**Verify:**

- Open `http://localhost:41777/#/settings` — page renders with all dropdowns
- Change a model, click Save — verify `~/.pilot/config.json` updated
- Verify restart notice appears after saving

---

### Task 6: Update ModelRoutingInfo in Usage View

**Objective:** Replace the hardcoded model routing table in the Usage view with dynamic content reflecting the user's actual model configuration.

**Dependencies:** Task 2, Task 5

**Files:**

- Modify: `console/src/ui/viewer/views/Usage/ModelRoutingInfo.tsx`

**Key Decisions / Notes:**

- Fetch current settings from `GET /api/settings` (reuse `useSettings` hook from Task 5)
- Replace hardcoded "Opus 4.6" / "Sonnet 4.5" with actual model display names from config
- Update the routing table to show: Planning → config.commands["spec-plan"], Implementation → config.commands["spec-implement"], Verification → config.commands["spec-verify"]
- Update the review agents column to show actual agent models from config
- Keep the subscription tier links (Max 5x, Max 20x, Team) — those are still relevant
- Update the Quick Mode tip to reference the user's actual main model instead of hardcoded values
- Add a link to the Settings page: "Configure models in Settings"

**Definition of Done:**

- [ ] Routing table shows actual configured models, not hardcoded values
- [ ] Agent models displayed correctly per config
- [ ] Link to Settings page present
- [ ] When GET /api/settings fails, ModelRoutingInfo renders with static default model values and does not crash or show blank

**Verify:**

- Open `http://localhost:41777/#/usage` — ModelRoutingInfo shows current config values
- Change model in Settings, reload Usage — routing info reflects new values

---

### Task 7: Update README and Website Model Routing Docs

**Objective:** Update the model routing documentation in the README and the website blog post to reflect that models are now user-configurable via the Console Settings page.

**Dependencies:** Task 5 (Settings page must exist to reference)

**Files:**

- Modify: `README.md` (Smart Model Routing section, ~line 209)
- Modify: `docs/site/src/content/blog/model-selection.md` (Model Configuration section)

**Key Decisions / Notes:**

- README: Update the "Smart Model Routing" section to mention that models are now configurable via Console Settings (`localhost:41777/#/settings`). Keep the explanation of the routing strategy (Opus for planning, Sonnet for implementation) but note these are configurable defaults
- README: Add a note about 1M context models requiring a compatible subscription
- Website blog `model-selection.md`: Update the Model Configuration section to reference the Console Settings page as the primary way to configure models. Update any hardcoded model names to reflect that they're defaults
- Don't rewrite entire sections — add brief notes about configurability and link to the Settings page

**Definition of Done:**

- [ ] README "Smart Model Routing" section mentions Console Settings page for model configuration
- [ ] README includes note about 1M context availability
- [ ] Website model-selection.md references Console Settings for model configuration
- [ ] No broken links or formatting issues

**Verify:**

- Read updated sections and verify accuracy
- `cd docs/site && npm run build` — site builds without errors (if applicable)

---

### Task 8: Integration Testing and Verification

**Objective:** End-to-end verification that the full flow works: config → API → UI → injection → Claude launch.

**Dependencies:** Tasks 1-7

**Files:**

- No new files — this is verification of existing work

**Key Decisions / Notes:**

- Run all Python tests: `uv run pytest -q`
- Run all Console tests: `cd console && bun test`
- Manual verification flow:
  1. Start with clean config (no model keys in `~/.pilot/config.json`)
  2. Open Console Settings — verify defaults populated
  3. Change main model to `opus[1m]`, save
  4. Verify `~/.pilot/config.json` has `"model": "opus[1m]"`
  5. Restart Pilot
  6. Verify `~/.claude/pilot/settings.json` has `"model": "opus[1m]"`
  7. Verify command files updated (e.g., `~/.claude/pilot/commands/spec-plan.md` has `model: opus[1m]`)
  8. Open Usage page — verify ModelRoutingInfo shows updated models
- Verify that missing config keys don't break anything (resilience test)

**Definition of Done:**

- [ ] All Python tests pass (`uv run pytest -q`)
- [ ] All Console tests pass (`cd console && bun test`)
- [ ] After saving `model=opus[1m]` in Settings UI: `~/.pilot/config.json` contains `"model": "opus[1m]"`
- [ ] After restarting Pilot: `~/.claude/pilot/settings.json` has `"model": "opus[1m]"`
- [ ] After restart: `~/.claude/pilot/commands/spec-plan.md` YAML front matter has `model: opus[1m]`
- [ ] After restart: `~/.claude/pilot/agents/plan-verifier.md` YAML front matter still has `model: sonnet` (agents don't get 1M)
- [ ] Usage page ModelRoutingInfo shows updated model display names
- [ ] With `model=opus[1m]` in config, context percentage calculation uses 1M denominator (verified via unit test or manual check)
- [ ] No regressions in statusline or context monitoring

**Verify:**

- `uv run pytest -q` — 0 failures
- `cd console && bun test` — 0 failures
- Manual walkthrough of the complete flow

## Testing Strategy

- **Unit tests:** Config read/write utilities (Python), settings injection logic (Python), API endpoint validation (TypeScript)
- **Integration tests:** Full config → injection → file verification flow
- **Manual verification:** Console UI interaction, model dropdowns, save/restart flow, Usage page dynamic routing

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Injection corrupts command/agent YAML | Low | High | Scope regex to front matter only; atomic writes (temp file + rename) for all files; verify content preserved in tests |
| Config.json doesn't exist on first run | Med | Low | `read_model_config()` returns defaults when file missing or keys absent |
| 1M user sees wrong context percentage in fallback | Low | Med | Dynamic `_get_max_context_tokens()` reads model from config; falls back to 200K constant |
| Race condition: console writes config while launcher reads | Low | Low | Atomic write (temp file + rename) in both Python and TypeScript |
| Installer upgrade overwrites injected files | Med | Low | Injection runs on every `pilot` startup, re-applying config after upgrade. Users who always launch via `pilot` are unaffected |
| Concurrent sessions writing plugin files | Low | Low | Atomic writes prevent corruption; all sessions inject the same config values (single config.json) |

## Open Questions

- None — all design decisions confirmed with user.

### Deferred Ideas

- Auto-detect user's Anthropic subscription tier to filter available models
- Live model switching without requiring Pilot restart
- Blog/website content updates about model selection

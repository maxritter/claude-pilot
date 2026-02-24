import { Activity, CheckCircle2, Terminal } from "lucide-react";
import { useInView } from "@/hooks/use-in-view";

const hookGroups = [
  {
    event: "SessionStart",
    trigger: "On startup, clear, or after compaction",
    color: "text-sky-400",
    bgColor: "bg-sky-400/10",
    borderColor: "border-sky-400/30",
    hooks: [
      {
        name: "Memory loader",
        type: "Blocking",
        desc: "Loads persistent context from Pilot Shell Console memory into the session",
      },
      {
        name: "post_compact_restore.py",
        type: "Blocking",
        desc: "Re-injects active plan, task state, and key context after auto-compaction",
      },
      {
        name: "Session tracker",
        type: "Async",
        desc: "Initializes user message tracking for the session",
      },
    ],
  },
  {
    event: "UserPromptSubmit",
    trigger: "When the user sends a message",
    color: "text-emerald-400",
    bgColor: "bg-emerald-400/10",
    borderColor: "border-emerald-400/30",
    hooks: [
      {
        name: "Session initializer",
        type: "Async",
        desc: "Initializes and registers the session with the Pilot Shell Console worker daemon on first user message.",
      },
    ],
  },
  {
    event: "PreToolUse",
    trigger: "Before search, web, or task tools",
    color: "text-amber-400",
    bgColor: "bg-amber-400/10",
    borderColor: "border-amber-400/30",
    hooks: [
      {
        name: "tool_redirect.py",
        type: "Blocking",
        desc: "Blocks WebSearch/WebFetch (MCP alternatives exist), blocks EnterPlanMode/ExitPlanMode (/spec conflict). Hints vexor for semantic Grep patterns.",
      },
    ],
  },
  {
    event: "PostToolUse",
    trigger: "After every Write / Edit / MultiEdit",
    color: "text-primary",
    bgColor: "bg-primary/10",
    borderColor: "border-primary/30",
    hooks: [
      {
        name: "file_checker.py",
        type: "Blocking",
        desc: "Language-specific quality checks: Python (ruff + basedpyright), TypeScript (Prettier + ESLint + tsc), Go (gofmt + golangci-lint). Auto-fixes formatting.",
      },
      {
        name: "tdd_enforcer.py",
        type: "Non-blocking",
        desc: "Checks if implementation files were edited without a failing test existing first. Reminds to write tests. Excludes test files, docs, config, TSX, infrastructure.",
      },
      {
        name: "context_monitor.py",
        type: "Non-blocking",
        desc: "Monitors context usage on an effective 0–100% scale. Warns at ~80% (informational) and ~90%+ (caution). Prompts /learn at key thresholds.",
      },
      {
        name: "Memory observer",
        type: "Async",
        desc: "Captures development observations (decisions, discoveries, bugfixes) to persistent memory for future sessions.",
      },
    ],
  },
  {
    event: "PreCompact",
    trigger: "Before auto-compaction fires",
    color: "text-violet-400",
    bgColor: "bg-violet-400/10",
    borderColor: "border-violet-400/30",
    hooks: [
      {
        name: "pre_compact.py",
        type: "Blocking",
        desc: "Captures Pilot state (active plan, task list, key context, decisions) to persistent memory before context compaction fires.",
      },
    ],
  },
  {
    event: "Stop",
    trigger: "When Claude tries to finish",
    color: "text-rose-400",
    bgColor: "bg-rose-400/10",
    borderColor: "border-rose-400/30",
    hooks: [
      {
        name: "spec_stop_guard.py",
        type: "Blocking",
        desc: "If an active spec exists with PENDING or COMPLETE status, blocks stopping. Forces verification to complete before the session can end.",
      },
      {
        name: "spec_plan_validator.py",
        type: "Blocking",
        desc: "During /spec planning, verifies the plan file was created and contains required sections before allowing the session to end.",
      },
      {
        name: "spec_verify_validator.py",
        type: "Blocking",
        desc: "During /spec verification, verifies the plan status was updated to VERIFIED before allowing the session to end.",
      },
      {
        name: "Session summarizer",
        type: "Async",
        desc: "Saves session observations to persistent memory so future sessions benefit from this session's work.",
      },
    ],
  },
  {
    event: "SessionEnd",
    trigger: "When the session closes",
    color: "text-slate-400",
    bgColor: "bg-slate-400/10",
    borderColor: "border-slate-400/30",
    hooks: [
      {
        name: "session_end.py",
        type: "Blocking",
        desc: "Stops the worker daemon when no other Pilot sessions are active. Sends real-time dashboard notification.",
      },
    ],
  },
];

const typeColors: Record<string, string> = {
  Blocking: "text-rose-400 bg-rose-400/10",
  "Non-blocking": "text-amber-400 bg-amber-400/10",
  Async: "text-sky-400 bg-sky-400/10",
};

const HooksSection = () => {
  const [ref, inView] = useInView<HTMLDivElement>();

  return (
    <section
      id="hooks"
      className="py-10 border-b border-border/50 scroll-mt-24"
    >
      <div ref={ref} className={inView ? "animate-fade-in-up" : "opacity-0"}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">
              Hooks Pipeline
            </h2>
            <p className="text-sm text-muted-foreground">
              15 hooks across 7 lifecycle events — fire automatically at every
              stage
            </p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
          Hooks are the enforcement layer. They run at each stage of Claude's
          work cycle — automatically, without prompting. Blocking hooks can
          reject an action or force a fix. Non-blocking hooks warn without
          interrupting. Async hooks run in the background.
        </p>

        <div className="space-y-3">
          {hookGroups.map((group) => (
            <div
              key={group.event}
              className={`rounded-xl border ${group.borderColor} bg-card/30`}
            >
              <div className={`px-4 py-3 border-b ${group.borderColor}`}>
                <div className="flex items-center gap-2">
                  <Terminal className={`h-4 w-4 ${group.color}`} />
                  <code className={`text-sm font-semibold ${group.color}`}>
                    {group.event}
                  </code>
                  <span className="text-xs text-muted-foreground">
                    — {group.trigger}
                  </span>
                </div>
              </div>
              <div className="divide-y divide-border/30">
                {group.hooks.map((hook) => (
                  <div
                    key={hook.name}
                    className="px-4 py-2.5 flex items-start gap-3"
                  >
                    <CheckCircle2
                      className={`h-3.5 w-3.5 ${group.color} flex-shrink-0 mt-0.5`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <code className="text-xs font-medium text-foreground">
                          {hook.name}
                        </code>
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded font-medium ${typeColors[hook.type] ?? ""}`}
                        >
                          {hook.type}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {hook.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-xl p-4 border border-violet-400/20 bg-gradient-to-r from-violet-500/5 via-sky-500/5 to-violet-500/5">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="text-violet-400 font-medium">Closed loop:</span>{" "}
            When compaction fires,{" "}
            <span className="text-violet-400">PreCompact</span> captures your
            active plan, task list, and key decisions to persistent memory.{" "}
            <span className="text-sky-400">SessionStart</span> restores
            everything afterward — work continues exactly where it left off. No
            progress lost, no manual intervention.
          </p>
        </div>
      </div>
    </section>
  );
};

export default HooksSection;

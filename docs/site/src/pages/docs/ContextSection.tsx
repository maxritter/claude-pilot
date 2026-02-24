import { RefreshCw, CheckCircle2, ArrowRight } from "lucide-react";
import { useInView } from "@/hooks/use-in-view";

const cycleSteps = [
  {
    name: "PreCompact",
    color: "text-violet-400",
    bg: "bg-violet-400/10",
    desc: "pre_compact.py captures active plan, task list, recent decisions, and key context to Pilot Shell Console memory.",
  },
  {
    name: "Compact",
    color: "text-slate-400",
    bg: "bg-slate-400/10",
    desc: "Claude Code auto-compaction summarizes conversation history. Preserves recent tool calls and conversation flow.",
  },
  {
    name: "SessionStart(compact)",
    color: "text-sky-400",
    bg: "bg-sky-400/10",
    desc: "post_compact_restore.py re-injects Pilot context: active plan path, task state, key decisions. Work resumes seamlessly.",
  },
];

const preserved = [
  "Active plan file path and current status (PENDING/COMPLETE/VERIFIED)",
  "Task list with completion state and in-progress task",
  "Key decisions made during the session",
  "Recently modified files and their context",
  "Error messages and debugging progress",
  "Memory observations from the Pilot Shell Console",
];

const ContextSection = () => {
  const [ref, inView] = useInView<HTMLDivElement>();

  return (
    <section
      id="context-preservation"
      className="py-10 border-b border-border/50 scroll-mt-24"
    >
      <div ref={ref} className={inView ? "animate-fade-in-up" : "opacity-0"}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <RefreshCw className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">
              Context Preservation
            </h2>
            <p className="text-sm text-muted-foreground">
              Seamless continuation across auto-compaction cycles
            </p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
          Claude Code reserves ~16.5% of the context window as a compaction
          buffer, triggering auto-compaction at ~83.5% raw usage. Pilot hooks
          intercept this cycle to preserve state — you never lose progress
          mid-task. Multiple Pilot sessions can run in parallel on the same
          project without interference.
        </p>

        {/* Compaction cycle */}
        <h3 className="font-semibold text-foreground text-sm mb-3">
          The compaction cycle
        </h3>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-6">
          {cycleSteps.map((step, i) => (
            <div key={step.name} className="flex items-center gap-2 flex-1">
              <div
                className={`rounded-xl p-3 border border-border/50 ${step.bg} flex-1`}
              >
                <code
                  className={`text-xs font-semibold ${step.color} block mb-1`}
                >
                  {step.name}
                </code>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {step.desc}
                </p>
              </div>
              {i < cycleSteps.length - 1 && (
                <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0 hidden sm:block" />
              )}
            </div>
          ))}
        </div>

        {/* Effective context display */}
        <div className="rounded-xl p-4 border border-border/50 bg-card/30 mb-5">
          <h3 className="font-semibold text-foreground text-sm mb-2">
            Effective context display
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Pilot rescales the raw context usage to an{" "}
            <span className="text-primary font-medium">
              effective 0–100% range
            </span>{" "}
            so the status bar fills naturally to 100% right before compaction
            fires. A <code className="text-primary">▓</code> buffer indicator at
            the end of the bar shows the reserved zone. The context monitor
            warns at ~80% effective (informational) and ~90%+ effective
            (caution) — no confusing raw percentages.
          </p>
        </div>

        {/* What gets preserved */}
        <h3 className="font-semibold text-foreground text-sm mb-3">
          What gets preserved
        </h3>
        <div className="grid sm:grid-cols-2 gap-1.5 mb-5">
          {preserved.map((item) => (
            <div
              key={item}
              className="flex items-start gap-2 text-xs text-muted-foreground"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-0.5" />
              <span>{item}</span>
            </div>
          ))}
        </div>

        <div className="rounded-xl p-4 border border-primary/20 bg-primary/5">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="text-primary font-medium">
              Never rush due to context warnings.
            </span>{" "}
            Context limits are not an emergency — auto-compaction preserves
            everything and resumes seamlessly. Finish the current task with full
            quality. The only thing that matters is the output, not the context
            percentage.
          </p>
        </div>
      </div>
    </section>
  );
};

export default ContextSection;

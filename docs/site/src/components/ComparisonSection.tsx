import { Clock, Zap, AlertTriangle, CheckCircle2, Brain, FileCode2, ShieldCheck, X, Check } from "lucide-react";
import { useInView } from "@/hooks/use-in-view";

const painSolution = [
  {
    audience: "Losing context mid-task",
    pain: ["Context degrades halfway through", "Every session starts from scratch", "Manual copy-paste to continue"],
    solution: ["Hooks capture and restore state across compaction", "Persistent memory across sessions", "Context monitor warns before limits hit"],
  },
  {
    audience: "Inconsistent code quality",
    pain: ["No tests written", "No linting or formatting", "Hope-driven development"],
    solution: ["TDD enforced on every feature", "Hooks auto-lint, format, type-check", "Verifier agents review code"],
  },
  {
    audience: "No structure or planning",
    pain: ["Jumps straight to coding", "No codebase exploration", "Scope creep and rework"],
    solution: ["/spec plans before coding", "Semantic search explores codebase", "Approval gate before implementation"],
  },
];

const ComparisonSection = () => {
  const [headerRef, headerInView] = useInView<HTMLDivElement>();
  const [cardsRef, cardsInView] = useInView<HTMLDivElement>();
  const [tableRef, tableInView] = useInView<HTMLDivElement>();

  return (
    <section id="problem" className="py-16 lg:py-24 px-4 sm:px-6 relative">
      <div className="max-w-6xl mx-auto">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        {/* Section Header */}
        <div
          ref={headerRef}
          className={`text-center mb-12 ${headerInView ? "animate-fade-in-up" : "opacity-0"}`}
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">The Problem</h2>
          <p className="text-muted-foreground text-lg sm:text-xl max-w-2xl mx-auto">
            Without structure, Claude Code skips tests, loses context, and produces inconsistent results.
          </p>
        </div>

        {/* Before & After Terminal Comparison */}
        <div
          ref={cardsRef}
          className={`grid md:grid-cols-2 gap-6 sm:gap-8 stagger-children ${cardsInView ? "in-view" : ""}`}
        >
          {/* Without Pilot Shell */}
          <div className="glass rounded-2xl p-5 sm:p-6 relative border-slate-500/20 hover:border-slate-500/30 transition-colors">
            <div className="absolute top-3 sm:top-4 right-3 sm:right-4 bg-slate-500/20 text-slate-400 px-2 sm:px-3 py-1 rounded-full text-xs font-medium">
              Without Structure
            </div>

            {/* Terminal window */}
            <div className="mt-8 space-y-3">
              {/* Terminal header */}
              <div className="bg-background/80 rounded-t-lg px-4 py-2 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-slate-500/60" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                  <div className="w-3 h-3 rounded-full bg-blue-500/60" />
                </div>
                <span className="text-xs text-muted-foreground ml-2 font-mono">terminal</span>
              </div>

              {/* Terminal content */}
              <div className="bg-background/50 rounded-b-lg p-4 font-mono text-xs sm:text-sm space-y-3">
                <div>
                  <span className="text-blue-400">you:</span>
                  <span className="text-muted-foreground ml-2">Add user authentication</span>
                </div>
                <div>
                  <span className="text-primary">claude:</span>
                  <span className="text-muted-foreground ml-2">What framework? What patterns?</span>
                </div>
                <div className="text-slate-400/80 flex items-center gap-2 text-xs">
                  <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                  <span>No context from previous sessions</span>
                </div>
                <div className="text-slate-400/80 flex items-center gap-2 text-xs">
                  <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                  <span>No codebase knowledge</span>
                </div>
                <div className="border-t border-border/50 pt-3">
                  <span className="text-muted-foreground">...writes code without tests...</span>
                </div>
                <div className="text-slate-400/80 flex items-center gap-2 text-xs">
                  <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                  <span>No TDD enforcement</span>
                </div>
                <div className="border-t border-border/50 pt-3">
                  <span className="text-muted-foreground">...commits with issues...</span>
                </div>
                <div className="text-slate-400/80 flex items-center gap-2 text-xs">
                  <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                  <span>No quality checks or formatting</span>
                </div>
              </div>
            </div>

            {/* Result */}
            <div className="mt-4 flex items-center justify-center gap-2 text-slate-400 text-sm">
              <Clock className="h-4 w-4" />
              <span>Inconsistent. Untested. Risky.</span>
            </div>
          </div>

          {/* With Pilot Shell */}
          <div className="glass rounded-2xl p-5 sm:p-6 relative border-primary/20 hover:border-primary/30 transition-colors">
            <div className="absolute top-3 sm:top-4 right-3 sm:right-4 bg-primary/20 text-primary px-2 sm:px-3 py-1 rounded-full text-xs font-medium">
              With Pilot Shell
            </div>

            {/* Terminal window */}
            <div className="mt-8 space-y-3">
              {/* Terminal header */}
              <div className="bg-background/80 rounded-t-lg px-4 py-2 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-slate-500/60" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                  <div className="w-3 h-3 rounded-full bg-blue-500/60" />
                </div>
                <span className="text-xs text-muted-foreground ml-2 font-mono">pilot</span>
              </div>

              {/* Terminal content */}
              <div className="bg-background/50 rounded-b-lg p-4 font-mono text-xs sm:text-sm space-y-2.5">
                {/* /spec command */}
                <div>
                  <span className="text-primary">/spec</span>
                  <span className="text-muted-foreground ml-2">"Add user authentication"</span>
                </div>
                {/* Context injection */}
                <div className="text-primary/80 flex items-center gap-2 text-xs">
                  <Brain className="h-3 w-3 flex-shrink-0" />
                  <span>Persistent memory: Context injected</span>
                </div>
                <div className="text-primary/80 flex items-center gap-2 text-xs">
                  <FileCode2 className="h-3 w-3 flex-shrink-0" />
                  <span>Rules + Standards loaded</span>
                </div>
                <div className="border-t border-border/50 pt-2.5 text-xs">
                  <span className="text-primary">→ Planning:</span>
                  <span className="text-muted-foreground ml-1">Exploring codebase...</span>
                </div>
                <div className="text-primary/80 flex items-center gap-2 text-xs">
                  <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
                  <span>Plan created → Waiting for approval</span>
                </div>
                <div className="border-t border-border/50 pt-2.5 text-xs">
                  <span className="text-primary">→ Implementing:</span>
                  <span className="text-muted-foreground ml-1">TDD enforced</span>
                </div>
                <div className="text-primary/80 flex items-center gap-2 text-xs">
                  <ShieldCheck className="h-3 w-3 flex-shrink-0" />
                  <span>Quality hooks: linted, formatted, typed</span>
                </div>
                <div className="border-t border-border/50 pt-2.5 text-xs">
                  <span className="text-primary">→ Verifying:</span>
                  <span className="text-primary ml-1">All checks passed ✓</span>
                </div>
                <div className="text-primary/80 flex items-center gap-2 text-xs">
                  <Zap className="h-3 w-3 flex-shrink-0" />
                  <span>Complete! Anything else?</span>
                </div>
              </div>
            </div>

            {/* Result */}
            <div className="mt-4 flex items-center justify-center gap-2 text-primary text-sm">
              <Zap className="h-4 w-4" />
              <span>Grab a coffee. Come back to verified code.</span>
            </div>
          </div>
        </div>

        {/* Pain → Solution Cards */}
        <div
          ref={tableRef}
          className={`mt-12 grid md:grid-cols-3 gap-6 ${tableInView ? "animate-fade-in-up" : "opacity-0"}`}
        >
          {painSolution.map((card) => (
            <div key={card.audience} className="rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm overflow-hidden hover:border-primary/30 transition-colors">
              <div className="px-5 pt-5 pb-3">
                <h4 className="text-sm font-semibold text-foreground mb-1">{card.audience}</h4>
              </div>
              <div className="px-5 pb-4 space-y-2">
                {card.pain.map((p) => (
                  <div key={p} className="flex items-start gap-2 text-xs text-slate-400">
                    <X className="h-3.5 w-3.5 text-destructive flex-shrink-0 mt-0.5" />
                    <span>{p}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-center py-2 text-primary text-lg">&darr;</div>
              <div className="px-5 pb-5 space-y-2 border-t border-primary/20 pt-4 bg-primary/[0.03]">
                {card.solution.map((s) => (
                  <div key={s} className="flex items-start gap-2 text-xs text-foreground/80">
                    <Check className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-0.5" />
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom highlight */}
        <div className="mt-10 text-center">
          <p className="text-muted-foreground text-sm sm:text-base max-w-2xl mx-auto">
            <span className="text-primary font-medium">Start a task. Walk away. Come back to code you can actually ship.</span>
          </p>
        </div>
      </div>
    </section>
  );
};

export default ComparisonSection;

import { Zap, CheckCircle2 } from "lucide-react";
import { useInView } from "@/hooks/use-in-view";

const stillApply = [
  "Quality hooks — auto-format, lint, type-check on every file edit",
  "TDD enforcement — write failing tests before implementation",
  "Context preservation across auto-compaction cycles",
  "Persistent memory for recalling past decisions and context",
  "MCP servers (lib-docs, mem-search, web-search, grep-mcp, web-fetch)",
  "Language servers — real-time diagnostics and go-to-definition",
];

const QuickModeSection = () => {
  const [ref, inView] = useInView<HTMLDivElement>();

  return (
    <section
      id="quick-mode"
      className="py-10 border-b border-border/50 scroll-mt-24"
    >
      <div ref={ref} className={inView ? "animate-fade-in-up" : "opacity-0"}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Quick Mode</h2>
            <p className="text-sm text-muted-foreground">
              Direct execution — no plan file, no approval gate
            </p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
          Quick mode is the default interaction model. Just describe your task
          and Pilot gets it done — no spec file, no approval step, no directory
          scaffolding. Zero overhead on simple tasks. All quality guardrails
          still apply — hooks, TDD, type checking — but nothing slows down the
          interaction.
        </p>

        <div className="bg-background/80 rounded-lg p-3 font-mono text-sm border border-border/50 text-muted-foreground mb-6">
          <div>
            <span className="text-primary">$</span> pilot
          </div>
          <div className="pl-2">
            <span className="text-primary">&gt;</span> Add a loading spinner to
            the submit button
          </div>
          <div className="pl-2">
            <span className="text-primary">&gt;</span> Write tests for the
            OrderService class
          </div>
          <div className="pl-2">
            <span className="text-primary">&gt;</span> Explain how the auth
            middleware works
          </div>
          <div className="pl-2">
            <span className="text-primary">&gt;</span> Rename the
            &quot;products&quot; table to &quot;items&quot; across the codebase
          </div>
        </div>

        <div className="rounded-xl p-4 border border-border/50 bg-card/30 mb-5">
          <h3 className="font-semibold text-foreground text-sm mb-3">
            Quality guardrails active in quick mode
          </h3>
          <div className="grid sm:grid-cols-2 gap-1.5">
            {stillApply.map((item) => (
              <div
                key={item}
                className="flex items-start gap-2 text-xs text-muted-foreground"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-0.5" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl p-4 border border-primary/20 bg-primary/5">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="text-primary font-medium">
              When to use /spec instead:
            </span>{" "}
            Use{" "}
            <code className="text-primary bg-primary/10 px-1 py-0.5 rounded">
              /spec
            </code>{" "}
            for bug fixes (structured bug analysis with Behavior Contract and
            test-before-fix), complex features that need a plan before
            implementation, or refactors with many interdependent changes.
          </p>
        </div>
      </div>
    </section>
  );
};

export default QuickModeSection;

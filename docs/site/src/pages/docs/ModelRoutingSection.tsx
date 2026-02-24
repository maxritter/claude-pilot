import { Cpu, CheckCircle2 } from "lucide-react";
import { useInView } from "@/hooks/use-in-view";

const routingTable = [
  {
    phase: "Planning",
    model: "Opus",
    color: "text-violet-400",
    bg: "bg-violet-400/10",
    why: "Exploring your codebase, designing architecture, and writing the spec requires deep reasoning. A good plan is the foundation of everything — invest here.",
  },
  {
    phase: "Plan Verification",
    model: "Opus",
    color: "text-violet-400",
    bg: "bg-violet-400/10",
    why: "Catching gaps, missing edge cases, and requirement mismatches before implementation starts saves expensive rework. Independent review needs independent reasoning.",
  },
  {
    phase: "Implementation",
    model: "Sonnet",
    color: "text-sky-400",
    bg: "bg-sky-400/10",
    why: "With a solid plan, writing code is straightforward. Sonnet is fast, cost-effective, and produces high-quality code when guided by a clear spec and strong hooks.",
  },
  {
    phase: "Code Verification",
    model: "Opus",
    color: "text-violet-400",
    bg: "bg-violet-400/10",
    why: "Independent code review against the plan requires the same reasoning depth as planning — catching subtle bugs, logic errors, and spec deviations.",
  },
];

const insight = [
  "Implementation is the easy part when the plan is good and verification is thorough",
  "Pilot invests reasoning power (Opus) where it has the highest impact: planning and review",
  "Fast execution (Sonnet) is used where a clear spec makes quality predictable",
  "The result: better output at lower cost than running Opus everywhere",
];

const ModelRoutingSection = () => {
  const [ref, inView] = useInView<HTMLDivElement>();

  return (
    <section id="model-routing" className="py-10 scroll-mt-24">
      <div ref={ref} className={inView ? "animate-fade-in-up" : "opacity-0"}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <Cpu className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">
              Smart Model Routing
            </h2>
            <p className="text-sm text-muted-foreground">
              Opus where reasoning matters, Sonnet where speed and cost matter
            </p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
          Pilot automatically routes each phase to the right model. Rather than
          always using the most powerful (and most expensive) model, it applies
          reasoning where reasoning has the highest impact — and uses fast,
          cost-effective execution where a clear spec makes quality predictable.
        </p>

        {/* Routing table */}
        <div className="space-y-3 mb-6">
          {routingTable.map((row) => (
            <div
              key={row.phase}
              className="rounded-xl border border-border/50 bg-card/30 p-4 flex items-start gap-4"
            >
              <div className="flex-shrink-0 text-right w-36">
                <div className="text-sm font-semibold text-foreground">
                  {row.phase}
                </div>
                <div
                  className={`text-xs font-mono font-bold ${row.color} mt-0.5`}
                >
                  <span className={`px-1.5 py-0.5 rounded ${row.bg}`}>
                    {row.model}
                  </span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {row.why}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* The insight */}
        <div className="rounded-xl p-4 border border-border/50 bg-card/30 mb-5">
          <h3 className="font-semibold text-foreground text-sm mb-3">
            The insight
          </h3>
          <div className="space-y-1.5">
            {insight.map((item) => (
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

        {/* Configurability */}
        <div className="rounded-xl p-4 border border-primary/20 bg-primary/5">
          <div className="flex items-start gap-2">
            <Cpu className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="text-primary font-medium">
                Fully configurable
              </span>{" "}
              via the Pilot Shell Console Settings tab (
              <code className="text-primary">localhost:41777/#/settings</code>
              ). Choose between Sonnet 4.6 and Opus 4.6 for the main session,
              each command, and each sub-agent independently. Enable the{" "}
              <span className="text-primary">Extended Context (1M)</span> toggle
              to switch all models to the 1M token context window simultaneously
              — useful for very large codebases. Requires Max 20x or Enterprise
              subscription.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ModelRoutingSection;

import {
  Download,
  Settings,
  Rocket,
  Activity,
  Brain,
  CheckCircle2,
} from "lucide-react";
import { useInView } from "@/hooks/use-in-view";

const steps = [
  {
    icon: Download,
    label: "Install",
    detail: "One curl command. Installs binary, shell integration, and dev container support.",
    color: "text-sky-400",
    bgColor: "bg-sky-400/10",
    borderColor: "border-sky-400/30",
  },
  {
    icon: Settings,
    label: "Configure",
    detail: "Step-based installer deploys rules, hooks, standards, MCP servers, and language servers.",
    color: "text-amber-400",
    bgColor: "bg-amber-400/10",
    borderColor: "border-amber-400/30",
  },
  {
    icon: Rocket,
    label: "Launch",
    detail: "Run pilot. Session wrapper starts Claude Code with license check and context injection.",
    color: "text-primary",
    bgColor: "bg-primary/10",
    borderColor: "border-primary/30",
  },
  {
    icon: Activity,
    label: "Hooks Fire",
    detail: "SessionStart hooks load persistent memory, initialize tracking, and prepare context.",
    color: "text-violet-400",
    bgColor: "bg-violet-400/10",
    borderColor: "border-violet-400/30",
  },
  {
    icon: Brain,
    label: "Memory Loads",
    detail: "Past sessions, decisions, and debugging context injected automatically via Pilot Shell Console.",
    color: "text-rose-400",
    bgColor: "bg-rose-400/10",
    borderColor: "border-rose-400/30",
  },
  {
    icon: CheckCircle2,
    label: "Ready",
    detail: "Full system online — rules loaded, hooks armed, standards active, memory active.",
    color: "text-emerald-400",
    bgColor: "bg-emerald-400/10",
    borderColor: "border-emerald-400/30",
  },
];

const DeploymentFlow = () => {
  const [ref, inView] = useInView<HTMLDivElement>();

  return (
    <section className="py-16 lg:py-24 px-4 sm:px-6 relative">
      <div className="max-w-5xl mx-auto">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        <div
          ref={ref}
          className={`${inView ? "animate-fade-in-up" : "opacity-0"}`}
        >
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
              What Happens When You Run <code className="text-primary">pilot</code>
            </h2>
            <p className="text-muted-foreground text-lg sm:text-xl max-w-2xl mx-auto">
              From install to fully loaded — six stages, fully automated.
            </p>
          </div>

          {/* Flow steps */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.label}
                  className={`relative rounded-2xl p-5 border ${step.borderColor} bg-card/30 backdrop-blur-sm
                    hover:bg-card/50 transition-all duration-300`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 ${step.bgColor} rounded-xl flex items-center justify-center`}>
                      <Icon className={`h-5 w-5 ${step.color}`} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground/50">{String(i + 1).padStart(2, "0")}</span>
                      <h3 className="text-sm font-semibold text-foreground">{step.label}</h3>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {step.detail}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Connecting line visual */}
          <div className="hidden lg:flex justify-center mt-6 gap-2 items-center">
            {steps.map((step, i) => (
              <div key={step.label} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${step.bgColor} border ${step.borderColor}`} />
                {i < steps.length - 1 && (
                  <div className="w-12 h-px bg-gradient-to-r from-border to-border/30" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default DeploymentFlow;

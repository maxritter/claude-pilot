import {
  Activity,
  Brain,
  Eye,
  Infinity as InfinityIcon,
  Shield,
  Search,
  Cpu,
  GitBranch,
} from "lucide-react";
import { useInView } from "@/hooks/use-in-view";

const agents = [
  {
    name: "HOOKS",
    role: "Quality Enforcer",
    icon: Activity,
    color: "text-primary",
    bgColor: "bg-primary/10",
    borderColor: "border-primary/30",
    desc: "Auto-lints, formats, and type-checks on every file edit. Catches issues before they compile.",
  },
  {
    name: "VERIFIER",
    role: "Code Reviewer",
    icon: Eye,
    color: "text-emerald-400",
    bgColor: "bg-emerald-400/10",
    borderColor: "border-emerald-400/30",
    desc: "Independent sub-agent that reviews code against the plan. Finds what tests miss.",
  },
  {
    name: "MEMORY",
    role: "Context Keeper",
    icon: Brain,
    color: "text-violet-400",
    bgColor: "bg-violet-400/10",
    borderColor: "border-violet-400/30",
    desc: "Persistent observations across sessions. Past decisions, debugging context, and learnings — always available.",
  },
  {
    name: "ENDLESS",
    role: "Session Manager",
    icon: InfinityIcon,
    color: "text-amber-400",
    bgColor: "bg-amber-400/10",
    borderColor: "border-amber-400/30",
    desc: "Monitors context usage and auto-hands off at critical thresholds. No work lost, ever.",
  },
  {
    name: "PLANNER",
    role: "Architect",
    icon: Search,
    color: "text-sky-400",
    bgColor: "bg-sky-400/10",
    borderColor: "border-sky-400/30",
    desc: "Explores your codebase with semantic search, writes detailed specs, and waits for your approval.",
  },
  {
    name: "IMPLEMENTER",
    role: "TDD Executor",
    icon: Shield,
    color: "text-rose-400",
    bgColor: "bg-rose-400/10",
    borderColor: "border-rose-400/30",
    desc: "Implements each task with strict TDD in the main context. Full access to quality hooks, rules, and project context.",
  },
  {
    name: "SKILLS",
    role: "Knowledge Base",
    icon: Cpu,
    color: "text-cyan-400",
    bgColor: "bg-cyan-400/10",
    borderColor: "border-cyan-400/30",
    desc: "14 coding standards activated dynamically — Python, TypeScript, Go, API design, testing, and more.",
  },
  {
    name: "WORKTREE",
    role: "Isolation Engine",
    icon: GitBranch,
    color: "text-orange-400",
    bgColor: "bg-orange-400/10",
    borderColor: "border-orange-400/30",
    desc: "Runs spec work in isolated git worktrees. Experiment safely, squash merge when verified.",
  },
];

const AgentRoster = () => {
  const [headerRef, headerInView] = useInView<HTMLDivElement>();
  const [gridRef, gridInView] = useInView<HTMLDivElement>();

  return (
    <section className="py-16 lg:py-24 px-4 sm:px-6 relative">
      <div className="max-w-6xl mx-auto">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        <div
          ref={headerRef}
          className={`text-center mb-12 ${headerInView ? "animate-fade-in-up" : "opacity-0"}`}
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
            Meet the Squad
          </h2>
          <p className="text-muted-foreground text-lg sm:text-xl max-w-2xl mx-auto">
            Pre-configured agents working on every session. Not personas — real automation.
          </p>
        </div>

        <div
          ref={gridRef}
          className={`grid sm:grid-cols-2 lg:grid-cols-4 gap-4 ${gridInView ? "animate-fade-in-up" : "opacity-0"}`}
        >
          {agents.map((agent) => {
            const Icon = agent.icon;
            return (
              <div
                key={agent.name}
                className={`group rounded-2xl p-5 border ${agent.borderColor} bg-card/30 backdrop-blur-sm
                  hover:bg-card/50 hover:-translate-y-1 transition-all duration-300`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 ${agent.bgColor} rounded-xl flex items-center justify-center
                    group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className={`h-5 w-5 ${agent.color}`} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground font-mono tracking-wide">
                      {agent.name}
                    </h3>
                    <span className={`text-[10px] font-medium ${agent.color}`}>
                      {agent.role}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed group-hover:text-foreground/70 transition-colors">
                  {agent.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default AgentRoster;

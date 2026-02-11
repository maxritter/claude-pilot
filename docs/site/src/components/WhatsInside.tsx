import {
  Workflow,
  FileCode2,
  Plug2,
  ShieldCheck,
  Container,
  Infinity as InfinityIcon,
  Users,
  GitBranch,
} from "lucide-react";
import { useInView } from "@/hooks/use-in-view";
import ImageModal from "@/components/ImageModal";

interface InsideItem {
  icon: React.ElementType;
  title: string;
  description: string;
  summary: string;
}

const insideItems: InsideItem[] = [
  {
    icon: InfinityIcon,
    title: "Endless Mode",
    description: "Never lose context mid-task",
    summary: "Context monitor tracks usage and automatically hands off to a new session at critical thresholds. State is preserved, memory persists, and multiple sessions run in parallel without interference.",
  },
  {
    icon: Workflow,
    title: "Spec-Driven Development",
    description: "Plan → Approve → Implement → Verify",
    summary: "A structured workflow with human review gates, sequential TDD, mandatory verification, and independent code review. Loops back automatically if any check fails.",
  },
  {
    icon: ShieldCheck,
    title: "Quality Automation",
    description: "Hooks on every file edit",
    summary: "Auto-formatting, linting, and type checking for Python, TypeScript, and Go. TDD enforcer warns when code changes lack tests. Status line shows live session info.",
  },
  {
    icon: FileCode2,
    title: "Rules, Commands & Skills",
    description: "Rules · Commands · Skills",
    summary: "Production-tested best practices loaded every session. Structured workflows via /spec, /sync, /vault, /learn. Custom rules and skills survive updates.",
  },
  {
    icon: Plug2,
    title: "Enhanced Context",
    description: "MCP servers + language servers",
    summary: "Library docs, persistent memory, web search, GitHub code search, and real-time LSP diagnostics — all pre-configured and always available.",
  },
  {
    icon: Container,
    title: "One-Command Installer",
    description: "Ready in minutes, auto-updates",
    summary: "Step-based installer with progress tracking, rollback on failure, and idempotent re-runs. Shell integration, Dev Container support, and automated updates.",
  },
  {
    icon: Users,
    title: "Team Vault",
    description: "Share knowledge across your team",
    summary: "Push and pull rules, commands, and skills via a private Git repo. Automatic versioning. Works with GitHub, GitLab, and Bitbucket.",
  },
  {
    icon: GitBranch,
    title: "Isolated Workspaces",
    description: "Safe experimentation, clean git history",
    summary: "Spec implementation runs in isolated git worktrees. Review changes, squash merge when verified, or discard without touching your main branch. Worktree state survives session restarts.",
  },
];

const WhatsInside = () => {
  const [headerRef, headerInView] = useInView<HTMLDivElement>();
  const [gridRef, gridInView] = useInView<HTMLDivElement>();

  const animationDelays = [
    "animation-delay-0",
    "animation-delay-100",
    "animation-delay-200",
    "animation-delay-300",
    "animation-delay-400",
    "animation-delay-500",
    "animation-delay-0",
    "animation-delay-100",
  ];

  return (
    <section id="features" className="py-16 lg:py-24 px-4 sm:px-6 relative">
      <div className="max-w-6xl mx-auto">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        {/* Header */}
        <div
          ref={headerRef}
          className={`text-center mb-16 ${headerInView ? "animate-fade-in-up" : "opacity-0"}`}
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
            What's Inside
          </h2>
          <p className="text-muted-foreground text-lg sm:text-xl max-w-3xl mx-auto">
            A production-grade system — not a prompt template. Every component is designed to enforce
            quality, preserve context, and automate verification across your entire development workflow.
          </p>
        </div>

        {/* Feature Grid */}
        <div
          ref={gridRef}
          className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
        >
          {insideItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className={`group relative rounded-2xl p-5 border border-border/50 bg-card/30 backdrop-blur-sm
                  hover:border-primary/50 hover:bg-card/50 hover:shadow-lg hover:shadow-primary/5
                  hover:-translate-y-1 transition-all duration-300
                  ${gridInView ? `animate-fade-in-up ${animationDelays[index]}` : "opacity-0"}`}
              >
                {/* Icon and Title */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center
                    group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-foreground">
                      {item.title}
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </div>

                {/* Summary */}
                <p className="text-muted-foreground text-xs leading-relaxed mt-3 group-hover:text-foreground/80 transition-colors duration-200">
                  {item.summary}
                </p>

                {/* Subtle gradient overlay on hover */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              </div>
            );
          })}
        </div>

        {/* Console Screenshot */}
        <div className={`mt-16 ${gridInView ? "animate-fade-in-up animation-delay-500" : "opacity-0"}`}>
          <div className="text-center mb-6">
            <h3 className="text-xl sm:text-2xl font-semibold text-foreground mb-2">
              Pilot Console
            </h3>
            <p className="text-muted-foreground text-sm sm:text-base">
              Visual dashboard at localhost:41777 — real-time observations, session management, and semantic search
            </p>
          </div>
          <div className="relative rounded-xl overflow-hidden border border-border/50 shadow-2xl shadow-primary/10 max-w-4xl mx-auto">
            <ImageModal
              src="/console.png"
              alt="Claude Pilot Console Dashboard"
              className="w-full rounded-xl"
            />
            <p className="text-xs text-muted-foreground text-center mt-2 mb-1">Click to enlarge</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhatsInside;

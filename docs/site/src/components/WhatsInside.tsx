import { useState } from "react";
import {
  Workflow,
  FileCode2,
  Plug2,
  ShieldCheck,
  Infinity as InfinityIcon,
  Users,
  GitBranch,
  Bell,
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
    icon: Workflow,
    title: "Spec-Driven Development",
    description: "Plan → Approve → Implement → Verify",
    summary:
      "A structured workflow with human review gates, sequential TDD, mandatory verification, and independent code review. Loops back automatically if any check fails.",
  },
  {
    icon: ShieldCheck,
    title: "Quality Automation",
    description: "Hooks on every file edit",
    summary:
      "Auto-formatting, linting, and type checking for Python, TypeScript, and Go. TDD enforcer warns when code changes lack tests. Status line shows live session info.",
  },
  {
    icon: FileCode2,
    title: "Rules, Commands & Standards",
    description: "Rules · Commands · Standards",
    summary:
      "Production-tested best practices loaded every session. Coding standards activate by file type. Structured workflows via /spec, /sync, /vault, /learn. Custom rules survive updates.",
  },
  {
    icon: InfinityIcon,
    title: "Persistent Memory",
    description: "Context carries across sessions",
    summary:
      "Every decision, discovery, and debugging insight is captured to Pilot Shell Console. Pick up any project after days or weeks — Claude already knows your architecture, patterns, and past work.",
  },
  {
    icon: Plug2,
    title: "Enhanced Context",
    description: "MCP servers + language servers",
    summary:
      "Library docs, persistent memory, web search, GitHub code search, and real-time LSP diagnostics — all pre-configured and always available.",
  },
  {
    icon: Bell,
    title: "Smart Notifications",
    description: "Real-time alerts when you're needed",
    summary:
      "Dashboard notifications fire automatically on spec status transitions and when Claude needs your input. Plan approvals, verification results, and session events appear instantly via SSE — no polling, no page refresh.",
  },
  {
    icon: Users,
    title: "Team Vault",
    description: "Share knowledge across your team",
    summary:
      "Push and pull rules, commands, and skills via a private Git repo. Automatic versioning. Works with GitHub, GitLab, and Bitbucket.",
  },
  {
    icon: GitBranch,
    title: "Isolated Workspaces",
    description: "Safe experimentation, clean git history",
    summary:
      "Spec implementation runs in isolated git worktrees. Review changes, squash merge when verified, or discard without touching your main branch. Worktree state survives across auto-compaction cycles.",
  },
];

const consoleSlides = [
  {
    label: "Dashboard",
    src: "/console/dashboard.png",
    alt: "Console Dashboard — stats, workspace status, and spec progress",
    desc: "Workspace status, active sessions, spec progress, git info, and recent activity — all at a glance.",
  },
  {
    label: "Settings",
    src: "/console/settings.png",
    alt: "Settings view — model selection per command, sub-agent, and session with defaults",
    desc: "Choose models per command and sub-agent. Toggle extended context (1M tokens) globally.",
  },
  {
    label: "Specifications",
    src: "/console/specification.png",
    alt: "Specification view — plan details, task progress, and implementation notes",
    desc: "All spec plans with task progress, phase tracking, and iteration history.",
  },
  {
    label: "Memories",
    src: "/console/memories.png",
    alt: "Memories view — browsable observation cards with type filters",
    desc: "Decisions, discoveries, and bugfixes captured across sessions — searchable with type filters.",
  },
  {
    label: "Sessions",
    src: "/console/sessions.png",
    alt: "Sessions view — active sessions with observation and prompt counts",
    desc: "Active and past sessions with observation counts, duration, and project context.",
  },
  {
    label: "Usage",
    src: "/console/usage.png",
    alt: "Usage view — daily costs, token charts, and model routing strategy",
    desc: "Daily token costs, model routing breakdown, and usage trends over time.",
  },
  {
    label: "Vault",
    src: "/console/vault.png",
    alt: "Vault view — shared team assets with version tracking",
    desc: "Shared team assets — rules, commands, and skills — with automatic versioning.",
  },
];

const ConsoleShowcase = ({ visible }: { visible: boolean }) => {
  const [index, setIndex] = useState(0);
  const slide = consoleSlides[index];

  return (
    <div
      className={`mt-16 ${visible ? "animate-fade-in-up animation-delay-500" : "opacity-0"}`}
    >
      <div className="text-center mb-6">
        <h3 className="text-xl sm:text-2xl font-semibold text-foreground mb-2">
          Pilot Shell Console
        </h3>
        <p className="text-muted-foreground text-sm sm:text-base">
          Real-time notifications, session management, usage analytics, and
          semantic search
        </p>
      </div>

      <div className="max-w-4xl mx-auto">
        {/* Main image */}
        <div className="rounded-xl overflow-hidden border border-border/50 shadow-2xl shadow-primary/10">
          <ImageModal
            src={slide.src}
            alt={slide.alt}
            className="w-full rounded-xl"
          />
        </div>

        {/* Active view description */}
        <div className="mt-3 text-center">
          <p className="text-sm text-muted-foreground transition-all duration-200">
            <span className="font-medium text-foreground">{slide.label}</span>
            {" — "}
            {slide.desc}
          </p>
        </div>

        {/* Thumbnail strip */}
        <div className="grid grid-cols-7 gap-2 sm:gap-3 mt-3">
          {consoleSlides.map((s, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`group/thumb relative rounded-lg overflow-hidden border-2 transition-all duration-200
                ${
                  i === index
                    ? "border-primary shadow-md shadow-primary/20"
                    : "border-transparent opacity-60 hover:opacity-100 hover:border-border"
                }`}
            >
              <img src={s.src} alt={s.label} className="w-full rounded-md" />
              <div
                className={`absolute inset-x-0 bottom-0 py-1 text-[10px] sm:text-xs font-medium text-center
                ${
                  i === index
                    ? "bg-primary/90 text-primary-foreground"
                    : "bg-background/80 text-muted-foreground group-hover/thumb:text-foreground"
                }`}
              >
                {s.label}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

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
            A production-grade system — not a prompt template. Installs into any
            existing codebase, learns your conventions, and enforces quality
            across your entire development workflow.
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
                  <div
                    className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center
                    group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300"
                  >
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

        {/* Console Screenshots */}
        <ConsoleShowcase visible={gridInView} />
      </div>
    </section>
  );
};

export default WhatsInside;

import {
  Shield,
  FileCode2,
  Brain,
  Eye,
  Terminal,
  GitBranch,
  Search,
  Globe,
  BookOpen,
  CheckCircle2,
  Activity,
  Layers,
  Cpu,
  RefreshCw,
} from "lucide-react";
import { useInView } from "@/hooks/use-in-view";

const hooksPipeline = [
  {
    trigger: "SessionStart",
    description: "On startup, clear, or after compaction",
    hooks: [
      "Load persistent memory from Pilot Shell Console",
      "Restore plan state after compaction (post_compact_restore.py)",
      "Initialize session tracking (async)",
    ],
    color: "text-sky-400",
    bgColor: "bg-sky-400/10",
    borderColor: "border-sky-400/30",
  },
  {
    trigger: "PreToolUse",
    description: "Before search, web, or task tools",
    hooks: [
      "Block WebSearch/WebFetch — redirect to MCP alternatives",
      "Block EnterPlanMode/ExitPlanMode — project uses /spec",
      "Hint vexor for semantic Grep patterns",
    ],
    color: "text-amber-400",
    bgColor: "bg-amber-400/10",
    borderColor: "border-amber-400/30",
  },
  {
    trigger: "PostToolUse",
    description: "After every Write / Edit / MultiEdit",
    hooks: [
      "File checker: auto-format, lint, type-check (Python, TypeScript, Go)",
      "TDD enforcer: warns if no failing test exists",
      "Context monitor: tracks usage, warns before compaction",
      "Memory observation: captures development context (async)",
    ],
    color: "text-primary",
    bgColor: "bg-primary/10",
    borderColor: "border-primary/30",
  },
  {
    trigger: "PreCompact",
    description: "Before auto-compaction fires",
    hooks: ["Capture active plan, task list, and key context to memory"],
    color: "text-violet-400",
    bgColor: "bg-violet-400/10",
    borderColor: "border-violet-400/30",
  },
  {
    trigger: "Stop",
    description: "When Claude tries to finish",
    hooks: [
      "Spec stop guard: blocks if verification incomplete",
      "Session summary: saves observations to memory (async)",
    ],
    color: "text-rose-400",
    bgColor: "bg-rose-400/10",
    borderColor: "border-rose-400/30",
  },
  {
    trigger: "SessionEnd",
    description: "When the session closes",
    hooks: [
      "Stop worker daemon if no other sessions active",
      "Send real-time dashboard notification (session ended)",
    ],
    color: "text-slate-400",
    bgColor: "bg-slate-400/10",
    borderColor: "border-slate-400/30",
  },
];

const rulesCategories = [
  {
    icon: Shield,
    category: "Core Workflow",
    rules: [
      "Workflow enforcement & /spec orchestration",
      "TDD & test strategy",
      "Execution verification & completion",
    ],
  },
  {
    icon: Brain,
    category: "Development Practices",
    rules: [
      "Project policies & debugging",
      "Auto-compaction & context management",
      "Persistent memory & online learning",
    ],
  },
  {
    icon: Search,
    category: "Tools",
    rules: [
      "Context7 + grep-mcp + web search + GitHub CLI",
      "Pilot CLI + Vexor search",
      "Playwright CLI (E2E browser testing)",
    ],
  },
  {
    icon: GitBranch,
    category: "Collaboration",
    rules: [
      "Team Vault asset sharing via sx",
      "Custom rules, commands & skills",
      "Shareable across teams via Git",
    ],
  },
  {
    icon: Cpu,
    category: "Language Standards",
    rules: [
      "Python — uv, pytest, ruff, basedpyright",
      "TypeScript — npm/pnpm, Jest, ESLint, Prettier",
      "Go — Modules, testing, formatting, error handling",
    ],
  },
  {
    icon: Layers,
    category: "Architecture Standards",
    rules: [
      "Frontend — Components, CSS, accessibility, responsive",
      "Backend — API design, data models, migrations",
      "Activated by file type — loaded only when needed",
    ],
  },
];

const mcpServers = [
  {
    icon: BookOpen,
    name: "lib-docs",
    desc: "Library documentation lookup — get API docs for any dependency",
  },
  {
    icon: Brain,
    name: "mem-search",
    desc: "Persistent memory search — recall context from past sessions",
  },
  {
    icon: Globe,
    name: "web-search",
    desc: "Web search via DuckDuckGo, Bing, and Exa",
  },
  {
    icon: Search,
    name: "grep-mcp",
    desc: "GitHub code search — find real-world usage patterns",
  },
  {
    icon: Globe,
    name: "web-fetch",
    desc: "Web page fetching — read documentation, APIs, references",
  },
];

const DeepDiveSection = () => {
  const [headerRef, headerInView] = useInView<HTMLDivElement>();
  const [hooksRef, hooksInView] = useInView<HTMLDivElement>();
  const [rulesRef, rulesInView] = useInView<HTMLDivElement>();
  const [mcpRef, mcpInView] = useInView<HTMLDivElement>();

  return (
    <section id="deep-dive" className="py-16 lg:py-24 px-4 sm:px-6 relative">
      <div className="max-w-6xl mx-auto">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        {/* Header */}
        <div
          ref={headerRef}
          className={`text-center mb-16 ${headerInView ? "animate-fade-in-up" : "opacity-0"}`}
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
            Under the Hood
          </h2>
          <p className="text-muted-foreground text-lg sm:text-xl max-w-3xl mx-auto">
            Pilot isn't a thin wrapper — it's a deeply engineered system with
            rules, hooks, standards, language servers, and MCP servers working
            together on every edit.
          </p>
        </div>

        {/* Hooks Pipeline */}
        <div
          ref={hooksRef}
          className={`mb-16 ${hooksInView ? "animate-fade-in-up" : "opacity-0"}`}
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-foreground">
                Hooks Pipeline
              </h3>
              <p className="text-sm text-muted-foreground">
                15 hooks across 6 lifecycle events — fire automatically at every
                stage
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {hooksPipeline.map((stage) => (
              <div
                key={stage.trigger}
                className={`rounded-2xl p-5 border ${stage.borderColor} bg-card/30 backdrop-blur-sm`}
              >
                <div className="mb-3">
                  <div
                    className={`${stage.bgColor} px-3 py-1.5 rounded-lg inline-flex items-center gap-2 w-fit mb-2`}
                  >
                    <Terminal className={`h-4 w-4 ${stage.color}`} />
                    <code className={`text-sm font-semibold ${stage.color}`}>
                      {stage.trigger}
                    </code>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stage.description}
                  </p>
                </div>
                <div className="space-y-1.5">
                  {stage.hooks.map((hook) => (
                    <div
                      key={hook}
                      className="flex items-start gap-2 text-xs text-muted-foreground"
                    >
                      <CheckCircle2
                        className={`h-3.5 w-3.5 ${stage.color} flex-shrink-0 mt-0.5`}
                      />
                      <span>{hook}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Context Preservation — the hooks working together */}
          <div className="mt-6 rounded-2xl p-5 border border-violet-400/20 bg-gradient-to-r from-violet-500/5 via-sky-500/5 to-violet-500/5 backdrop-blur-sm">
            <div className="flex items-start gap-4">
              <div className="w-9 h-9 bg-violet-400/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <RefreshCw className="h-4 w-4 text-violet-400" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground text-sm mb-1">
                  Seamless Context Preservation
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  These hooks form a closed loop. When compaction fires,{" "}
                  <span className="text-violet-400">PreCompact</span> captures
                  your active plan, task list, and key decisions to persistent
                  memory. <span className="text-sky-400">SessionStart</span>{" "}
                  restores everything afterward — work continues exactly where
                  it left off. No progress lost, no manual intervention.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Rules System */}
        <div
          ref={rulesRef}
          className={`mb-16 ${rulesInView ? "animate-fade-in-up" : "opacity-0"}`}
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Layers className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-foreground">
                Built-in Rules & Standards
              </h3>
              <p className="text-sm text-muted-foreground">
                Loaded every session — production-tested best practices and
                coding standards always in context
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rulesCategories.map((cat) => {
              const Icon = cat.icon;
              return (
                <div
                  key={cat.category}
                  className="rounded-2xl p-5 border border-border/50 bg-card/30 backdrop-blur-sm hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className="h-5 w-5 text-primary" />
                    <h4 className="font-semibold text-foreground text-sm">
                      {cat.category}
                    </h4>
                  </div>
                  <ul className="space-y-1.5">
                    {cat.rules.map((rule) => (
                      <li
                        key={rule}
                        className="text-xs text-muted-foreground flex items-start gap-1.5"
                      >
                        <span className="text-primary mt-0.5">&#x25B8;</span>
                        <span>{rule}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        {/* MCP Servers + LSP + Languages */}
        <div
          ref={mcpRef}
          className={`${mcpInView ? "animate-fade-in-up" : "opacity-0"}`}
        >
          <div className="grid md:grid-cols-2 gap-8">
            {/* MCP Servers */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Globe className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">
                    MCP Servers
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    External context, always available
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                {mcpServers.map((server) => {
                  const Icon = server.icon;
                  return (
                    <div
                      key={server.name}
                      className="flex items-start gap-3 rounded-xl p-3 border border-border/50 bg-card/30"
                    >
                      <Icon className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <code className="text-sm font-medium text-foreground">
                          {server.name}
                        </code>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {server.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* LSP + Languages */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Eye className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">
                    Language Servers
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Real-time diagnostics and go-to-definition
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="rounded-xl p-4 border border-border/50 bg-card/30">
                  <div className="flex items-center gap-2 mb-2">
                    <FileCode2 className="h-4 w-4 text-primary" />
                    <span className="font-medium text-foreground text-sm">
                      Python
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    basedpyright — strict type checking, auto-restart on crash
                  </p>
                </div>
                <div className="rounded-xl p-4 border border-border/50 bg-card/30">
                  <div className="flex items-center gap-2 mb-2">
                    <FileCode2 className="h-4 w-4 text-primary" />
                    <span className="font-medium text-foreground text-sm">
                      TypeScript
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    vtsls — full TypeScript support with Vue compatibility
                  </p>
                </div>
                <div className="rounded-xl p-4 border border-border/50 bg-card/30">
                  <div className="flex items-center gap-2 mb-2">
                    <FileCode2 className="h-4 w-4 text-primary" />
                    <span className="font-medium text-foreground text-sm">
                      Go
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    gopls — official Go language server, auto-restart on crash
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mt-3 pl-1">
                  Add your own language servers via{" "}
                  <code className="text-primary bg-primary/10 px-1 py-0.5 rounded">
                    .lsp.json
                  </code>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DeepDiveSection;

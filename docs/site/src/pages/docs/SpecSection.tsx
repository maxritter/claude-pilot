import {
  GitBranch,
  CheckCircle2,
  Search,
  Code2,
  Shield,
  ArrowRight,
  Wrench,
  Zap,
} from "lucide-react";
import { useInView } from "@/hooks/use-in-view";

const phases = [
  {
    name: "Plan",
    icon: Search,
    color: "text-sky-400",
    bgColor: "bg-sky-400/10",
    borderColor: "border-sky-400/30",
    steps: [
      "Explores entire codebase with semantic search (Vexor) to understand architecture",
      "Asks clarifying questions and presents design options before committing",
      "Writes detailed spec to docs/plans/ with scope, tasks, and definition of done",
      "Plan-verifier sub-agent independently validates completeness and alignment",
      "Auto-fixes any issues found by the verifier before presenting to you",
      "Waits for your approval — you can edit the plan directly before accepting",
    ],
  },
  {
    name: "Implement",
    icon: Code2,
    color: "text-primary",
    bgColor: "bg-primary/10",
    borderColor: "border-primary/30",
    steps: [
      "Creates an isolated git worktree on a dedicated branch (optional)",
      "Implements each task sequentially with strict TDD (RED → GREEN → REFACTOR)",
      "Quality hooks auto-lint, format, and type-check every file edit in real time",
      "Runs full test suite after each task to catch regressions early",
      "All tasks run in the main context with full access to hooks, rules, and MCP servers",
    ],
  },
  {
    name: "Verify",
    icon: Shield,
    color: "text-violet-400",
    bgColor: "bg-violet-400/10",
    borderColor: "border-violet-400/30",
    steps: [
      "Runs full test suite — unit, integration, and E2E via playwright-cli",
      "Type checking and linting across the entire modified codebase",
      "Executes the actual program to verify real-world behavior (not just tests)",
      "Three review sub-agents run in parallel: compliance, quality, and goal achievement",
      "Auto-fixes all findings, then re-verifies until clean",
      "Loops back to implementation if structural issues remain",
      "On success, shows diff summary and offers to squash merge to main branch",
    ],
  },
];

const workflowSteps = [
  "Discuss",
  "Plan",
  "Approve",
  "Implement",
  "Verify",
  "Done",
];

const SpecSection = () => {
  const [ref, inView] = useInView<HTMLDivElement>();

  return (
    <section id="spec" className="py-10 border-b border-border/50 scroll-mt-24">
      <div ref={ref} className={inView ? "animate-fade-in-up" : "opacity-0"}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <GitBranch className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">
              /spec — Spec-Driven Development
            </h2>
            <p className="text-sm text-muted-foreground">
              Plan, implement, and verify complex features with full automation
            </p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
          Best for complex features, refactoring tasks, or any work where you
          want to review a plan before implementation begins. The structured
          workflow prevents scope creep and ensures every task is tested and
          verified before being marked complete.
        </p>

        {/* Usage example */}
        <div className="bg-background/80 rounded-lg p-3 font-mono text-sm border border-border/50 text-muted-foreground mb-5">
          <div>
            <span className="text-primary">$</span> pilot
          </div>
          <div className="pl-2">
            <span className="text-primary">&gt;</span> /spec "Add user
            authentication with OAuth and JWT tokens"
          </div>
          <div className="pl-2">
            <span className="text-primary">&gt;</span> /spec "Migrate the REST
            API to GraphQL"
          </div>
          <div className="pl-2">
            <span className="text-primary">&gt;</span>{" "}
            <span className="text-amber-400">
              /spec "Fix the crash when deleting nodes with two children"
            </span>
            <span className="text-muted-foreground/60 text-xs ml-2">
              {/* bugfix auto-detected */}
            </span>
          </div>
        </div>

        {/* Workflow diagram */}
        <div className="rounded-xl p-4 border border-border/50 bg-card/30 mb-6">
          <div className="flex items-center gap-1.5 flex-wrap text-sm">
            {workflowSteps.map((step, i, arr) => (
              <span key={step} className="flex items-center gap-1.5">
                <span
                  className={`font-mono text-sm px-2 py-0.5 rounded ${
                    step === "Approve"
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-foreground"
                  }`}
                >
                  {step}
                </span>
                {i < arr.length - 1 && (
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </span>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            The only manual step is{" "}
            <span className="text-primary font-medium">Approve</span>.
            Everything else runs automatically. The Verify → Implement feedback
            loop repeats until all checks pass, then prompts for squash merge.
          </p>
        </div>

        {/* Spec Types */}
        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          <div className="rounded-xl p-4 border border-sky-400/30 bg-card/30">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 bg-sky-400/10 rounded-lg flex items-center justify-center">
                <Zap className="h-3.5 w-3.5 text-sky-400" />
              </div>
              <h3 className="font-semibold text-foreground text-sm">
                Feature Spec
              </h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed mb-3">
              Full exploration workflow for new functionality, refactoring, or
              any work where architecture decisions matter.
            </p>
            <div className="space-y-1.5">
              {[
                "Codebase exploration with Vexor semantic search",
                "Architecture design decisions via Q&A",
                "Full plan with scope, risks, and DoD",
                "Three verification agents (compliance, quality, goal)",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-2 text-xs text-muted-foreground"
                >
                  <CheckCircle2 className="h-3 w-3 text-sky-400 flex-shrink-0 mt-0.5" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl p-4 border border-amber-400/30 bg-card/30">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 bg-amber-400/10 rounded-lg flex items-center justify-center">
                <Wrench className="h-3.5 w-3.5 text-amber-400" />
              </div>
              <h3 className="font-semibold text-foreground text-sm">
                Bugfix Spec{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  auto-detected
                </span>
              </h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed mb-3">
              Lighter, property-aware flow for targeted fixes. Defines the bug
              precisely before touching any code.
            </p>
            <div className="space-y-1.5">
              {[
                "Bug Condition (C): exact broken state description",
                "Postcondition (P): what must be true after the fix",
                "Behavior Contract: Must Change / Must NOT Change",
                "Test-before-fix: bug test FAILS → preservation tests PASS → fix",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-2 text-xs text-muted-foreground"
                >
                  <CheckCircle2 className="h-3 w-3 text-amber-400 flex-shrink-0 mt-0.5" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Three phases */}
        <div className="space-y-4 mb-6">
          {phases.map((phase) => {
            const Icon = phase.icon;
            return (
              <div
                key={phase.name}
                className={`rounded-xl p-5 border ${phase.borderColor} bg-card/30`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className={`${phase.bgColor} w-8 h-8 rounded-lg flex items-center justify-center`}
                  >
                    <Icon className={`h-4 w-4 ${phase.color}`} />
                  </div>
                  <h3 className="font-semibold text-foreground">
                    {phase.name} Phase
                  </h3>
                </div>
                <div className="grid sm:grid-cols-2 gap-1.5">
                  {phase.steps.map((step) => (
                    <div
                      key={step}
                      className="flex items-start gap-2 text-xs text-muted-foreground"
                    >
                      <CheckCircle2
                        className={`h-3.5 w-3.5 ${phase.color} flex-shrink-0 mt-0.5`}
                      />
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Worktree isolation */}
        <div className="rounded-xl p-4 border border-primary/20 bg-primary/5">
          <div className="flex items-center gap-2 mb-2">
            <GitBranch className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-foreground text-sm">
              Worktree Isolation (Optional)
            </h3>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            When starting a{" "}
            <code className="text-primary bg-primary/10 px-1 py-0.5 rounded">
              /spec
            </code>{" "}
            task, you can choose to work in an isolated git worktree. All
            implementation happens on a dedicated branch —{" "}
            <code className="text-primary bg-primary/10 px-1 py-0.5 rounded">
              main
            </code>{" "}
            stays clean throughout. Pilot auto-stashes any uncommitted changes
            before creating the worktree and restores them after. After
            verification passes, choose to squash merge back. If the experiment
            doesn't work out, discard the worktree with no cleanup required.
          </p>
        </div>
      </div>
    </section>
  );
};

export default SpecSection;

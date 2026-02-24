import { Monitor, Bell, CheckCircle2 } from "lucide-react";
import { useInView } from "@/hooks/use-in-view";

const consoleViews = [
  {
    view: "Dashboard",
    icon: "🏠",
    desc: "Workspace status, active sessions, spec progress, git info, recent activity. Your real-time command center.",
  },
  {
    view: "Specifications",
    icon: "📋",
    desc: "All spec plans with task progress (checkboxes), phase tracking (PENDING/COMPLETE/VERIFIED), and iteration history.",
  },
  {
    view: "Memories",
    icon: "🧠",
    desc: "Browsable observations — decisions, discoveries, bugfixes — with type filters, search, and timeline view.",
  },
  {
    view: "Sessions",
    icon: "⚡",
    desc: "Active and past sessions with observation counts, duration, and the ability to browse session context.",
  },
  {
    view: "Usage",
    icon: "📊",
    desc: "Daily token costs, model routing breakdown (Opus vs Sonnet distribution), and usage trends over time.",
  },
  {
    view: "Vault",
    icon: "🔒",
    desc: "Shared team assets with version tracking — see what's installed, when it was updated, and what version.",
  },
  {
    view: "Settings",
    icon: "⚙️",
    desc: "Model selection per command and sub-agent (Sonnet 4.6 vs Opus 4.6), extended context toggle (1M tokens).",
  },
];

const notificationTypes = [
  "Plan requires your approval — review and respond in the terminal or via notification",
  "Spec phase completed — implementation done, verification starting",
  "Clarification needed — Claude is waiting for design decisions before proceeding",
  "Session ended — completion summary with observation count",
];

const ConsoleSection = () => {
  const [ref, inView] = useInView<HTMLDivElement>();

  return (
    <section
      id="console"
      className="py-10 border-b border-border/50 scroll-mt-24"
    >
      <div ref={ref} className={inView ? "animate-fade-in-up" : "opacity-0"}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <Monitor className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Pilot Shell Console</h2>
            <p className="text-sm text-muted-foreground">
              Local web dashboard at localhost:41777 — monitor and manage your
              sessions
            </p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
          The Console runs locally as a Bun/Express server with a React web UI.
          It's automatically started when you launch Pilot and stopped when all
          sessions close. All data — memories, sessions, usage — is stored in a
          local SQLite database. Nothing leaves your machine.
        </p>

        <div className="bg-background/80 rounded-lg p-3 font-mono text-sm border border-border/50 text-muted-foreground mb-5">
          <span className="text-primary">$</span> open http://localhost:41777
        </div>

        {/* 7 views */}
        <h3 className="font-semibold text-foreground text-sm mb-3">7 views</h3>
        <div className="grid sm:grid-cols-2 gap-2 mb-6">
          {consoleViews.map((item) => (
            <div
              key={item.view}
              className="rounded-xl p-3 border border-border/50 bg-card/30 flex items-start gap-3"
            >
              <span className="text-base flex-shrink-0">{item.icon}</span>
              <div>
                <h4 className="font-semibold text-foreground text-sm mb-0.5">
                  {item.view}
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Smart notifications */}
        <div className="rounded-xl p-4 border border-primary/20 bg-primary/5">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-foreground text-sm">
              Smart Notifications via SSE
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
            The Console sends real-time alerts via Server-Sent Events when
            Claude needs your input or a significant phase completes. You don't
            need to watch the terminal constantly — the Console notifies you.
          </p>
          <div className="space-y-1.5">
            {notificationTypes.map((n) => (
              <div
                key={n}
                className="flex items-start gap-2 text-xs text-muted-foreground"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-0.5" />
                <span>{n}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-xl p-3 border border-border/50 bg-card/30">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="text-primary font-medium">Settings tab:</span>{" "}
            Configure model selection per component — Planning (Opus),
            Implementation (Sonnet), Verification (Opus), each sub-agent
            independently. Enable the{" "}
            <span className="text-primary">Extended Context (1M)</span> toggle
            to use the 1M token context window across all models simultaneously.{" "}
            <span className="text-muted-foreground/60">
              Requires Max 20x or Enterprise subscription.
            </span>
          </p>
        </div>
      </div>
    </section>
  );
};

export default ConsoleSection;

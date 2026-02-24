import { useState } from "react";
import {
  Terminal,
  Check,
  Copy,
  RefreshCw,
  Trash2,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInView } from "@/hooks/use-in-view";

const installerSteps = [
  {
    step: 1,
    title: "Prerequisites",
    desc: "Checks Homebrew, Node.js, Python 3.12+, uv, git",
  },
  {
    step: 2,
    title: "Dependencies",
    desc: "Installs Vexor (semantic search), playwright-cli, Claude Code",
  },
  {
    step: 3,
    title: "Shell integration",
    desc: "Auto-configures bash, fish, and zsh with the pilot alias",
  },
  {
    step: 4,
    title: "Config & Claude files",
    desc: "Sets up .claude/ plugin — rules, commands, hooks, MCP servers",
  },
  {
    step: 5,
    title: "VS Code extensions",
    desc: "Installs recommended extensions for your language stack",
  },
  {
    step: 6,
    title: "Dev Container",
    desc: "Auto-setup with all tools pre-configured if devcontainer.json exists",
  },
  {
    step: 7,
    title: "Automated updater",
    desc: "Checks for updates on launch with release notes and one-key upgrade",
  },
  {
    step: 8,
    title: "Cross-platform",
    desc: "Works on macOS, Linux, Windows (WSL2)",
  },
];

const INSTALL_CMD =
  "curl -fsSL https://raw.githubusercontent.com/maxritter/pilot-shell/main/install.sh | bash";

const UNINSTALL_CMD =
  "curl -fsSL https://raw.githubusercontent.com/maxritter/pilot-shell/main/uninstall.sh | bash";

const InstallationSection = () => {
  const [ref, inView] = useInView<HTMLDivElement>();
  const [copiedInstall, setCopiedInstall] = useState(false);
  const [copiedUninstall, setCopiedUninstall] = useState(false);

  const copy = async (text: string, setter: (v: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text);
      setter(true);
      setTimeout(() => setter(false), 2000);
    } catch (_) {
      void _;
    }
  };

  return (
    <section
      id="installation"
      className="py-10 border-b border-border/50 scroll-mt-24"
    >
      <div ref={ref} className={inView ? "animate-fade-in-up" : "opacity-0"}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Installation</h2>
            <p className="text-sm text-muted-foreground">
              Works with any existing project — no scaffolding required
            </p>
          </div>
        </div>

        {/* Install command */}
        <div className="glass rounded-xl p-5 relative overflow-hidden glow-primary mb-6">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
          <div className="flex items-center gap-2 mb-3">
            <Terminal className="h-4 w-4 text-primary" />
            <span className="text-foreground font-medium text-sm">
              One-Command Installation
            </span>
          </div>
          <div className="bg-background/60 rounded-lg p-3 font-mono text-sm border border-border/50">
            <div className="flex items-center justify-between gap-3">
              <code className="text-muted-foreground text-xs break-all">
                <span className="text-primary">$</span> {INSTALL_CMD}
              </code>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => copy(INSTALL_CMD, setCopiedInstall)}
                className="flex-shrink-0 h-8 px-3"
              >
                {copiedInstall ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-green-500 mr-1.5" />
                    <span className="text-xs">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 mr-1.5" />
                    <span className="text-xs">Copy</span>
                  </>
                )}
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
            <code className="text-primary">cd</code> into your project folder
            first, then run this. After installation, run{" "}
            <code className="text-primary bg-primary/10 px-1 py-0.5 rounded">
              pilot
            </code>{" "}
            or{" "}
            <code className="text-primary bg-primary/10 px-1 py-0.5 rounded">
              ccp
            </code>{" "}
            to start. Pilot doesn't scaffold or restructure your code — it
            installs alongside your project and adapts to your conventions.
          </p>
        </div>

        {/* What the installer does */}
        <h3 className="font-semibold text-foreground text-sm mb-3">
          What the installer does — 8 steps with progress tracking and rollback
          on failure
        </h3>
        <div className="grid sm:grid-cols-2 gap-2 mb-6">
          {installerSteps.map((s) => (
            <div
              key={s.step}
              className="flex items-start gap-3 rounded-xl p-3 border border-border/50 bg-card/30"
            >
              <span className="w-5 h-5 bg-primary/10 text-primary rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                {s.step}
              </span>
              <div>
                <span className="text-sm font-medium text-foreground">
                  {s.title}
                </span>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Version pinning and Uninstall */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-xl p-4 border border-border/50 bg-card/30">
            <div className="flex items-center gap-2 mb-2">
              <RefreshCw className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-foreground text-sm">
                Install Specific Version
              </h3>
            </div>
            <div className="bg-background/80 rounded-lg p-3 font-mono text-xs border border-border/50 text-muted-foreground">
              <div>
                <span className="text-primary">$</span> export VERSION=6.9.3
              </div>
              <div>
                <span className="text-primary">$</span> curl -fsSL
                .../install.sh | bash
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              See{" "}
              <a
                href="https://github.com/maxritter/pilot-shell/releases"
                className="text-primary hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                releases
              </a>{" "}
              for all available versions. Useful when a specific version is
              known stable.
            </p>
          </div>

          <div className="rounded-xl p-4 border border-border/50 bg-card/30">
            <div className="flex items-center gap-2 mb-2">
              <Trash2 className="h-4 w-4 text-rose-400" />
              <h3 className="font-semibold text-foreground text-sm">
                Uninstall
              </h3>
            </div>
            <div className="bg-background/80 rounded-lg p-3 font-mono text-xs border border-border/50">
              <div className="flex items-center justify-between gap-2">
                <code className="text-muted-foreground text-xs">
                  curl -fsSL .../uninstall.sh | bash
                </code>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => copy(UNINSTALL_CMD, setCopiedUninstall)}
                  className="flex-shrink-0 h-7 px-2"
                >
                  {copiedUninstall ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Removes binary, plugin files, managed commands/rules, settings,
              and shell aliases. Your project's custom{" "}
              <code className="text-primary">.claude/</code> files are
              preserved.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default InstallationSection;

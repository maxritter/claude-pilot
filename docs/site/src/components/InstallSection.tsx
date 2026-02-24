import { useState } from "react";
import { Check, Copy, Terminal, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInView } from "@/hooks/use-in-view";

const InstallSection = () => {
  const [copied, setCopied] = useState(false);
  const [headerRef, headerInView] = useInView<HTMLDivElement>();
  const [codeRef, codeInView] = useInView<HTMLDivElement>();
  const installCommand =
    "curl -fsSL https://raw.githubusercontent.com/maxritter/pilot-shell/main/install.sh | bash";

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(installCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="installation" className="py-12 lg:py-16 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <div
          ref={headerRef}
          className={`text-center mb-8 animate-on-scroll ${headerInView ? "in-view" : ""}`}
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4">
            Getting Started
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
            Works with any existing project — no matter how complex.{" "}
            <code className="text-primary">cd</code> into your project folder,
            then run:
          </p>
        </div>

        {/* Install command */}
        <div
          ref={codeRef}
          className={`glass rounded-xl p-5 relative overflow-hidden glow-primary animate-on-scroll ${codeInView ? "in-view" : ""}`}
        >
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />

          <div className="flex items-center gap-2 mb-3">
            <Terminal className="h-4 w-4 text-primary" />
            <span className="text-foreground font-medium text-sm">
              One-Command Installation
            </span>
          </div>

          <div className="bg-background/60 rounded-lg p-3 font-mono text-sm border border-border/50">
            <div className="flex items-center justify-between gap-3">
              <code className="text-muted-foreground text-xs sm:text-sm break-all">
                <span className="text-primary">$</span> {installCommand}
              </code>
              <Button
                variant="secondary"
                size="sm"
                onClick={copyToClipboard}
                className="flex-shrink-0 h-8 px-3"
              >
                {copied ? (
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

          {/* After install note */}
          <div className="mt-4 pt-4 border-t border-border/50">
            <div className="flex items-start gap-3">
              <Rocket className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="text-foreground font-medium mb-1">
                  After installation:
                </p>
                <p className="text-muted-foreground text-xs">
                  Run{" "}
                  <code className="text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                    pilot
                  </code>{" "}
                  to launch, then{" "}
                  <code className="text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                    /sync
                  </code>{" "}
                  to load rules.{" "}
                  <code className="text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                    /spec
                  </code>{" "}
                  plans features,{" "}
                  <code className="text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                    /learn
                  </code>{" "}
                  extracts knowledge,{" "}
                  <code className="text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                    /vault
                  </code>{" "}
                  shares with your team.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default InstallSection;

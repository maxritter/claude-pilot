import { useState } from "react";
import { Check, Copy, Github, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Logo from "@/components/Logo";

const HeroSection = () => {
  const [copied, setCopied] = useState(false);
  const installCommand = "curl -fsSL https://raw.githubusercontent.com/maxritter/claude-codepro/main/install.sh | bash";

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(installCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const scrollToInstall = () => {
    document.getElementById("installation")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 right-0 w-64 h-64 bg-muted/20 rounded-full blur-3xl" />
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]" />
      </div>

      {/* Radial gradient overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,hsl(var(--background))_70%)]" />

      <div className="relative z-10 text-center max-w-4xl mx-auto">
        {/* Badge */}
        <div className="animate-fade-in mb-6">
          <Badge variant="outline" className="px-4 py-1.5 text-sm border-primary/50 text-primary">
            Professional Development Environment for Claude Code
          </Badge>
        </div>

        {/* Logo */}
        <div className="animate-fade-in animation-delay-100">
          <Logo variant="hero" />
        </div>

        {/* Subtitle */}
        <p className="text-muted-foreground text-base sm:text-lg md:text-xl max-w-2xl mx-auto mb-8 animate-fade-in animation-delay-200">
          Start shipping systematically with Spec-Driven Development, TDD, Semantic Search,
          Persistent Memory, Context Management, Quality Hooks, and Modular Rules System.
        </p>

        {/* Feature badges */}
        <div className="flex flex-wrap justify-center gap-2 mb-8 animate-fade-in animation-delay-300">
          <Badge variant="secondary" className="text-xs">Opus 4.5 Compatible</Badge>
          <Badge variant="secondary" className="text-xs">Modular Rules</Badge>
          <Badge variant="secondary" className="text-xs">Spec-Driven</Badge>
          <Badge variant="secondary" className="text-xs">TDD</Badge>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10 animate-fade-in animation-delay-400">
          <Button
            size="lg"
            onClick={scrollToInstall}
            className="w-full sm:w-auto bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
          >
            <ArrowDown className="mr-2 h-4 w-4" />
            Get Started
          </Button>
          <Button
            variant="outline"
            size="lg"
            asChild
            className="w-full sm:w-auto"
          >
            <a href="https://github.com/maxritter/claude-codepro" target="_blank" rel="noopener noreferrer">
              <Github className="mr-2 h-4 w-4" />
              View on GitHub
            </a>
          </Button>
        </div>

        {/* Install command box */}
        <div className="glass rounded-xl p-3 sm:p-4 w-full max-w-2xl mx-auto animate-fade-in animation-delay-500 glow-primary overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <code className="text-[10px] sm:text-sm text-muted-foreground font-mono truncate flex-1 text-left min-w-0">
              <span className="text-primary">$</span> {installCommand}
            </code>
            <Button
              variant="ghost"
              size="sm"
              onClick={copyToClipboard}
              className="flex-shrink-0 hover:bg-primary/10"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;

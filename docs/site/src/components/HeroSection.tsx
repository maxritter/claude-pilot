import { Github, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Logo from "@/components/Logo";

const HeroSection = () => {
  const scrollToInstall = () => {
    document.getElementById("installation")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="min-h-[70vh] flex flex-col items-center justify-center px-3 xs:px-4 sm:px-6 relative overflow-hidden pt-16 xs:pt-20 pb-4">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-48 xs:w-64 sm:w-96 h-48 xs:h-64 sm:h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-40 xs:w-56 sm:w-80 h-40 xs:h-56 sm:h-80 bg-primary/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 right-0 w-32 xs:w-48 sm:w-64 h-32 xs:h-48 sm:h-64 bg-muted/20 rounded-full blur-3xl" />
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear_gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]" />
      </div>

      {/* Radial gradient overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,hsl(var(--background))_70%)]" />

      <div className="relative z-10 text-center max-w-4xl mx-auto w-full">
        {/* Badge */}
        <div className="animate-fade-in mb-4 xs:mb-6">
          <Badge variant="outline" className="px-2 xs:px-3 sm:px-4 py-1 xs:py-1.5 text-[10px] xs:text-xs sm:text-sm border-primary/50 text-primary">
            <span className="hidden xs:inline">Claude Code, Done Right</span>
            <span className="xs:hidden">Done Right</span>
          </Badge>
        </div>

        {/* Logo */}
        <div className="animate-fade-in animation-delay-100">
          <Logo variant="hero" />
        </div>

        {/* Subtitle */}
        <div className="animate-fade-in animation-delay-200 mb-6 xs:mb-8 px-1">
          <p className="text-muted-foreground text-[11px] xs:text-xs sm:text-sm md:text-base lg:text-lg max-w-[90%] xs:max-w-xl sm:max-w-2xl mx-auto leading-relaxed">
            Claude is powerful but inconsistent. Pilot adds the structure it needs.
          </p>
          <p className="text-muted-foreground/70 text-[10px] xs:text-xs sm:text-sm md:text-base max-w-[90%] xs:max-w-xl sm:max-w-2xl mx-auto mt-2 leading-relaxed">
            Tests enforced. Context preserved. Quality automated.
          </p>
        </div>

        {/* Feature badges */}
        <div className="flex flex-wrap justify-center gap-1.5 xs:gap-2 mb-6 xs:mb-8 animate-fade-in animation-delay-300 px-2">
          <Badge variant="secondary" className="text-[10px] xs:text-xs">TDD Enforced</Badge>
          <Badge variant="secondary" className="text-[10px] xs:text-xs">Quality Hooks</Badge>
          <Badge variant="secondary" className="text-[10px] xs:text-xs">Spec-Driven</Badge>
          <Badge variant="secondary" className="text-[10px] xs:text-xs">Opus 4.5</Badge>
          <Badge variant="secondary" className="text-[10px] xs:text-xs">Persistent Memory</Badge>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col xs:flex-row items-center justify-center gap-2 xs:gap-3 sm:gap-4 animate-fade-in animation-delay-400 px-2">
          <Button
            size="lg"
            onClick={scrollToInstall}
            className="w-full xs:w-auto bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-sm xs:text-base"
          >
            <ArrowDown className="mr-1.5 xs:mr-2 h-3.5 w-3.5 xs:h-4 xs:w-4" />
            Get Started
          </Button>
          <Button
            variant="outline"
            size="lg"
            asChild
            className="w-full xs:w-auto text-sm xs:text-base border-primary/50 hover:bg-primary/10"
          >
            <a href="https://github.com/maxritter/claude-pilot" target="_blank" rel="noopener noreferrer">
              <Github className="mr-1.5 xs:mr-2 h-3.5 w-3.5 xs:h-4 xs:w-4" />
              View on GitHub
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;

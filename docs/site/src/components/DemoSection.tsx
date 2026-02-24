import { Play, GitBranch, TestTube, Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInView } from "@/hooks/use-in-view";

const highlights = [
  {
    icon: Play,
    title: "One-Shotted Features",
    description:
      "Each feature was built with a single /spec prompt — plan, implement, test, verify, merge — zero manual code edits.",
  },
  {
    icon: GitBranch,
    title: "Parallel Worktrees",
    description:
      "3 features built simultaneously in isolated git worktrees, each on its own branch, squash-merged after verification.",
  },
  {
    icon: TestTube,
    title: "Fully Verified",
    description:
      "Clean TypeScript, zero lint errors, E2E verified — every line planned, tested, and verified entirely by AI.",
  },
];

const DemoSection = () => {
  const [headerRef, headerInView] = useInView<HTMLDivElement>();
  const [videoRef, videoInView] = useInView<HTMLDivElement>();
  const [cardsRef, cardsInView] = useInView<HTMLDivElement>();

  return (
    <section id="demo" className="py-16 lg:py-24 px-4 sm:px-6 relative">
      <div className="max-w-6xl mx-auto">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        {/* Section Header */}
        <div
          ref={headerRef}
          className={`text-center mb-12 ${headerInView ? "animate-fade-in-up" : "opacity-0"}`}
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
            See It In Action
          </h2>
          <p className="text-muted-foreground text-lg sm:text-xl max-w-3xl mx-auto">
            A full-stack project — created from scratch, then extended with 3
            features in parallel. Every line of code planned, tested, and
            verified entirely by AI.
          </p>
        </div>

        {/* YouTube Embed */}
        <div
          ref={videoRef}
          className={`max-w-4xl mx-auto ${videoInView ? "animate-fade-in-up" : "opacity-0"}`}
        >
          <div className="relative rounded-2xl overflow-hidden border border-border/50 shadow-2xl shadow-primary/10">
            <div
              className="relative w-full"
              style={{ paddingBottom: "56.25%" }}
            >
              <iframe
                className="absolute inset-0 w-full h-full"
                src="https://www.youtube-nocookie.com/embed/S7faAK931NU?rel=0"
                title="Pilot Shell Demo — Full-Stack Project Built by AI"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </div>

          {/* Repo link */}
          <div className="mt-4 text-center">
            <Button variant="outline" size="sm" asChild>
              <a
                href="https://github.com/maxritter/pilot-shell-demo"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="mr-2 h-4 w-4" />
                Browse the demo repository
              </a>
            </Button>
          </div>
        </div>

        {/* Highlight Cards */}
        <div
          ref={cardsRef}
          className={`mt-10 grid md:grid-cols-3 gap-6 ${cardsInView ? "animate-fade-in-up" : "opacity-0"}`}
        >
          {highlights.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl p-5 border border-border/50 bg-card/30 backdrop-blur-sm hover:border-primary/30 transition-all duration-300"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-base font-semibold text-foreground">
                  {item.title}
                </h3>
              </div>
              <p className="text-muted-foreground text-xs leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default DemoSection;

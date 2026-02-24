import { GraduationCap, Building2, Lightbulb, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInView } from "@/hooks/use-in-view";

const offerings = [
  {
    icon: GraduationCap,
    title: "Agentic Engineering Workshops",
    description:
      "Hands-on training for development teams on Claude Code, Pilot Shell, and spec-driven AI development.",
  },
  {
    icon: Building2,
    title: "Enterprise Rollout",
    description:
      "Introduce Pilot Shell to your team and standardize AI-assisted development across the organization.",
  },
  {
    icon: Lightbulb,
    title: "Consulting",
    description:
      "Architecture reviews, workflow optimization, and best practices for AI-assisted development at scale.",
  },
];

const WorkshopsSection = () => {
  const [headerRef, headerInView] = useInView<HTMLDivElement>();
  const [cardsRef, cardsInView] = useInView<HTMLDivElement>();

  return (
    <section id="workshops" className="py-16 lg:py-24 px-4 sm:px-6 relative">
      <div className="max-w-6xl mx-auto">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        {/* Section Header */}
        <div
          ref={headerRef}
          className={`text-center mb-12 ${headerInView ? "animate-fade-in-up" : "opacity-0"}`}
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
            Workshops & Enterprise Adoption
          </h2>
          <p className="text-muted-foreground text-lg sm:text-xl max-w-3xl mx-auto">
            Pilot Shell is built by{" "}
            <a
              href="https://www.maxritter.net/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Max Ritter
            </a>
            , a senior IT freelancer and consultant from Germany. Max helps
            companies and enterprises adopt Claude Code and Pilot Shell for
            production-grade AI-assisted development.
          </p>
        </div>

        {/* Offering Cards */}
        <div
          ref={cardsRef}
          className={`grid md:grid-cols-3 gap-6 ${cardsInView ? "animate-fade-in-up" : "opacity-0"}`}
        >
          {offerings.map((item) => (
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

        {/* CTA */}
        <div
          className={`mt-10 text-center ${cardsInView ? "animate-fade-in-up animation-delay-200" : "opacity-0"}`}
        >
          <Button size="lg" asChild>
            <a href="mailto:mail@maxritter.net">
              <Mail className="mr-2 h-4 w-4" />
              Get in Touch
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default WorkshopsSection;

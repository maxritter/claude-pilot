import { HelpCircle } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useInView } from "@/hooks/use-in-view";

const faqItems = [
  {
    question: "Does Pilot send my code or data to external services?",
    answer:
      "No. All development data stays on your machine. Vector search (Vexor), embeddings, persistent memory (Pilot Console), and session state all run locally. Pilot does not operate any cloud backend or telemetry service. The only external communication is between Claude Code and Anthropic's API \u2014 using your own subscription or API key, exactly as it would without Pilot.",
  },
  {
    question: "Is Pilot enterprise-compliant for data privacy?",
    answer:
      "Yes. Since Pilot runs entirely locally and adds no additional external data flows beyond what Claude Code itself uses, it is compatible with enterprise data policies. Your source code, project files, and development context never leave your machine through Pilot. Enterprises using Claude Code with their own API key or Anthropic Enterprise subscription can add Pilot without changing their data compliance posture.",
  },
  {
    question: "What are the licenses of Pilot's dependencies?",
    answer:
      "All external tools and dependencies that Pilot installs and uses are open source with permissive licenses (MIT, Apache 2.0, BSD). This includes ruff, basedpyright, Prettier, ESLint, gofmt, uv, Vexor, playwright-cli, and all MCP servers. No copyleft or restrictive-licensed dependencies are introduced into your environment.",
  },
  {
    question: "Do I need a separate Anthropic subscription?",
    answer:
      "Yes. Pilot enhances Claude Code \u2014 it doesn't replace it. You need an active Claude subscription (Max, Team, or Enterprise) or an Anthropic API key. Pilot adds quality automation on top of whatever Claude Code access you already have.",
  },
  {
    question: "Does Pilot work with any programming language?",
    answer:
      "Pilot's quality hooks (auto-formatting, linting, type checking) currently support Python, TypeScript/JavaScript, and Go out of the box. TDD enforcement, spec-driven development, Endless Mode, persistent memory, and all rules and skills work with any language that Claude Code supports. You can add custom hooks for additional languages.",
  },
  {
    question: "Can I use Pilot on multiple projects?",
    answer:
      "Yes. Pilot installs once and works across all your projects. Each project can have its own rules, skills, and MCP servers in the .claude/ folder. Run /sync in each project to generate project-specific documentation and skills.",
  },
  {
    question: "Can I customize the rules and hooks?",
    answer:
      "Yes. All rules are markdown files you can edit, extend, or replace. Hooks are Python scripts you can modify. Skills are dynamically loaded and can be customized or created via /learn. Project-specific rules override global defaults. Use /vault to share customizations across your team.",
  },
];

const FAQSection = () => {
  const [headerRef, headerInView] = useInView<HTMLDivElement>();
  const [contentRef, contentInView] = useInView<HTMLDivElement>();

  return (
    <section id="faq" className="py-16 lg:py-24 px-4 sm:px-6 relative">
      <div className="max-w-3xl mx-auto">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        <div
          ref={headerRef}
          className={`text-center mb-12 ${headerInView ? "animate-fade-in-up" : "opacity-0"}`}
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <HelpCircle className="h-5 w-5 text-primary" />
            </div>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
            FAQ
          </h2>
          <p className="text-muted-foreground text-lg sm:text-xl max-w-2xl mx-auto">
            Common questions about Pilot, data privacy, and compatibility.
          </p>
        </div>

        <div
          ref={contentRef}
          className={`rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm overflow-hidden ${contentInView ? "animate-fade-in-up" : "opacity-0"}`}
        >
          <Accordion type="single" collapsible className="px-6">
            {faqItems.map((item, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="border-border/50"
              >
                <AccordionTrigger className="text-left text-foreground hover:text-primary hover:no-underline text-sm sm:text-base py-5">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm leading-relaxed">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;

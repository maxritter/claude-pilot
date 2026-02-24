import { HelpCircle } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useInView } from "@/hooks/use-in-view";

const faqItems = [
  {
    question: "Does Pilot Shell send my code or data to external services?",
    answer:
      "No code, files, prompts, project data, or personal information ever leaves your machine through Pilot Shell. All development tools \u2014 vector search, persistent memory, session state, and quality hooks \u2014 run entirely locally. Pilot Shell makes exactly three external calls, all for licensing only: (1) License validation \u2014 once every 24 hours, sends your license key and organization ID to api.polar.sh. (2) License activation \u2014 one-time, sends license key and a machine fingerprint to api.polar.sh. (3) Trial start \u2014 one-time, sends a hashed hardware fingerprint to pilot-shell.com to generate a 7-day trial key. That\u2019s the complete list. No OS info, no version strings, no analytics, no telemetry, no heartbeats. The validation result is cached locally, and Pilot Shell works fully offline for up to 7 days.",
  },
  {
    question: "Is Pilot Shell enterprise-compliant for data privacy?",
    answer:
      "Yes. Your source code, project files, and development context never leave your machine through Pilot Shell. The only external calls are license validation (daily, license key only) and one-time activation/trial start (machine fingerprint only). No OS info, no version strings, no analytics, no telemetry. Enterprises using Claude Code with their own API key or Anthropic Enterprise subscription can add Pilot Shell without changing their data compliance posture.",
  },
  {
    question: "What are the licenses of Pilot Shell's dependencies?",
    answer:
      "All external tools and dependencies that Pilot Shell installs and uses are open source with permissive licenses (MIT, Apache 2.0, BSD). This includes ruff, basedpyright, Prettier, ESLint, gofmt, uv, Vexor, playwright-cli, and all MCP servers. No copyleft or restrictive-licensed dependencies are introduced into your environment.",
  },
  {
    question: "Do I need a separate Anthropic subscription?",
    answer:
      "Yes. Pilot Shell enhances Claude Code \u2014 it doesn't replace it. You need an active Claude subscription \u2014 Max 5x or 20x for solo developers, or Team Premium for teams and companies. Using the Anthropic API directly is also possible but may lead to much higher costs. Pilot Shell adds quality automation on top of whatever Claude Code access you already have.",
  },
  {
    question: "Does Pilot Shell work with existing projects?",
    answer:
      "Yes \u2014 that's the primary use case. Pilot Shell doesn't scaffold or restructure your code. You install it, run /sync, and it explores your codebase to discover your tech stack, conventions, and patterns. From there, every session has full context about your project. The more complex and established your codebase, the more value Pilot Shell adds \u2014 quality hooks catch regressions, persistent memory preserves decisions across sessions, and /spec plans features against your real architecture.",
  },
  {
    question: "Does Pilot Shell work with any programming language?",
    answer:
      "Pilot Shell's quality hooks (auto-formatting, linting, type checking) currently support Python, TypeScript/JavaScript, and Go out of the box. TDD enforcement, spec-driven development, persistent memory, context preservation hooks, and all rules and standards work with any language that Claude Code supports. You can add custom hooks for additional languages.",
  },
  {
    question: "Can I use Pilot Shell on multiple projects?",
    answer:
      "Yes. Pilot Shell installs once and works across all your projects. Each project can have its own rules, standards, and MCP servers in the .claude/ folder. Run /sync in each project to generate project-specific documentation and standards.",
  },
  {
    question: "Can I add my own rules, commands, and skills?",
    answer:
      "Yes. Create your own in your project\u2019s .claude/ folder \u2014 rules, commands, and skills are all plain markdown files. Your project-level assets are loaded alongside Pilot Shell\u2019s built-in defaults and take precedence when they overlap. /sync auto-discovers your codebase patterns and generates project-specific rules for you. /learn extracts reusable knowledge from sessions into custom skills. Hooks can be extended for additional languages. Use /vault to share your custom assets across your team.",
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
            Common questions about Pilot Shell, data privacy, and compatibility.
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

import {
  Terminal,
  FileCode2,
  Plug2,
  ShieldCheck,
  Container
} from "lucide-react";
import { useInView } from "@/hooks/use-in-view";

interface InsideItem {
  icon: React.ElementType;
  title: string;
  items: string[];
}

const insideItems: InsideItem[] = [
  {
    icon: Terminal,
    title: "Slash Commands",
    items: [
      "/setup - Initialize project context and indexing",
      "/plan - Generate detailed specs from requirements",
      "/implement - Execute specs with TDD enforcement",
      "/verify - Run comprehensive verification checks",
    ],
  },
  {
    icon: FileCode2,
    title: "Modular Rules System",
    items: [
      "Auto-loaded from .claude/rules/*.md",
      "Standard rules for TDD, context, best practices",
      "Custom rules in .claude/rules/custom/",
      "Path-specific rules with YAML frontmatter",
    ],
  },
  {
    icon: Plug2,
    title: "MCP Servers",
    items: [
      "Claude Mem - Cross-session persistent memory",
      "Claude Context - Local semantic code search",
      "Tavily - Web search and mapping",
      "Ref - AI-powered code context retrieval",
      "MCP Funnel - Plug-in additional MCP servers",
    ],
  },
  {
    icon: ShieldCheck,
    title: "Quality Hooks",
    items: [
      "Qlty - Post-edit formatting and linting",
      "TDD Enforcer - Pre-edit test requirement",
      "Context Monitor - Usage warnings at 85%/95%",
      "Python Quality - uv, ruff, mypy, basedpyright",
    ],
  },
  {
    icon: Container,
    title: "Dev Container Setup",
    items: [
      "Isolated Linux environment",
      "Pre-configured tools and extensions",
      "Global Python tools and qlty installed",
      "Shell integration with ccp alias",
    ],
  },
];

const SectionHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <div className="text-center mb-12">
    <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4">
      {title}
    </h2>
    {subtitle && (
      <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
        {subtitle}
      </p>
    )}
  </div>
);

const WhatsInside = () => {
  const [headerRef, headerInView] = useInView<HTMLDivElement>();
  const [gridRef, gridInView] = useInView<HTMLDivElement>();

  return (
    <section id="features" className="py-20 lg:py-28 px-4 sm:px-6 bg-card/30 relative">
      <div className="max-w-6xl mx-auto">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        <div
          ref={headerRef}
          className={`animate-on-scroll ${headerInView ? "in-view" : ""}`}
        >
          <SectionHeader
            title="What's Inside"
            subtitle="Everything you need for professional AI-assisted development"
          />
        </div>

        <div
          ref={gridRef}
          className={`grid md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children ${gridInView ? "in-view" : ""}`}
        >
          {insideItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="glass rounded-2xl p-6 hover:border-primary/50 transition-all duration-300"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {item.title}
                  </h3>
                </div>
                <ul className="space-y-2">
                  {item.items.map((listItem, i) => (
                    <li key={i} className="text-muted-foreground text-sm flex items-start gap-2">
                      <span className="text-primary mt-1.5 text-xs">•</span>
                      <span>{listItem}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default WhatsInside;

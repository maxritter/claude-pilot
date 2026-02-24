import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, BookOpen, ChevronRight } from "lucide-react";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useActiveSection } from "@/hooks/use-active-section";

import PrerequisitesSection from "./docs/PrerequisitesSection";
import InstallationSection from "./docs/InstallationSection";
import SyncSection from "./docs/SyncSection";
import SpecSection from "./docs/SpecSection";
import QuickModeSection from "./docs/QuickModeSection";
import LearnSection from "./docs/LearnSection";
import VaultSection from "./docs/VaultSection";
import HooksSection from "./docs/HooksSection";
import ContextSection from "./docs/ContextSection";
import RulesSection from "./docs/RulesSection";
import McpServersSection from "./docs/McpServersSection";
import LanguageServersSection from "./docs/LanguageServersSection";
import ConsoleSection from "./docs/ConsoleSection";
import CliSection from "./docs/CliSection";
import ModelRoutingSection from "./docs/ModelRoutingSection";

const tocItems = [
  { id: "prerequisites", label: "Prerequisites" },
  { id: "installation", label: "Installation" },
  { id: "sync", label: "/sync — Codebase Sync" },
  { id: "spec", label: "/spec — Spec-Driven Dev" },
  { id: "quick-mode", label: "Quick Mode" },
  { id: "learn", label: "/learn — Online Learning" },
  { id: "vault", label: "/vault — Team Vault" },
  { id: "hooks", label: "Hooks Pipeline" },
  { id: "context-preservation", label: "Context Preservation" },
  { id: "rules", label: "Rules & Standards" },
  { id: "mcp-servers", label: "MCP Servers" },
  { id: "language-servers", label: "Language Servers" },
  { id: "console", label: "Pilot Shell Console" },
  { id: "cli", label: "Pilot CLI" },
  { id: "model-routing", label: "Smart Model Routing" },
];

const sectionIds = tocItems.map((item) => item.id);

const docsStructuredData = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  name: "Pilot Shell Documentation",
  description:
    "Complete technical reference for Pilot Shell — installation, commands, hooks pipeline, MCP servers, language servers, and the Pilot Shell Console.",
  url: "https://pilot-shell.com/docs",
  author: {
    "@type": "Person",
    name: "Max Ritter",
    url: "https://maxritter.net/",
  },
  publisher: {
    "@type": "Organization",
    name: "Pilot Shell",
    url: "https://pilot-shell.com",
  },
};

const TocList = ({
  activeId,
  onItemClick,
}: {
  activeId: string;
  onItemClick?: () => void;
}) => (
  <ul className="space-y-0.5">
    {tocItems.map((item) => (
      <li key={item.id}>
        <a
          href={`#${item.id}`}
          onClick={onItemClick}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
            activeId === item.id
              ? "bg-primary/10 text-primary font-medium"
              : "text-muted-foreground hover:text-foreground hover:bg-card/50"
          }`}
        >
          {activeId === item.id && (
            <ChevronRight className="h-3 w-3 flex-shrink-0" />
          )}
          <span className={activeId === item.id ? "" : "ml-5"}>
            {item.label}
          </span>
        </a>
      </li>
    ))}
  </ul>
);

const DocsPage = () => {
  const [sheetOpen, setSheetOpen] = useState(false);
  const activeId = useActiveSection(sectionIds);

  return (
    <>
      <SEO
        title="Documentation - Pilot Shell"
        description="Complete technical reference for Pilot Shell — installation, /sync, /spec, hooks pipeline, MCP servers, language servers, Pilot Shell Console, and CLI commands."
        keywords="Pilot Shell documentation, install Pilot Shell, spec-driven development, hooks pipeline, MCP servers, language servers, Pilot Shell Console, Claude Code enhancement"
        canonicalUrl="https://pilot-shell.com/docs"
        structuredData={docsStructuredData}
      />
      <NavBar />
      <main className="min-h-screen bg-background pt-24">
        {/* Hero */}
        <div className="border-b border-border/50 bg-card/20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
              <Link to="/" className="hover:text-primary transition-colors">
                Home
              </Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-foreground">Documentation</span>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0 mt-1">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
                  Documentation
                </h1>
                <p className="text-muted-foreground text-base sm:text-lg max-w-2xl">
                  Complete technical reference for Pilot Shell. Everything from
                  installation to hooks, MCP servers, and the full CLI.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile ToC toggle */}
        <div className="lg:hidden sticky top-16 z-30 bg-background/95 backdrop-blur border-b border-border/50 px-4 py-2">
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Menu className="h-4 w-4" />
                On this page
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72">
              <SheetHeader>
                <SheetTitle>Documentation</SheetTitle>
              </SheetHeader>
              <div className="mt-6 overflow-y-auto max-h-[calc(100vh-8rem)]">
                <TocList
                  activeId={activeId}
                  onItemClick={() => setSheetOpen(false)}
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Two-column layout */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 lg:py-12">
          <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-12 xl:grid-cols-[240px_1fr]">
            {/* Sidebar — desktop only */}
            <aside className="hidden lg:block">
              <div className="sticky top-24 max-h-[calc(100vh-6rem)] overflow-y-auto pr-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-3">
                  On this page
                </p>
                <TocList activeId={activeId} />
              </div>
            </aside>

            {/* Content */}
            <div className="min-w-0 space-y-0">
              <PrerequisitesSection />
              <InstallationSection />
              <SyncSection />
              <SpecSection />
              <QuickModeSection />
              <LearnSection />
              <VaultSection />
              <HooksSection />
              <ContextSection />
              <RulesSection />
              <McpServersSection />
              <LanguageServersSection />
              <ConsoleSection />
              <CliSection />
              <ModelRoutingSection />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default DocsPage;

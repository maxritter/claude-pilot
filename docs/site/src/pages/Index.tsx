import NavBar from "@/components/NavBar";
import HeroSection from "@/components/HeroSection";
import InstallSection from "@/components/InstallSection";
import ComparisonSection from "@/components/ComparisonSection";
import DemoSection from "@/components/DemoSection";
import AgentRoster from "@/components/AgentRoster";
import WorkflowSteps from "@/components/WorkflowSteps";
import DeploymentFlow from "@/components/DeploymentFlow";
import WhatsInside from "@/components/WhatsInside";
import TechStack from "@/components/TechStack";
import DeepDiveSection from "@/components/DeepDiveSection";

import PricingSection from "@/components/PricingSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import FAQSection from "@/components/FAQSection";
import WorkshopsSection from "@/components/WorkshopsSection";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";

const Index = () => {
  const websiteStructuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Pilot Shell",
    url: "https://pilot-shell.com",
    description:
      "Start a task, grab a coffee, come back to production-grade code. Tests enforced, context preserved, quality automated.",
    publisher: {
      "@type": "Organization",
      name: "Pilot Shell",
      url: "https://pilot-shell.com",
      logo: {
        "@type": "ImageObject",
        url: "https://pilot-shell.com/logo.png",
      },
      sameAs: ["https://github.com/maxritter/pilot-shell"],
    },
  };

  const breadcrumbStructuredData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://pilot-shell.com",
      },
    ],
  };

  const softwareStructuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Pilot Shell",
    description:
      "Start a task, grab a coffee, come back to production-grade code. Rules, automated hooks, coding standards, language servers, and MCP servers.",
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Linux, macOS, Windows",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    author: {
      "@type": "Person",
      name: "Max Ritter",
      url: "https://maxritter.net/",
    },
    license: "https://github.com/maxritter/pilot-shell/blob/main/LICENSE",
    url: "https://github.com/maxritter/pilot-shell",
    downloadUrl: "https://github.com/maxritter/pilot-shell",
  };

  return (
    <>
      <SEO
        title="Pilot Shell - Claude Code is powerful. Pilot makes it reliable."
        description="Start a task, grab a coffee, come back to production-grade code. Tests enforced, context preserved, quality automated."
        structuredData={[
          websiteStructuredData,
          breadcrumbStructuredData,
          softwareStructuredData,
        ]}
      />
      <NavBar />
      <main className="min-h-screen bg-background">
        <HeroSection />
        <InstallSection />
        <ComparisonSection />
        <DemoSection />
        <AgentRoster />
        <WorkflowSteps />
        <DeploymentFlow />
        <WhatsInside />
        <TechStack />
        <DeepDiveSection />
        <PricingSection />
        <TestimonialsSection />
        <FAQSection />
        <WorkshopsSection />
        <Footer />
      </main>
    </>
  );
};

export default Index;

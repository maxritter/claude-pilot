import NavBar from "@/components/NavBar";
import HeroSection from "@/components/HeroSection";
import InstallSection from "@/components/InstallSection";
import ComparisonSection from "@/components/ComparisonSection";
import AgentRoster from "@/components/AgentRoster";
import WorkflowSteps from "@/components/WorkflowSteps";
import DeploymentFlow from "@/components/DeploymentFlow";
import WhatsInside from "@/components/WhatsInside";
import TechStack from "@/components/TechStack";
import DeepDiveSection from "@/components/DeepDiveSection";
import QualifierSection from "@/components/QualifierSection";
import PricingSection from "@/components/PricingSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import FAQSection from "@/components/FAQSection";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";

const Index = () => {
  const websiteStructuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Claude Pilot",
    "url": "https://claude-pilot.com",
    "description": "Ship code you can actually trust. Pilot is your quality autopilot. Tests enforced, context preserved, quality automated.",
    "publisher": {
      "@type": "Organization",
      "name": "Claude Pilot",
      "url": "https://claude-pilot.com",
      "logo": {
        "@type": "ImageObject",
        "url": "https://claude-pilot.com/logo.png"
      },
      "sameAs": [
        "https://github.com/maxritter/claude-pilot"
      ]
    }
  };

  const breadcrumbStructuredData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://claude-pilot.com"
      }
    ]
  };

  const softwareStructuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Claude Pilot",
    "description": "Claude Code is powerful. Pilot makes it reliable. Rules, automated hooks, coding skills, language servers, and MCP servers. Tests enforced, context preserved, quality automated.",
    "applicationCategory": "DeveloperApplication",
    "operatingSystem": "Linux, macOS, Windows",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "author": {
      "@type": "Person",
      "name": "Max Ritter",
      "url": "https://maxritter.net/"
    },
    "license": "https://github.com/maxritter/claude-pilot/blob/main/LICENSE",
    "url": "https://github.com/maxritter/claude-pilot",
    "downloadUrl": "https://github.com/maxritter/claude-pilot"
  };

  return (
    <>
      <SEO
        title="Claude Pilot - Claude Code is powerful. Pilot makes it reliable."
        description="Ship code you can actually trust. Pilot is your quality autopilot. Rules, automated hooks, coding skills, language servers, and MCP servers. Tests enforced, context preserved, quality automated."
        structuredData={[websiteStructuredData, breadcrumbStructuredData, softwareStructuredData]}
      />
      <NavBar />
      <main className="min-h-screen bg-background">
        <HeroSection />
        <InstallSection />
        <ComparisonSection />
        <AgentRoster />
        <WorkflowSteps />
        <DeploymentFlow />
        <WhatsInside />
        <TechStack />
        <DeepDiveSection />
        <QualifierSection />
        <PricingSection />
        <TestimonialsSection />
        <FAQSection />
        <Footer />
      </main>
    </>
  );
};

export default Index;

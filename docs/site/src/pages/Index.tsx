import NavBar from "@/components/NavBar";
import HeroSection from "@/components/HeroSection";
import ComparisonSection from "@/components/ComparisonSection";
import WorkflowSteps from "@/components/WorkflowSteps";
import WhatsInside from "@/components/WhatsInside";
import InstallSection from "@/components/InstallSection";
import PricingSection from "@/components/PricingSection";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";

const Index = () => {
  const websiteStructuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Claude Pilot",
    "url": "https://www.claude-pilot.com",
    "description": "Claude Code, Done Right. Tests enforced, context preserved, quality automated.",
    "publisher": {
      "@type": "Organization",
      "name": "Claude Pilot",
      "url": "https://www.claude-pilot.com",
      "logo": {
        "@type": "ImageObject",
        "url": "https://storage.googleapis.com/gpt-engineer-file-uploads/qmjt5RyHpNP9GFnerZmcYYkrVd13/uploads/1761495399643-favicon.jpg"
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
        "item": "https://www.claude-pilot.com"
      }
    ]
  };

  const softwareStructuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Claude Pilot",
    "description": "Claude is powerful but inconsistent. Pilot adds the structure it needs. Tests enforced, context preserved, quality automated.",
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
    "license": "https://www.gnu.org/licenses/agpl-3.0",
    "url": "https://github.com/maxritter/claude-pilot",
    "downloadUrl": "https://github.com/maxritter/claude-pilot"
  };

  return (
    <>
      <SEO
        title="Claude Pilot - Claude Code, Done Right"
        description="Claude is powerful but inconsistent. Pilot adds the structure it needs. Tests enforced, context preserved, quality automated."
        structuredData={[websiteStructuredData, breadcrumbStructuredData, softwareStructuredData]}
      />
      <NavBar />
      <main className="min-h-screen bg-background">
        <HeroSection />
        <InstallSection />
        <WhatsInside />
        <ComparisonSection />
        <WorkflowSteps />
        <PricingSection />
        <Footer />
      </main>
    </>
  );
};

export default Index;

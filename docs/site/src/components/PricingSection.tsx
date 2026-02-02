import { ExternalLink, Check, Building2, Clock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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

const PricingSection = () => {
  return (
    <section id="pricing" className="py-12 lg:py-16 px-4 sm:px-6" aria-labelledby="pricing-heading">
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          title="Pricing"
          subtitle="Get instant access to best practices from daily production usage — a shortcut to state-of-the-art Claude Code development."
        />

        <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
          {/* Trial */}
          <Card className="glass p-6 sm:p-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-sky-400 to-transparent" />
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-sky-400/15 rounded-xl flex items-center justify-center">
                <Clock className="h-6 w-6 text-sky-400" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Trial</h3>
            </div>

            <ul className="space-y-3 mb-6">
              <li className="flex items-start gap-3">
                <Check className="h-5 w-5 text-sky-400 flex-shrink-0 mt-0.5" />
                <span className="text-muted-foreground text-sm">Full features for 7 days</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="h-5 w-5 text-sky-400 flex-shrink-0 mt-0.5" />
                <span className="text-muted-foreground text-sm">No credit card required</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="h-5 w-5 text-sky-400 flex-shrink-0 mt-0.5" />
                <span className="text-muted-foreground text-sm">Starts automatically on install</span>
              </li>
            </ul>

            <Button asChild variant="outline" className="w-full">
              <a href="#installation">
                Start Free Trial
              </a>
            </Button>
          </Card>

          {/* Standard */}
          <Card className="glass p-6 sm:p-8 relative overflow-hidden border-primary/50">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-primary/15 rounded-xl flex items-center justify-center">
                <Check className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Standard</h3>
            </div>

            <ul className="space-y-3 mb-6">
              <li className="flex items-start gap-3">
                <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-muted-foreground text-sm">All features included</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-muted-foreground text-sm">Latest learnings from daily usage</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-muted-foreground text-sm">Support via GitHub</span>
              </li>
            </ul>

            <Button asChild className="w-full">
              <a href="https://license.claude-pilot.com" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Subscribe
              </a>
            </Button>
          </Card>

          {/* Enterprise */}
          <Card className="glass p-6 sm:p-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-indigo-500/15 rounded-xl flex items-center justify-center">
                <Building2 className="h-6 w-6 text-indigo-500" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Enterprise</h3>
            </div>

            <ul className="space-y-3 mb-6">
              <li className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-indigo-500 flex-shrink-0 mt-0.5" />
                <span className="text-muted-foreground text-sm">Everything in Standard</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="h-5 w-5 text-indigo-500 flex-shrink-0 mt-0.5" />
                <span className="text-muted-foreground text-sm">Dedicated email support</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="h-5 w-5 text-indigo-500 flex-shrink-0 mt-0.5" />
                <span className="text-muted-foreground text-sm">Priority feature requests</span>
              </li>
            </ul>

            <Button asChild variant="outline" className="w-full border-indigo-500/50 hover:bg-indigo-500/10">
              <a href="https://license.claude-pilot.com" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Subscribe
              </a>
            </Button>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;

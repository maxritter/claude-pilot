import { Github, Linkedin, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import Logo from "./Logo";
import { smoothScrollTo } from "@/utils/smoothScroll";

const Footer = () => {
  return (
    <footer className="py-16 px-6 bg-background border-t border-border" role="contentinfo">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 mb-12">
          <div className="flex flex-col gap-3">
            <Logo variant="footer" />
            <p className="text-sm text-muted-foreground max-w-xs">
              Claude Code, Done Right
            </p>
          </div>

          <nav className="flex flex-col gap-3" aria-label="Footer navigation">
            <h3 className="text-sm font-medium">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => smoothScrollTo('features')}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Features
                </button>
              </li>
              <li>
                <button
                  onClick={() => smoothScrollTo('workflow')}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Workflow
                </button>
              </li>
              <li>
                <button
                  onClick={() => smoothScrollTo('installation')}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Installation
                </button>
              </li>
              <li>
                <button
                  onClick={() => smoothScrollTo('pricing')}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Pricing
                </button>
              </li>
            </ul>
          </nav>

          <div className="flex flex-col items-start gap-4">
            <h3 className="text-sm font-medium">Connect</h3>
            <p className="text-xs text-muted-foreground">Follow on LinkedIn for updates</p>
            <nav className="flex gap-3" aria-label="Social media links">
              <Button
                size="icon"
                variant="outline"
                className="border-primary/50 hover:bg-primary/10 transition-all duration-300 hover:scale-110 hover:border-primary"
                asChild
              >
                <a href="https://github.com/maxritter/claude-pilot" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
                  <Github className="h-5 w-5" />
                </a>
              </Button>
              <Button
                size="icon"
                variant="outline"
                className="border-primary/50 hover:bg-primary/10 transition-all duration-300 hover:scale-110 hover:border-primary"
                asChild
              >
                <a href="https://www.linkedin.com/in/rittermax/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                  <Linkedin className="h-5 w-5" />
                </a>
              </Button>
              <Button
                size="icon"
                variant="outline"
                className="border-primary/50 hover:bg-primary/10 transition-all duration-300 hover:scale-110 hover:border-primary"
                asChild
              >
                <a href="mailto:mail@maxritter.net" aria-label="Email">
                  <Mail className="h-5 w-5" />
                </a>
              </Button>
            </nav>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground text-center">
            © {new Date().getFullYear()}{" "}
            <a
              href="https://claude-pilot.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Claude Pilot
            </a>
            . Created by{" "}
            <a
              href="https://maxritter.net/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Max Ritter
            </a>
            .
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

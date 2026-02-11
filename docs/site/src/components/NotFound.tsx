import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import SEO from "@/components/SEO";

const NotFoundComponent = () => {
  const navigate = useNavigate();

  return (
    <>
      <SEO
        title="404 - Page Not Found | Claude Pilot Academy"
        description="The page you're looking for doesn't exist. Return to Claude Pilot Academy homepage."
        canonicalUrl="https://claude-pilot.com/404"
      />
      <main className="min-h-screen flex items-center justify-center px-6 bg-gradient-dark">
        <div className="text-center">
          <h1 className="text-9xl font-bold text-primary mb-4">404</h1>
          <h2 className="text-3xl font-semibold mb-4">Page Not Found</h2>
          <p className="text-xl text-muted-foreground mb-8">
            The page you're looking for doesn't exist.
          </p>
          <Button
            size="lg"
            onClick={() => navigate('/')}
            className="bg-gradient-primary hover:shadow-primary transition-all duration-300"
          >
            Return to Homepage
          </Button>
        </div>
      </main>
    </>
  );
};

export default NotFoundComponent;

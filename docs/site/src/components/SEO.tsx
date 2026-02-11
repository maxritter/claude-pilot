import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonicalUrl?: string;
  ogImage?: string;
  type?: string;
  structuredData?: object;
}

const SEO = ({
  title = "Claude Pilot - Claude Code is powerful. Pilot makes it reliable.",
  description = "Ship code you can actually trust. Pilot is your quality autopilot. Tests enforced, context preserved, quality automated.",
  keywords = "Claude Pilot, Claude Code, AI coding assistant, AI pair programming, TDD enforcement, Test-Driven Development, code quality automation, linting, formatting, type checking, spec-driven development, dev containers, VS Code, Cursor, Windsurf, Claude API, Anthropic, AI development tools, automated testing, code review, persistent memory, semantic code search",
  canonicalUrl = "https://claude-pilot.com",
  ogImage = "https://claude-pilot.com/logo.png",
  type = "website",
  structuredData
}: SEOProps) => {
  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{title}</title>
      <meta name="title" content={title} />
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />

      {/* Canonical URL */}
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content="Claude Pilot" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={canonicalUrl} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {/* Structured Data */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
};

export default SEO;

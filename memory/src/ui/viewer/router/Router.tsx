import React from 'react';
import { useRouter } from '../hooks/useRouter';

interface Route {
  path: string;
  component: React.ComponentType<any>;
}

interface RouterProps {
  routes: Route[];
  fallback?: React.ReactNode;
}

export function Router({ routes, fallback }: RouterProps) {
  const { path } = useRouter();

  // Find matching route
  for (const route of routes) {
    const match = matchPath(route.path, path);
    if (match) {
      const Component = route.component;
      return <Component {...match.params} />;
    }
  }

  return fallback ? <>{fallback}</> : null;
}

interface MatchResult {
  params: Record<string, string>;
}

function matchPath(pattern: string, path: string): MatchResult | null {
  // Exact match
  if (pattern === path) {
    return { params: {} };
  }

  // Pattern with params (e.g., /settings/:tab)
  const patternParts = pattern.split('/');
  const pathParts = path.split('/');

  if (patternParts.length !== pathParts.length) {
    return null;
  }

  const params: Record<string, string> = {};

  for (let i = 0; i < patternParts.length; i++) {
    const patternPart = patternParts[i];
    const pathPart = pathParts[i];

    if (patternPart.startsWith(':')) {
      params[patternPart.slice(1)] = pathPart;
    } else if (patternPart !== pathPart) {
      return null;
    }
  }

  return { params };
}

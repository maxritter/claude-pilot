import { useState, useEffect, useCallback } from 'react';

interface RouterState {
  path: string;
  params: Record<string, string>;
}

export function useRouter() {
  const [state, setState] = useState<RouterState>(() => parseHash(window.location.hash));

  useEffect(() => {
    const handleHashChange = () => {
      setState(parseHash(window.location.hash));
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = useCallback((path: string) => {
    window.location.hash = path;
  }, []);

  return {
    path: state.path,
    params: state.params,
    navigate,
  };
}

function parseHash(hash: string): RouterState {
  const path = hash.replace(/^#/, '') || '/';
  const params: Record<string, string> = {};

  // Parse query params if any
  const [pathname, search] = path.split('?');
  if (search) {
    const searchParams = new URLSearchParams(search);
    searchParams.forEach((value, key) => {
      params[key] = value;
    });
  }

  return { path: pathname, params };
}

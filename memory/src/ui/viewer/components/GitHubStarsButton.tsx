import React from 'react';
import { useGitHubStars } from '../hooks/useGitHubStars';
import { formatStarCount } from '../utils/formatNumber';
import { Icon } from './ui';

interface GitHubStarsButtonProps {
  username: string;
  repo: string;
  className?: string;
}

export function GitHubStarsButton({ username, repo, className = '' }: GitHubStarsButtonProps) {
  const { stars, isLoading, error } = useGitHubStars(username, repo);
  const repoUrl = `https://github.com/${username}/${repo}`;

  // Graceful degradation: on error, show just the icon (like original static link)
  if (error) {
    return (
      <a
        href={repoUrl}
        target="_blank"
        rel="noopener noreferrer"
        title="GitHub"
        className="icon-link"
      >
        <Icon icon="simple-icons:github" size={16} />
      </a>
    );
  }

  return (
    <a
      href={repoUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`github-stars-btn ${className}`}
      title={`Star us on GitHub${stars !== null ? ` (${stars.toLocaleString()} stars)` : ''}`}
    >
      <Icon icon="simple-icons:github" size={14} className="mr-1.5" />
      <Icon icon="lucide:star" size={12} className="mr-1" />
      <span className={isLoading ? 'stars-loading' : 'stars-count'}>
        {isLoading ? '...' : (stars !== null ? formatStarCount(stars) : '—')}
      </span>
    </a>
  );
}

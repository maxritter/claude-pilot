import { useState } from 'react';
import { Icon } from '../../components/ui';
import { LicenseBadge } from '../../components/LicenseBadge';
import { ActivationModal } from '../../components/ActivationModal';
import { useLicense } from '../../hooks/useLicense';
import { TopbarActions } from './TopbarActions';

interface TopbarProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onToggleLogs?: () => void;
}

export function Topbar({ theme, onToggleTheme, onToggleLogs }: TopbarProps) {
  const { license, isLoading, refetch } = useLicense();
  const [showActivation, setShowActivation] = useState(false);

  return (
    <header className="h-14 bg-base-100 border-b border-base-300/50 flex items-center justify-between px-6 gap-4">
      <div className="flex items-center gap-2 text-xs text-base-content/40">
        <Icon icon="lucide:plane" size={14} className="text-primary/60" />
        <span>
          &copy; {new Date().getFullYear()}{' '}
          <a
            href="https://pilot-shell.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary/70 hover:text-primary transition-colors"
          >
            Pilot Shell
          </a>
        </span>
        <span className="text-base-content/20">|</span>
        <span>
          Created by{' '}
          <a
            href="https://maxritter.net"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary/70 hover:text-primary transition-colors"
          >
            Max Ritter
          </a>
        </span>
        {!isLoading && license?.tier && <span className="text-base-content/20">|</span>}
        <LicenseBadge license={license} isLoading={isLoading} onClick={() => setShowActivation(true)} />
        {!isLoading && (!license || !license.tier || license.tier === 'trial' || license.isExpired) && (
          <>
            <span className="text-base-content/20">|</span>
            <a
              href="https://pilot-shell.com/#pricing"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary/70 hover:text-primary transition-colors"
            >
              Get a license
            </a>
            <button
              onClick={() => setShowActivation(true)}
              className="btn btn-primary btn-xs gap-1"
            >
              <Icon icon="lucide:key" size={12} />
              Activate
            </button>
          </>
        )}
      </div>
      <TopbarActions theme={theme} onToggleTheme={onToggleTheme} onToggleLogs={onToggleLogs} />
      <ActivationModal
        open={showActivation}
        onClose={() => setShowActivation(false)}
        onActivated={refetch}
      />
    </header>
  );
}

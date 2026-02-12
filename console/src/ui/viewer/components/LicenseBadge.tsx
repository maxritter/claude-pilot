import React from 'react';
import { Badge, Tooltip } from './ui';
import type { LicenseResponse } from '../../../services/worker/http/routes/LicenseRoutes.js';

interface LicenseBadgeProps {
  license: LicenseResponse | null;
  isLoading: boolean;
  onClick?: () => void;
}

const TIER_CONFIG: Record<string, { label: string; variant: 'primary' | 'accent' | 'warning' | 'error' }> = {
  solo: { label: 'Solo', variant: 'primary' },
  team: { label: 'Team', variant: 'accent' },
  trial: { label: 'Trial', variant: 'warning' },
  standard: { label: 'Solo', variant: 'primary' },
  enterprise: { label: 'Team', variant: 'accent' },
};

function buildTooltipText(license: LicenseResponse): string {
  const config = TIER_CONFIG[license.tier ?? ''];
  const parts: string[] = [config?.label ?? license.tier ?? 'Unknown'];

  if (license.email) {
    parts.push(license.email);
  }

  if (license.tier === 'trial' && license.daysRemaining != null) {
    parts.push(`${license.daysRemaining} days remaining`);
  }

  return parts.join(' · ');
}

function isActivatable(license: LicenseResponse): boolean {
  return license.isExpired || license.tier === 'trial';
}

export function LicenseBadge({ license, isLoading, onClick }: LicenseBadgeProps) {
  if (isLoading || !license || !license.tier) {
    return null;
  }

  const clickable = isActivatable(license) && !!onClick;
  const clickProps = clickable
    ? { onClick, role: 'button' as const, className: 'cursor-pointer' }
    : {};

  if (license.isExpired) {
    return (
      <Tooltip text={buildTooltipText(license)} position="bottom">
        <span {...clickProps}>
          <Badge variant="error" size="xs">Expired</Badge>
        </span>
      </Tooltip>
    );
  }

  const config = TIER_CONFIG[license.tier];
  if (!config) {
    return null;
  }

  let label = config.label;
  if (license.tier === 'trial' && license.daysRemaining != null) {
    label = `${config.label} · ${license.daysRemaining}d left`;
  }

  return (
    <Tooltip text={buildTooltipText(license)} position="bottom">
      <span {...clickProps}>
        <Badge variant={config.variant} size="xs">{label}</Badge>
      </span>
    </Tooltip>
  );
}

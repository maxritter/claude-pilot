import React from 'react';
import { Badge, Tooltip } from './ui';
import type { LicenseResponse } from '../../../services/worker/http/routes/LicenseRoutes.js';

interface LicenseBadgeProps {
  license: LicenseResponse | null;
  isLoading: boolean;
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

export function LicenseBadge({ license, isLoading }: LicenseBadgeProps) {
  if (isLoading || !license || !license.tier) {
    return null;
  }

  if (license.isExpired) {
    return (
      <Tooltip text={buildTooltipText(license)} position="bottom">
        <Badge variant="error" size="xs">Expired</Badge>
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
      <Badge variant={config.variant} size="xs">{label}</Badge>
    </Tooltip>
  );
}

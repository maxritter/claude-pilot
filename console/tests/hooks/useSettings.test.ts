/**
 * useSettings Hook Tests
 */

import { describe, it, expect } from 'bun:test';

describe('useSettings', () => {
  it('exports are defined', async () => {
    const mod = await import('../../src/ui/viewer/hooks/useSettings.js');
    expect(typeof mod.useSettings).toBe('function');
    expect(Array.isArray(mod.MODEL_CHOICES)).toBe(true);
    expect(typeof mod.MODEL_DISPLAY_NAMES).toBe('object');
    expect(typeof mod.DEFAULT_SETTINGS).toBe('object');
  });

  it('MODEL_CHOICES contains only base models', async () => {
    const { MODEL_CHOICES } = await import('../../src/ui/viewer/hooks/useSettings.js');
    expect(MODEL_CHOICES).toContain('sonnet');
    expect(MODEL_CHOICES).toContain('opus');
    expect(MODEL_CHOICES).not.toContain('sonnet[1m]');
    expect(MODEL_CHOICES).not.toContain('opus[1m]');
  });

  it('MODEL_DISPLAY_NAMES has friendly names for base models', async () => {
    const { MODEL_DISPLAY_NAMES } = await import('../../src/ui/viewer/hooks/useSettings.js');
    expect(MODEL_DISPLAY_NAMES['sonnet']).toContain('Sonnet');
    expect(MODEL_DISPLAY_NAMES['opus']).toContain('Opus');
  });

  it('DEFAULT_SETTINGS has opus as main model', async () => {
    const { DEFAULT_SETTINGS } = await import('../../src/ui/viewer/hooks/useSettings.js');
    expect(DEFAULT_SETTINGS.model).toBe('opus');
  });

  it('DEFAULT_SETTINGS has extendedContext disabled', async () => {
    const { DEFAULT_SETTINGS } = await import('../../src/ui/viewer/hooks/useSettings.js');
    expect(DEFAULT_SETTINGS.extendedContext).toBe(false);
  });

  it('DEFAULT_SETTINGS commands use base models only', async () => {
    const { DEFAULT_SETTINGS } = await import('../../src/ui/viewer/hooks/useSettings.js');
    for (const model of Object.values(DEFAULT_SETTINGS.commands)) {
      expect(model).not.toContain('[1m]');
    }
  });

  it('DEFAULT_SETTINGS has all seven commands', async () => {
    const { DEFAULT_SETTINGS } = await import('../../src/ui/viewer/hooks/useSettings.js');
    const expected = ['spec', 'spec-plan', 'spec-implement', 'spec-verify', 'vault', 'sync', 'learn'];
    for (const cmd of expected) {
      expect(DEFAULT_SETTINGS.commands[cmd]).toBeDefined();
    }
  });

  it('DEFAULT_SETTINGS has all four agents', async () => {
    const { DEFAULT_SETTINGS } = await import('../../src/ui/viewer/hooks/useSettings.js');
    const expected = ['plan-challenger', 'plan-verifier', 'spec-reviewer-compliance', 'spec-reviewer-quality'];
    for (const agent of expected) {
      expect(DEFAULT_SETTINGS.agents[agent]).toBeDefined();
    }
  });

  it('DEFAULT_SETTINGS agents use base models only', async () => {
    const { DEFAULT_SETTINGS } = await import('../../src/ui/viewer/hooks/useSettings.js');
    for (const model of Object.values(DEFAULT_SETTINGS.agents)) {
      expect(model).not.toContain('[1m]');
    }
  });

  it('source contains /api/settings endpoint', async () => {
    const { readFileSync } = await import('fs');
    const src = readFileSync(new URL('../../src/ui/viewer/hooks/useSettings.ts', import.meta.url), 'utf-8');
    expect(src).toContain('/api/settings');
    expect(src).toContain('PUT');
    expect(src).toContain('isLoading');
    expect(src).toContain('isDirty');
    expect(src).toContain('saved');
    expect(src).toContain('extendedContext');
    expect(src).toContain('updateExtendedContext');
  });
});

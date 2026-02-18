/**
 * useSettings Hook Tests
 */

import { describe, it, expect } from 'bun:test';

describe('useSettings', () => {
  it('exports are defined', async () => {
    const mod = await import('../../src/ui/viewer/hooks/useSettings.js');
    expect(typeof mod.useSettings).toBe('function');
    expect(Array.isArray(mod.MODEL_CHOICES_FULL)).toBe(true);
    expect(Array.isArray(mod.MODEL_CHOICES_AGENT)).toBe(true);
    expect(typeof mod.MODEL_DISPLAY_NAMES).toBe('object');
    expect(typeof mod.DEFAULT_SETTINGS).toBe('object');
  });

  it('MODEL_CHOICES_FULL contains all four models', async () => {
    const { MODEL_CHOICES_FULL } = await import('../../src/ui/viewer/hooks/useSettings.js');
    expect(MODEL_CHOICES_FULL).toContain('sonnet');
    expect(MODEL_CHOICES_FULL).toContain('sonnet[1m]');
    expect(MODEL_CHOICES_FULL).toContain('opus');
    expect(MODEL_CHOICES_FULL).toContain('opus[1m]');
  });

  it('MODEL_CHOICES_AGENT does not contain 1M variants', async () => {
    const { MODEL_CHOICES_AGENT } = await import('../../src/ui/viewer/hooks/useSettings.js');
    expect(MODEL_CHOICES_AGENT).not.toContain('sonnet[1m]');
    expect(MODEL_CHOICES_AGENT).not.toContain('opus[1m]');
    expect(MODEL_CHOICES_AGENT).toContain('sonnet');
    expect(MODEL_CHOICES_AGENT).toContain('opus');
  });

  it('MODEL_DISPLAY_NAMES has friendly names for all choices', async () => {
    const { MODEL_DISPLAY_NAMES } = await import('../../src/ui/viewer/hooks/useSettings.js');
    expect(MODEL_DISPLAY_NAMES['sonnet']).toContain('Sonnet');
    expect(MODEL_DISPLAY_NAMES['sonnet[1m]']).toContain('1M');
    expect(MODEL_DISPLAY_NAMES['opus']).toContain('Opus');
    expect(MODEL_DISPLAY_NAMES['opus[1m]']).toContain('1M');
  });

  it('DEFAULT_SETTINGS has sonnet as main model (no 1M)', async () => {
    const { DEFAULT_SETTINGS } = await import('../../src/ui/viewer/hooks/useSettings.js');
    expect(DEFAULT_SETTINGS.model).toBe('sonnet');
    expect(DEFAULT_SETTINGS.model).not.toContain('[1m]');
  });

  it('DEFAULT_SETTINGS commands have no 1M models', async () => {
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

  it('source contains /api/settings endpoint', async () => {
    const { readFileSync } = await import('fs');
    const src = readFileSync(new URL('../../src/ui/viewer/hooks/useSettings.ts', import.meta.url), 'utf-8');
    expect(src).toContain('/api/settings');
    expect(src).toContain('PUT');
    expect(src).toContain('isLoading');
    expect(src).toContain('isDirty');
    expect(src).toContain('saved');
  });
});

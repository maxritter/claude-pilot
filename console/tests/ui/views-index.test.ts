/**
 * Views index export tests
 */
import { describe, it, expect } from 'bun:test';

describe('views/index exports', () => {
  it('exports SettingsView', async () => {
    const mod = await import('../../src/ui/viewer/views/index.js');
    expect(typeof mod.SettingsView).toBe('function');
  });

  it('exports all existing views', async () => {
    const mod = await import('../../src/ui/viewer/views/index.js');
    expect(typeof mod.DashboardView).toBe('function');
    expect(typeof mod.MemoriesView).toBe('function');
    expect(typeof mod.SessionsView).toBe('function');
    expect(typeof mod.SpecView).toBe('function');
    expect(typeof mod.UsageView).toBe('function');
    expect(typeof mod.VaultView).toBe('function');
  });
});

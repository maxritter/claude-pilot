/**
 * SidebarNav tests — verify Settings nav item is present.
 */
import { describe, it, expect } from 'bun:test';

describe('SidebarNav', () => {
  it('SidebarNav is exported', async () => {
    const mod = await import('../../src/ui/viewer/layouts/Sidebar/SidebarNav.js');
    expect(typeof mod.SidebarNav).toBe('function');
  });

  it('source includes Settings nav item', async () => {
    const { readFileSync } = await import('fs');
    const src = readFileSync(new URL('../../src/ui/viewer/layouts/Sidebar/SidebarNav.tsx', import.meta.url), 'utf-8');
    expect(src).toContain("'#/settings'");
    expect(src).toContain('Settings');
    expect(src).toContain('lucide:settings');
  });
});

/**
 * App routing tests — verify Settings route is registered.
 */
import { describe, it, expect } from 'bun:test';

describe('App', () => {
  it('App is exported', async () => {
    const mod = await import('../../src/ui/viewer/App.js');
    expect(typeof mod.App).toBe('function');
  });

  it('App source includes /settings route', async () => {
    const { readFileSync } = await import('fs');
    const src = readFileSync(new URL('../../src/ui/viewer/App.tsx', import.meta.url), 'utf-8');
    expect(src).toContain("'/settings'");
    expect(src).toContain('SettingsView');
  });
});

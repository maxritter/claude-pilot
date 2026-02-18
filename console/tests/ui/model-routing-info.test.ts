/**
 * ModelRoutingInfo tests — verify dynamic model display and Settings link.
 */
import { describe, it, expect } from 'bun:test';

describe('ModelRoutingInfo', () => {
  it('is exported', async () => {
    const mod = await import('../../src/ui/viewer/views/Usage/ModelRoutingInfo.js');
    expect(typeof mod.ModelRoutingInfo).toBe('function');
  });

  it('source uses useSettings hook for dynamic model names', async () => {
    const { readFileSync } = await import('fs');
    const src = readFileSync(new URL('../../src/ui/viewer/views/Usage/ModelRoutingInfo.tsx', import.meta.url), 'utf-8');
    expect(src).toContain('useSettings');
    expect(src).toContain('MODEL_DISPLAY_NAMES');
    expect(src).toContain('DEFAULT_SETTINGS');
  });

  it('source contains link to Settings page', async () => {
    const { readFileSync } = await import('fs');
    const src = readFileSync(new URL('../../src/ui/viewer/views/Usage/ModelRoutingInfo.tsx', import.meta.url), 'utf-8');
    expect(src).toContain('#/settings');
  });

  it('source does not contain hardcoded model names', async () => {
    const { readFileSync } = await import('fs');
    const src = readFileSync(new URL('../../src/ui/viewer/views/Usage/ModelRoutingInfo.tsx', import.meta.url), 'utf-8');
    expect(src).not.toContain('Sonnet 4.5');
    expect(src).not.toContain('"Opus 4.6"');
  });

  it('source falls back gracefully when settings unavailable', async () => {
    const { readFileSync } = await import('fs');
    const src = readFileSync(new URL('../../src/ui/viewer/views/Usage/ModelRoutingInfo.tsx', import.meta.url), 'utf-8');
    expect(src).toContain('DEFAULT_SETTINGS');
    expect(src).toContain('??');
  });
});

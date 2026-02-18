/**
 * Tests for SettingsRoutes
 *
 * Tests GET /api/settings and PUT /api/settings behavior,
 * including defaults merging, validation, and atomic writes.
 */

import { describe, it, expect, mock, beforeEach, afterEach, spyOn } from 'bun:test';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { Request, Response } from 'express';

import { SettingsRoutes, DEFAULT_SETTINGS, MODEL_CHOICES } from '../src/services/worker/http/routes/SettingsRoutes.js';

const MINIMAL_CONFIG = JSON.stringify({ auto_update: true });

const FULL_CONFIG = JSON.stringify({
  auto_update: false,
  model: 'opus',
  extendedContext: false,
  commands: {
    spec: 'opus',
    'spec-plan': 'opus',
    'spec-implement': 'sonnet',
    'spec-verify': 'opus',
    vault: 'sonnet',
    sync: 'sonnet',
    learn: 'sonnet',
  },
  agents: {
    'plan-challenger': 'opus',
    'plan-verifier': 'sonnet',
    'spec-reviewer-compliance': 'sonnet',
    'spec-reviewer-quality': 'opus',
  },
});

function makeMockRes() {
  const ctx: { res: Partial<Response>; statusCode: number | null; body: any } = {
    res: {},
    statusCode: null,
    body: null,
  };

  ctx.res = {
    status: mock((code: number) => {
      ctx.statusCode = code;
      return ctx.res as Response;
    }) as unknown as Response['status'],
    json: mock((data: any) => {
      ctx.body = data;
      return ctx.res as Response;
    }) as unknown as Response['json'],
    setHeader: mock(() => ctx.res as Response) as unknown as Response['setHeader'],
  };

  return ctx;
}

describe('SettingsRoutes', () => {
  let tmpDir: string;
  let configPath: string;
  let routes: SettingsRoutes;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pilot-settings-test-'));
    configPath = path.join(tmpDir, 'config.json');
    routes = new SettingsRoutes(configPath);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    mock.restore();
  });

  describe('MODEL_CHOICES', () => {
    it('should contain only base models', () => {
      expect(MODEL_CHOICES).toContain('sonnet');
      expect(MODEL_CHOICES).toContain('opus');
      expect(MODEL_CHOICES).not.toContain('sonnet[1m]');
      expect(MODEL_CHOICES).not.toContain('opus[1m]');
    });
  });

  describe('DEFAULT_SETTINGS', () => {
    it('should have opus as default main model', () => {
      expect(DEFAULT_SETTINGS.model).toBe('opus');
    });

    it('should have extendedContext disabled by default', () => {
      expect(DEFAULT_SETTINGS.extendedContext).toBe(false);
    });

    it('should have no 1M models in defaults', () => {
      for (const model of Object.values(DEFAULT_SETTINGS.commands)) {
        expect(model).not.toContain('[1m]');
      }
      for (const model of Object.values(DEFAULT_SETTINGS.agents)) {
        expect(model).not.toContain('[1m]');
      }
    });
  });

  describe('GET /api/settings', () => {
    it('should return defaults when config file does not exist', async () => {
      const m = makeMockRes();
      const req: Partial<Request> = {};

      await (routes as any).handleGet(req as Request, m.res as Response);

      expect(m.body.model).toBe(DEFAULT_SETTINGS.model);
      expect(m.body.extendedContext).toBe(false);
      expect(m.body.commands).toBeDefined();
      expect(m.body.agents).toBeDefined();
    });

    it('should return defaults when config has no model keys', async () => {
      fs.writeFileSync(configPath, MINIMAL_CONFIG);

      const m = makeMockRes();
      const req: Partial<Request> = {};

      await (routes as any).handleGet(req as Request, m.res as Response);

      expect(m.body.model).toBe(DEFAULT_SETTINGS.model);
      expect(m.body.extendedContext).toBe(false);
      expect(m.body.commands['spec-plan']).toBe(DEFAULT_SETTINGS.commands['spec-plan']);
    });

    it('should return stored model when config exists', async () => {
      fs.writeFileSync(configPath, FULL_CONFIG);

      const m = makeMockRes();
      const req: Partial<Request> = {};

      await (routes as any).handleGet(req as Request, m.res as Response);

      expect(m.body.model).toBe('opus');
      expect(m.body.extendedContext).toBe(false);
    });

    it('should merge partial commands with defaults', async () => {
      fs.writeFileSync(configPath, JSON.stringify({ commands: { spec: 'opus' } }));

      const m = makeMockRes();
      const req: Partial<Request> = {};

      await (routes as any).handleGet(req as Request, m.res as Response);

      expect(m.body.commands.spec).toBe('opus');
      expect(m.body.commands['spec-plan']).toBe(DEFAULT_SETTINGS.commands['spec-plan']);
    });

    it('should strip legacy 1m model without enabling extendedContext', async () => {
      fs.writeFileSync(configPath, JSON.stringify({ model: 'opus[1m]' }));

      const m = makeMockRes();
      const req: Partial<Request> = {};

      await (routes as any).handleGet(req as Request, m.res as Response);

      expect(m.body.model).toBe('opus');
      expect(m.body.extendedContext).toBe(false);
    });

    it('should strip legacy 1m commands without enabling extendedContext', async () => {
      fs.writeFileSync(configPath, JSON.stringify({ model: 'opus', commands: { spec: 'sonnet[1m]' } }));

      const m = makeMockRes();
      const req: Partial<Request> = {};

      await (routes as any).handleGet(req as Request, m.res as Response);

      expect(m.body.commands.spec).toBe('sonnet');
      expect(m.body.extendedContext).toBe(false);
    });
  });

  describe('PUT /api/settings', () => {
    it('should update main model', async () => {
      const m = makeMockRes();
      const req: Partial<Request> = { body: { model: 'sonnet' } };

      await (routes as any).handlePut(req as Request, m.res as Response);

      const saved = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      expect(saved.model).toBe('sonnet');
      expect(m.body.model).toBe('sonnet');
    });

    it('should update extendedContext', async () => {
      const m = makeMockRes();
      const req: Partial<Request> = { body: { model: 'opus', extendedContext: true } };

      await (routes as any).handlePut(req as Request, m.res as Response);

      const saved = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      expect(saved.extendedContext).toBe(true);
      expect(m.body.extendedContext).toBe(true);
    });

    it('should preserve non-model keys when updating model', async () => {
      fs.writeFileSync(configPath, MINIMAL_CONFIG);

      const m = makeMockRes();
      const req: Partial<Request> = { body: { model: 'opus' } };

      await (routes as any).handlePut(req as Request, m.res as Response);

      const saved = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      expect(saved.auto_update).toBe(true);
      expect(saved.model).toBe('opus');
    });

    it('should support partial update — only model, leaving commands/agents unchanged', async () => {
      fs.writeFileSync(configPath, FULL_CONFIG);

      const m = makeMockRes();
      const req: Partial<Request> = { body: { model: 'sonnet' } };

      await (routes as any).handlePut(req as Request, m.res as Response);

      const saved = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      expect(saved.model).toBe('sonnet');
      expect(saved.commands.spec).toBe('opus');
    });

    it('should update commands', async () => {
      const m = makeMockRes();
      const req: Partial<Request> = {
        body: { commands: { spec: 'opus', 'spec-plan': 'opus' } },
      };

      await (routes as any).handlePut(req as Request, m.res as Response);

      const saved = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      expect(saved.commands.spec).toBe('opus');
      expect(saved.commands['spec-plan']).toBe('opus');
    });

    it('should update agents', async () => {
      const m = makeMockRes();
      const req: Partial<Request> = {
        body: { agents: { 'plan-verifier': 'opus' } },
      };

      await (routes as any).handlePut(req as Request, m.res as Response);

      const saved = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      expect(saved.agents['plan-verifier']).toBe('opus');
    });

    it('should return 400 for invalid main model', async () => {
      const m = makeMockRes();
      const req: Partial<Request> = { body: { model: 'gpt-4' } };

      await (routes as any).handlePut(req as Request, m.res as Response);

      expect(m.statusCode).toBe(400);
    });

    it('should return 400 for 1m model (use extendedContext instead)', async () => {
      const m = makeMockRes();
      const req: Partial<Request> = { body: { model: 'opus[1m]' } };

      await (routes as any).handlePut(req as Request, m.res as Response);

      expect(m.statusCode).toBe(400);
    });

    it('should return 400 for invalid extendedContext type', async () => {
      const m = makeMockRes();
      const req: Partial<Request> = { body: { extendedContext: 'yes' } };

      await (routes as any).handlePut(req as Request, m.res as Response);

      expect(m.statusCode).toBe(400);
    });

    it('should return 400 for 1m agent model', async () => {
      const m = makeMockRes();
      const req: Partial<Request> = {
        body: { agents: { 'plan-verifier': 'sonnet[1m]' } },
      };

      await (routes as any).handlePut(req as Request, m.res as Response);

      expect(m.statusCode).toBe(400);
    });

    it('should return 400 for invalid command model', async () => {
      const m = makeMockRes();
      const req: Partial<Request> = {
        body: { commands: { spec: 'bad-model' } },
      };

      await (routes as any).handlePut(req as Request, m.res as Response);

      expect(m.statusCode).toBe(400);
    });

    it('should write atomically using temp file', async () => {
      const writtenPaths: string[] = [];
      const origWriteFileSync = fs.writeFileSync as Function;
      const spy = spyOn(fs, 'writeFileSync').mockImplementation((p: fs.PathOrFileDescriptor, ...args: any[]) => {
        writtenPaths.push(String(p));
        return origWriteFileSync.call(fs, p, ...args);
      });

      const m = makeMockRes();
      const req: Partial<Request> = { body: { model: 'opus' } };
      await (routes as any).handlePut(req as Request, m.res as Response);

      spy.mockRestore();

      expect(writtenPaths.some(p => p.includes('.tmp'))).toBe(true);
      expect(fs.existsSync(configPath)).toBe(true);
    });

    it('should return updated settings in response', async () => {
      const m = makeMockRes();
      const req: Partial<Request> = { body: { model: 'opus', extendedContext: true } };

      await (routes as any).handlePut(req as Request, m.res as Response);

      expect(m.body.model).toBe('opus');
      expect(m.body.extendedContext).toBe(true);
    });
  });
});

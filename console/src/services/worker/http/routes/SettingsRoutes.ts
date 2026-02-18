/**
 * SettingsRoutes
 *
 * API endpoints for reading and writing model preferences from ~/.pilot/config.json.
 *
 * GET  /api/settings - Returns current model config with defaults merged in
 * PUT  /api/settings - Partial update of model preferences (merge, not replace)
 */

import express, { type Request, type Response } from "express";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { BaseRouteHandler } from "../BaseRouteHandler.js";
import { logger } from "../../../../utils/logger.js";

export const MODEL_CHOICES: readonly string[] = ["sonnet", "opus"];

export interface ModelSettings {
  model: string;
  extendedContext: boolean;
  commands: Record<string, string>;
  agents: Record<string, string>;
}

export const DEFAULT_SETTINGS: ModelSettings = {
  model: "opus",
  extendedContext: false,
  commands: {
    spec: "sonnet",
    "spec-plan": "opus",
    "spec-implement": "sonnet",
    "spec-verify": "opus",
    vault: "sonnet",
    sync: "sonnet",
    learn: "sonnet",
  },
  agents: {
    "plan-challenger": "sonnet",
    "plan-verifier": "sonnet",
    "spec-reviewer-compliance": "sonnet",
    "spec-reviewer-quality": "opus",
  },
};

export class SettingsRoutes extends BaseRouteHandler {
  private readonly configPath: string;

  constructor(configPath?: string) {
    super();
    this.configPath =
      configPath ?? path.join(os.homedir(), ".pilot", "config.json");
  }

  setupRoutes(app: express.Application): void {
    app.get("/api/settings", this.wrapHandler(this.handleGet.bind(this)));
    app.put("/api/settings", this.wrapHandler(this.handlePut.bind(this)));
  }

  private readConfig(): Record<string, unknown> {
    try {
      const raw = fs.readFileSync(this.configPath, "utf-8");
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  private static stripLegacy1m(model: string): string {
    return model.replace("[1m]", "");
  }

  private mergeWithDefaults(raw: Record<string, unknown>): ModelSettings {
    let mainModel =
      typeof raw.model === "string"
        ? SettingsRoutes.stripLegacy1m(raw.model)
        : DEFAULT_SETTINGS.model;
    if (!MODEL_CHOICES.includes(mainModel)) {
      mainModel = DEFAULT_SETTINGS.model;
    }

    const rawCommands = raw.commands;
    const mergedCommands: Record<string, string> = {
      ...DEFAULT_SETTINGS.commands,
    };
    if (
      rawCommands &&
      typeof rawCommands === "object" &&
      !Array.isArray(rawCommands)
    ) {
      for (const [k, v] of Object.entries(
        rawCommands as Record<string, unknown>,
      )) {
        if (typeof v === "string") {
          const stripped = SettingsRoutes.stripLegacy1m(v);
          if (MODEL_CHOICES.includes(stripped)) {
            mergedCommands[k] = stripped;
          }
        }
      }
    }

    const rawAgents = raw.agents;
    const mergedAgents: Record<string, string> = { ...DEFAULT_SETTINGS.agents };
    if (
      rawAgents &&
      typeof rawAgents === "object" &&
      !Array.isArray(rawAgents)
    ) {
      for (const [k, v] of Object.entries(
        rawAgents as Record<string, unknown>,
      )) {
        if (typeof v === "string") {
          const stripped = SettingsRoutes.stripLegacy1m(v);
          if (MODEL_CHOICES.includes(stripped)) {
            mergedAgents[k] = stripped;
          }
        }
      }
    }

    const extendedContext = raw.extendedContext === true;

    return {
      model: mainModel,
      extendedContext,
      commands: mergedCommands,
      agents: mergedAgents,
    };
  }

  private validateSettings(body: Record<string, unknown>): string | null {
    if (body.model !== undefined) {
      if (
        typeof body.model !== "string" ||
        !MODEL_CHOICES.includes(body.model)
      ) {
        return `Invalid model '${body.model}'; must be one of: ${MODEL_CHOICES.join(", ")}`;
      }
    }

    if (body.extendedContext !== undefined) {
      if (typeof body.extendedContext !== "boolean") {
        return "extendedContext must be a boolean";
      }
    }

    if (body.commands !== undefined) {
      if (typeof body.commands !== "object" || Array.isArray(body.commands)) {
        return "commands must be an object";
      }
      for (const [cmd, model] of Object.entries(
        body.commands as Record<string, unknown>,
      )) {
        if (typeof model !== "string" || !MODEL_CHOICES.includes(model)) {
          return `Invalid model '${model}' for command '${cmd}'; must be one of: ${MODEL_CHOICES.join(", ")}`;
        }
      }
    }

    if (body.agents !== undefined) {
      if (typeof body.agents !== "object" || Array.isArray(body.agents)) {
        return "agents must be an object";
      }
      for (const [agent, model] of Object.entries(
        body.agents as Record<string, unknown>,
      )) {
        if (typeof model !== "string" || !MODEL_CHOICES.includes(model)) {
          return `Invalid model '${model}' for agent '${agent}'; must be one of: ${MODEL_CHOICES.join(", ")}`;
        }
      }
    }

    return null;
  }

  private writeConfigAtomic(data: Record<string, unknown>): void {
    const dir = path.dirname(this.configPath);
    fs.mkdirSync(dir, { recursive: true });
    const tmpPath = this.configPath + ".tmp";
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), "utf-8");
    fs.renameSync(tmpPath, this.configPath);
  }

  async handleGet(_req: Request, res: Response): Promise<void> {
    const raw = this.readConfig();
    const settings = this.mergeWithDefaults(raw);
    res.json(settings);
  }

  async handlePut(req: Request, res: Response): Promise<void> {
    const body = req.body as Record<string, unknown>;

    const error = this.validateSettings(body);
    if (error) {
      this.badRequest(res, error);
      return;
    }

    const existing = this.readConfig();

    if (body.model !== undefined) {
      existing.model = body.model;
    }
    if (body.extendedContext !== undefined) {
      existing.extendedContext = body.extendedContext;
    }
    if (body.commands !== undefined) {
      const existingCommands =
        (existing.commands as Record<string, unknown>) ?? {};
      existing.commands = {
        ...existingCommands,
        ...(body.commands as Record<string, unknown>),
      };
    }
    if (body.agents !== undefined) {
      const existingAgents = (existing.agents as Record<string, unknown>) ?? {};
      existing.agents = {
        ...existingAgents,
        ...(body.agents as Record<string, unknown>),
      };
    }

    try {
      this.writeConfigAtomic(existing);
    } catch (err) {
      logger.error("HTTP", "Failed to write settings config", {}, err as Error);
      res.status(500).json({ error: "Failed to save settings" });
      return;
    }

    const updated = this.mergeWithDefaults(existing);
    res.json(updated);
  }
}

/**
 * License Routes
 *
 * Exposes license status via /api/license endpoint.
 * Calls `pilot status --json` and caches the result for 5 minutes.
 */

import express, { Request, Response } from "express";
import { spawnSync } from "child_process";
import { existsSync } from "fs";
import { homedir } from "os";
import { BaseRouteHandler } from "../BaseRouteHandler.js";

export interface LicenseResponse {
  valid: boolean;
  tier: string | null;
  email: string | null;
  daysRemaining: number | null;
  isExpired: boolean;
}

const FALLBACK_RESPONSE: LicenseResponse = {
  valid: false,
  tier: null,
  email: null,
  daysRemaining: null,
  isExpired: false,
};

const CACHE_TTL_MS = 5 * 60 * 1000;

export class LicenseRoutes extends BaseRouteHandler {
  private cache: { data: LicenseResponse; expiresAt: number } | null = null;

  setupRoutes(app: express.Application): void {
    app.get("/api/license", this.handleGetLicense.bind(this));
  }

  private handleGetLicense = this.wrapHandler((_req: Request, res: Response): void => {
    res.json(this.getLicenseInfo());
  });

  getLicenseInfo(): LicenseResponse {
    if (this.cache && Date.now() < this.cache.expiresAt) {
      return this.cache.data;
    }

    const result = this.fetchLicenseFromCLI();
    this.cache = { data: result, expiresAt: Date.now() + CACHE_TTL_MS };
    return result;
  }

  private fetchLicenseFromCLI(): LicenseResponse {
    const pilotPath = `${homedir()}/.pilot/bin/pilot`;

    if (!existsSync(pilotPath)) {
      return { ...FALLBACK_RESPONSE };
    }

    try {
      const proc = spawnSync(pilotPath, ["status", "--json"], {
        stdio: "pipe",
        timeout: 5000,
      });

      const stdout = proc.stdout?.toString().trim();
      if (!stdout) {
        return { ...FALLBACK_RESPONSE };
      }

      const data = JSON.parse(stdout);

      if (data.success) {
        return {
          valid: true,
          tier: data.tier ?? null,
          email: data.email ?? null,
          daysRemaining: data.days_remaining ?? null,
          isExpired: false,
        };
      }

      if (data.error === "No license found") {
        return { ...FALLBACK_RESPONSE };
      }

      return {
        valid: false,
        tier: data.tier ?? null,
        email: data.email ?? null,
        daysRemaining: data.days_remaining ?? null,
        isExpired: true,
      };
    } catch {
      return { ...FALLBACK_RESPONSE };
    }
  }
}

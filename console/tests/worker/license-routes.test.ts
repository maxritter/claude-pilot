/**
 * Tests for LicenseRoutes
 *
 * Tests the /api/license endpoint with mocked spawnSync calls.
 * Covers: valid license, expired trial, no license, missing binary.
 */
import { describe, it, expect, mock, beforeEach } from "bun:test";

const mockSpawnSync = mock(() => ({
  status: 0,
  stdout: Buffer.from(""),
  stderr: Buffer.from(""),
}));

mock.module("child_process", () => ({
  spawnSync: mockSpawnSync,
}));

const mockExistsSync = mock(() => true);
mock.module("fs", () => ({
  existsSync: mockExistsSync,
}));

import { LicenseRoutes } from "../../src/services/worker/http/routes/LicenseRoutes.js";

describe("LicenseRoutes", () => {
  let routes: LicenseRoutes;

  beforeEach(() => {
    routes = new LicenseRoutes();
    mockSpawnSync.mockReset();
    mockExistsSync.mockReset();
    mockExistsSync.mockReturnValue(true);
  });

  describe("route setup", () => {
    it("should register GET /api/license", () => {
      const registeredRoutes: string[] = [];
      const mockApp = {
        get: (path: string) => registeredRoutes.push(`GET ${path}`),
      };

      routes.setupRoutes(mockApp as any);

      expect(registeredRoutes).toContain("GET /api/license");
    });
  });

  describe("getLicenseInfo", () => {
    it("should return valid license for successful pilot status", () => {
      const cliOutput = JSON.stringify({
        success: true,
        tier: "solo",
        email: "user@example.com",
        days_remaining: null,
        created_at: "2026-01-01",
        expires_at: null,
      });

      mockSpawnSync.mockReturnValue({
        status: 0,
        stdout: Buffer.from(cliOutput),
        stderr: Buffer.from(""),
      });

      const result = routes.getLicenseInfo();

      expect(result).toEqual({
        valid: true,
        tier: "solo",
        email: "user@example.com",
        daysRemaining: null,
        isExpired: false,
      });
    });

    it("should return expired trial info on exit code 1 with trial expired error", () => {
      const cliOutput = JSON.stringify({
        success: false,
        error: "Trial expired",
        tier: "trial",
        email: "trial@example.com",
        created_at: "2026-01-01",
        expires_at: "2026-01-15",
      });

      mockSpawnSync.mockReturnValue({
        status: 1,
        stdout: Buffer.from(cliOutput),
        stderr: Buffer.from(""),
      });

      const result = routes.getLicenseInfo();

      expect(result).toEqual({
        valid: false,
        tier: "trial",
        email: "trial@example.com",
        daysRemaining: null,
        isExpired: true,
      });
    });

    it("should return null tier when no license found", () => {
      const cliOutput = JSON.stringify({
        success: false,
        error: "No license found",
      });

      mockSpawnSync.mockReturnValue({
        status: 1,
        stdout: Buffer.from(cliOutput),
        stderr: Buffer.from(""),
      });

      const result = routes.getLicenseInfo();

      expect(result).toEqual({
        valid: false,
        tier: null,
        email: null,
        daysRemaining: null,
        isExpired: false,
      });
    });

    it("should return fallback when pilot binary not found", () => {
      mockExistsSync.mockReturnValue(false);

      const result = routes.getLicenseInfo();

      expect(result).toEqual({
        valid: false,
        tier: null,
        email: null,
        daysRemaining: null,
        isExpired: false,
      });
      expect(mockSpawnSync).not.toHaveBeenCalled();
    });

    it("should return fallback when spawnSync throws", () => {
      mockSpawnSync.mockImplementation(() => {
        throw new Error("Command failed");
      });

      const result = routes.getLicenseInfo();

      expect(result).toEqual({
        valid: false,
        tier: null,
        email: null,
        daysRemaining: null,
        isExpired: false,
      });
    });

    it("should return days_remaining for trial tier", () => {
      const cliOutput = JSON.stringify({
        success: true,
        tier: "trial",
        email: "trial@example.com",
        days_remaining: 7,
      });

      mockSpawnSync.mockReturnValue({
        status: 0,
        stdout: Buffer.from(cliOutput),
        stderr: Buffer.from(""),
      });

      const result = routes.getLicenseInfo();

      expect(result).toEqual({
        valid: true,
        tier: "trial",
        email: "trial@example.com",
        daysRemaining: 7,
        isExpired: false,
      });
    });

    it("should cache results for 5 minutes", () => {
      const cliOutput = JSON.stringify({
        success: true,
        tier: "solo",
        email: "user@example.com",
        days_remaining: null,
      });

      mockSpawnSync.mockReturnValue({
        status: 0,
        stdout: Buffer.from(cliOutput),
        stderr: Buffer.from(""),
      });

      routes.getLicenseInfo();
      routes.getLicenseInfo();

      expect(mockSpawnSync).toHaveBeenCalledTimes(1);
    });
  });
});

/**
 * Tests for ChromaConnectionManager persistent venv management.
 * Verifies: venv creation, marker file, fallback chain, cross-platform paths.
 */

import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";
import { ChromaConnectionManager } from "../../../../src/services/sync/ChromaConnectionManager.js";
import fs from "fs";
import os from "os";
import path from "path";

mock.module("@modelcontextprotocol/sdk/client/index.js", () => ({
  Client: class MockClient {
    connect = mock(async () => {});
    close = mock(async () => {});
    callTool = mock(async () => ({ content: [{ text: '{}' }] }));
  },
}));

mock.module("@modelcontextprotocol/sdk/client/stdio.js", () => ({
  StdioClientTransport: class MockTransport {
    close = mock(async () => {});
  },
}));

const VENV_DIR = path.join(os.homedir(), ".pilot/memory/chroma-venv");
const MARKER_FILE = path.join(VENV_DIR, ".pilot-installed");

describe("ChromaConnectionManager venv", () => {
  let spawnSyncResults: Map<string, any>;

  beforeEach(() => {
    spawnSyncResults = new Map();

    spawnSyncResults.set("uvx--version", { status: 1 });
    spawnSyncResults.set("python3.12-cimport chroma_mcp", { status: 1 });
  });

  describe("ensureVenv", () => {
    it("should create venv and install chroma-mcp when marker missing", async () => {
      const manager = new ChromaConnectionManager("test");

      const cmds: string[][] = [];

      mock.module("child_process", () => ({
        spawnSync: (cmd: string, args: string[], _opts?: any) => {
          cmds.push([cmd, ...args]);

          if (cmd === "uv" && args[0] === "venv") {
            return { status: 0, stdout: "", stderr: "" };
          }
          if (cmd === "uv" && args[0] === "pip") {
            return { status: 0, stdout: "", stderr: "" };
          }
          if (args.length === 0 || (args.length === 1 && args[0] === "--version")) {
            return { status: 0, stdout: "1.0.0", stderr: "" };
          }
          return { status: 1, stdout: "", stderr: "" };
        },
        execSync: () => "",
      }));

      const options = await manager.getWorkingTransportOptions();

      const isWindows = process.platform === "win32";
      const binDir = isWindows ? "Scripts" : "bin";
      const expectedCmd = path.join(VENV_DIR, binDir, isWindows ? "chroma-mcp.exe" : "chroma-mcp");

      expect(options.command).toBe(expectedCmd);
    });

    it("should skip venv creation when marker file exists", async () => {
      const manager = new ChromaConnectionManager("test");
      const cmds: string[][] = [];

      const markerDir = path.dirname(MARKER_FILE);
      const markerExisted = fs.existsSync(MARKER_FILE);
      if (!fs.existsSync(markerDir)) {
        fs.mkdirSync(markerDir, { recursive: true });
      }
      fs.writeFileSync(MARKER_FILE, "chroma-mcp");

      try {
        mock.module("child_process", () => ({
          spawnSync: (cmd: string, args: string[], _opts?: any) => {
            cmds.push([cmd, ...args]);

            const isWin = process.platform === "win32";
            const binDir = isWin ? "Scripts" : "bin";
            const chromaBin = path.join(VENV_DIR, binDir, isWin ? "chroma-mcp.exe" : "chroma-mcp");
            if (cmd === chromaBin) {
              return { status: 0, stdout: "1.0.0", stderr: "" };
            }
            return { status: 1, stdout: "", stderr: "" };
          },
          execSync: () => "",
        }));

        const options = await manager.getWorkingTransportOptions();

        const venvCmds = cmds.filter(c => c[0] === "uv" && c[1] === "venv");
        expect(venvCmds.length).toBe(0);
      } finally {
        if (!markerExisted && fs.existsSync(MARKER_FILE)) {
          fs.unlinkSync(MARKER_FILE);
        }
      }
    });

    it("should fall back to uvx when venv creation fails", async () => {
      const manager = new ChromaConnectionManager("test");

      mock.module("child_process", () => ({
        spawnSync: (cmd: string, args: string[], _opts?: any) => {
          const isWin = process.platform === "win32";
          const binDir = isWin ? "Scripts" : "bin";
          const chromaBin = path.join(VENV_DIR, binDir, isWin ? "chroma-mcp.exe" : "chroma-mcp");
          if (cmd === chromaBin) {
            return { status: 1, stdout: "", stderr: "not found" };
          }
          if (cmd === "uv" && args[0] === "venv") {
            return { status: 1, stdout: "", stderr: "uv not found" };
          }
          if (cmd === "uvx" && args[0] === "--version") {
            return { status: 0, stdout: "1.0.0", stderr: "" };
          }
          return { status: 1, stdout: "", stderr: "" };
        },
        execSync: () => "",
      }));

      if (fs.existsSync(MARKER_FILE)) {
        fs.unlinkSync(MARKER_FILE);
      }

      const options = await manager.getWorkingTransportOptions();

      expect(options.command).toBe("uvx");
    });
  });

  describe("cross-platform paths", () => {
    it("should use bin/ directory on Unix", () => {
      if (process.platform === "win32") return;

      const binDir = "bin";
      const expectedBin = path.join(VENV_DIR, binDir, "chroma-mcp");
      expect(expectedBin).toContain("/bin/chroma-mcp");
    });

    it("should use Scripts/ directory on Windows", () => {
      const binDir = "Scripts";
      const expectedBin = path.join(VENV_DIR, binDir, "chroma-mcp.exe");
      expect(expectedBin).toContain("Scripts");
      expect(expectedBin).toContain("chroma-mcp.exe");
    });
  });
});

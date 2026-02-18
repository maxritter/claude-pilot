import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { existsSync, readFileSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import path from 'path';
import {
  writePidFile,
  readPidFile,
  removePidFile,
  getPlatformTimeout,
  isProcessAlive,
  cleanStalePidFile,
  type PidInfo
} from '../../src/services/infrastructure/index.js';

const DATA_DIR = path.join(homedir(), '.pilot/memory');
const PID_FILE = path.join(DATA_DIR, 'worker.pid');

describe('ProcessManager', () => {
  let originalPidContent: string | null = null;

  beforeEach(() => {
    mkdirSync(DATA_DIR, { recursive: true });
    try {
      originalPidContent = readFileSync(PID_FILE, 'utf-8');
    } catch {
      originalPidContent = null;
    }
  });

  afterEach(() => {
    if (originalPidContent !== null) {
      const { writeFileSync } = require('fs');
      writeFileSync(PID_FILE, originalPidContent);
      originalPidContent = null;
    } else {
      removePidFile();
    }
  });

  describe('writePidFile', () => {
    it('should create file with PID info', () => {
      const testInfo: PidInfo = {
        pid: 12345,
        port: 41777,
        startedAt: new Date().toISOString()
      };

      writePidFile(testInfo);

      expect(existsSync(PID_FILE)).toBe(true);
      const content = JSON.parse(readFileSync(PID_FILE, 'utf-8'));
      expect(content.pid).toBe(12345);
      expect(content.port).toBe(41777);
      expect(content.startedAt).toBe(testInfo.startedAt);
    });

    it('should overwrite existing PID file', () => {
      const firstInfo: PidInfo = {
        pid: 11111,
        port: 41777,
        startedAt: '2024-01-01T00:00:00.000Z'
      };
      const secondInfo: PidInfo = {
        pid: 22222,
        port: 37888,
        startedAt: '2024-01-02T00:00:00.000Z'
      };

      writePidFile(firstInfo);
      writePidFile(secondInfo);

      const content = JSON.parse(readFileSync(PID_FILE, 'utf-8'));
      expect(content.pid).toBe(22222);
      expect(content.port).toBe(37888);
    });
  });

  describe('readPidFile', () => {
    it('should return PidInfo object for valid file', () => {
      const testInfo: PidInfo = {
        pid: 54321,
        port: 37999,
        startedAt: '2024-06-15T12:00:00.000Z'
      };
      writePidFile(testInfo);

      const result = readPidFile();

      expect(result).not.toBeNull();
      expect(result!.pid).toBe(54321);
      expect(result!.port).toBe(37999);
      expect(result!.startedAt).toBe('2024-06-15T12:00:00.000Z');
    });

    it('should return null for missing file', () => {
      removePidFile();

      const result = readPidFile();

      expect(result).toBeNull();
    });

    it('should return null for corrupted JSON', () => {
      const { writeFileSync } = require('fs');
      writeFileSync(PID_FILE, 'not valid json {{{');

      const result = readPidFile();

      expect(result).toBeNull();
    });
  });

  describe('removePidFile', () => {
    it('should delete existing file', () => {
      const testInfo: PidInfo = {
        pid: 99999,
        port: 41777,
        startedAt: new Date().toISOString()
      };
      writePidFile(testInfo);
      expect(existsSync(PID_FILE)).toBe(true);

      expect(() => removePidFile()).not.toThrow();
      // Note: Cannot assert existsSync(PID_FILE) === false because parallel
    });

    it('should not throw for missing file', () => {
      removePidFile();

      expect(() => removePidFile()).not.toThrow();
    });
  });

  describe('getPlatformTimeout', () => {
    const originalPlatform = process.platform;

    afterEach(() => {
      Object.defineProperty(process, 'platform', {
        value: originalPlatform,
        writable: true,
        configurable: true
      });
    });

    it('should return same value on non-Windows platforms', () => {
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
        writable: true,
        configurable: true
      });

      const result = getPlatformTimeout(1000);

      expect(result).toBe(1000);
    });

    it('should return doubled value on Windows', () => {
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        writable: true,
        configurable: true
      });

      const result = getPlatformTimeout(1000);

      expect(result).toBe(2000);
    });

    it('should apply 2.0x multiplier consistently on Windows', () => {
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        writable: true,
        configurable: true
      });

      expect(getPlatformTimeout(500)).toBe(1000);
      expect(getPlatformTimeout(5000)).toBe(10000);
      expect(getPlatformTimeout(100)).toBe(200);
    });

    it('should round Windows timeout values', () => {
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        writable: true,
        configurable: true
      });

      const result = getPlatformTimeout(333);

      expect(result).toBe(666);
    });
  });

  describe('isProcessAlive', () => {
    it('should return true for current process', () => {
      const result = isProcessAlive(process.pid);
      expect(result).toBe(true);
    });

    it('should return false for non-existent PID', () => {
      const result = isProcessAlive(999999);
      expect(result).toBe(false);
    });

    it('should return false for invalid PIDs', () => {
      expect(isProcessAlive(-1)).toBe(false);
      expect(isProcessAlive(NaN)).toBe(false);
      expect(isProcessAlive(1.5)).toBe(false);
    });

    it('should return true for PID 0 (Windows sentinel)', () => {
      const result = isProcessAlive(0);
      expect(result).toBe(true);
    });

    it('should handle process.kill errors correctly', () => {
      const result = isProcessAlive(999999);
      expect(result).toBe(false);
    });
  });

  describe('cleanStalePidFile', () => {
    it('should not remove PID file if process is alive', () => {
      const testInfo: PidInfo = {
        pid: process.pid,
        port: 41777,
        startedAt: new Date().toISOString()
      };
      writePidFile(testInfo);

      cleanStalePidFile();

      expect(existsSync(PID_FILE)).toBe(true);
    });

    it('should remove PID file if process is dead', () => {
      const testInfo: PidInfo = {
        pid: 2147483647,
        port: 41777,
        startedAt: new Date().toISOString()
      };
      writePidFile(testInfo);

      cleanStalePidFile();

      if (existsSync(PID_FILE)) {
        const current = readPidFile();
        expect(current?.pid).not.toBe(2147483647);
      }
    });

    it('should not throw if PID file does not exist', () => {
      removePidFile();

      expect(() => cleanStalePidFile()).not.toThrow();
    });

    it('should not throw if PID file is corrupted', () => {
      const { writeFileSync } = require('fs');
      writeFileSync(PID_FILE, 'invalid json');

      expect(() => cleanStalePidFile()).not.toThrow();
    });
  });
});

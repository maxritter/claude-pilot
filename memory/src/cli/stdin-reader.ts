// Stdin reading utility extracted from hook patterns
// See src/hooks/save-hook.ts for the original pattern

import { statSync } from 'fs';

/**
 * Check if stdin is valid and readable.
 * Bun can crash when trying to read from an invalid stdin fd.
 * This happens in certain environments where stdin is not connected.
 */
export function isStdinValid(): boolean {
  try {
    // Check if stdin fd (0) is valid
    const stats = statSync('/dev/stdin');
    return stats !== null;
  } catch {
    // On Windows or when stdin is invalid, try alternative check
    try {
      // Check if stdin is a TTY or has data
      return process.stdin.readable || process.stdin.isTTY === true;
    } catch {
      return false;
    }
  }
}

export async function readJsonFromStdin(): Promise<unknown> {
  // Guard against invalid stdin to prevent Bun crashes
  if (!isStdinValid()) {
    return undefined;
  }

  return new Promise((resolve, reject) => {
    let input = '';

    // Set a timeout to prevent hanging on empty stdin
    const timeout = setTimeout(() => {
      resolve(undefined);
    }, 100);

    process.stdin.on('data', (chunk) => {
      clearTimeout(timeout);
      input += chunk;
    });

    process.stdin.on('end', () => {
      clearTimeout(timeout);
      try {
        resolve(input.trim() ? JSON.parse(input) : undefined);
      } catch (e) {
        reject(new Error(`Failed to parse hook input: ${e}`));
      }
    });

    process.stdin.on('error', () => {
      clearTimeout(timeout);
      resolve(undefined);
    });
  });
}

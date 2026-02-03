/**
 * Type definitions for bun:sqlite
 * Minimal stubs to satisfy TypeScript without full Bun types
 */
declare module 'bun:sqlite' {
  export interface RunResult {
    changes: number;
    lastInsertRowid: number | bigint;
  }

  export interface Statement<T = unknown> {
    run(...params: unknown[]): RunResult;
    get(...params: unknown[]): T | null;
    all(...params: unknown[]): T[];
    values(...params: unknown[]): unknown[][];
    finalize(): void;
  }

  export interface DatabaseOptions {
    readonly?: boolean;
    create?: boolean;
    readwrite?: boolean;
    strict?: boolean;
  }

  export class Database {
    constructor(filename: string, options?: DatabaseOptions);

    run(sql: string, ...params: unknown[]): RunResult;
    exec(sql: string): void;

    query<T = unknown>(sql: string): Statement<T>;
    prepare<T = unknown>(sql: string): Statement<T>;

    transaction<T>(fn: () => T): () => T;
    transaction<T, Args extends unknown[]>(fn: (...args: Args) => T): (...args: Args) => T;

    close(): void;

    readonly filename: string;
    readonly inTransaction: boolean;
  }
}

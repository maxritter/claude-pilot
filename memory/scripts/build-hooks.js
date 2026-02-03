#!/usr/bin/env node

/**
 * Build script for claude-mem hooks
 * Bundles TypeScript hooks into individual standalone executables using esbuild
 * Outputs to ../pilot/scripts/ and ../pilot/ui/
 */

import { build } from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PILOT_DIR = path.resolve(ROOT, '..', 'pilot');

const WORKER_SERVICE = {
  name: 'worker-service',
  source: 'src/services/worker-service.ts'
};

const MCP_SERVER = {
  name: 'mcp-server',
  source: 'src/servers/mcp-server.ts'
};

const CONTEXT_GENERATOR = {
  name: 'context-generator',
  source: 'src/services/context-generator.ts'
};

const WORKER_WRAPPER = {
  name: 'worker-wrapper',
  source: 'src/services/worker-wrapper.ts'
};

async function buildHooks() {
  console.log('Building claude-mem hooks and worker service...\n');

  try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8'));
    const version = packageJson.version;
    console.log(`Version: ${version}`);

    console.log('\nPreparing output directories...');
    const scriptsDir = path.join(PILOT_DIR, 'scripts');
    const uiDir = path.join(PILOT_DIR, 'ui');

    if (!fs.existsSync(scriptsDir)) {
      fs.mkdirSync(scriptsDir, { recursive: true });
    }
    if (!fs.existsSync(uiDir)) {
      fs.mkdirSync(uiDir, { recursive: true });
    }
    console.log('Output directories ready');

    console.log('\nBuilding React viewer with Vite...');
    const viewerBuild = spawn('npm', ['run', 'build:viewer'], {
      stdio: 'inherit',
      cwd: ROOT
    });
    await new Promise((resolve, reject) => {
      viewerBuild.on('exit', (code) => {
        if (code === 0) {
          resolve(undefined);
        } else {
          reject(new Error(`Viewer build failed with exit code ${code}`));
        }
      });
    });

    console.log('\nCopying viewer assets to pilot/ui...');
    const viewerBuildDir = path.join(ROOT, 'build', 'viewer');
    if (fs.existsSync(viewerBuildDir)) {
      const files = fs.readdirSync(viewerBuildDir);
      for (const file of files) {
        const src = path.join(viewerBuildDir, file);
        const dest = path.join(uiDir, file);
        if (fs.statSync(src).isFile()) {
          fs.copyFileSync(src, dest);
          console.log(`  Copied: ${file}`);
        }
      }
    }

    console.log('\nCopying static UI assets...');
    const uiAssetsDir = path.join(ROOT, 'src', 'ui');
    const assetFiles = fs.readdirSync(uiAssetsDir).filter(f =>
      f.endsWith('.webp') || f.endsWith('.svg') || f.endsWith('.html') || f.endsWith('.png') || f.endsWith('.jpg')
    );
    for (const file of assetFiles) {
      const src = path.join(uiAssetsDir, file);
      const dest = path.join(uiDir, file);
      if (fs.statSync(src).isFile()) {
        fs.copyFileSync(src, dest);
        console.log(`  Copied: ${file}`);
      }
    }

    console.log(`\nBuilding worker service...`);
    await build({
      entryPoints: [path.join(ROOT, WORKER_SERVICE.source)],
      bundle: true,
      platform: 'node',
      target: 'node18',
      format: 'cjs',
      outfile: path.join(scriptsDir, `${WORKER_SERVICE.name}.cjs`),
      minify: true,
      logLevel: 'error',
      external: [
        'bun:sqlite',
        '@xenova/transformers',
        'onnxruntime-node',
        'sharp'
      ],
      define: {
        '__DEFAULT_PACKAGE_VERSION__': `"${version}"`
      },
      banner: {
        js: '#!/usr/bin/env bun'
      }
    });

    fs.chmodSync(path.join(scriptsDir, `${WORKER_SERVICE.name}.cjs`), 0o755);
    const workerStats = fs.statSync(path.join(scriptsDir, `${WORKER_SERVICE.name}.cjs`));
    console.log(`worker-service built (${(workerStats.size / 1024).toFixed(2)} KB)`);

    console.log(`\nBuilding MCP server...`);
    await build({
      entryPoints: [path.join(ROOT, MCP_SERVER.source)],
      bundle: true,
      platform: 'node',
      target: 'node18',
      format: 'cjs',
      outfile: path.join(scriptsDir, `${MCP_SERVER.name}.cjs`),
      minify: true,
      logLevel: 'error',
      external: ['bun:sqlite'],
      define: {
        '__DEFAULT_PACKAGE_VERSION__': `"${version}"`
      },
      banner: {
        js: '#!/usr/bin/env node'
      }
    });

    fs.chmodSync(path.join(scriptsDir, `${MCP_SERVER.name}.cjs`), 0o755);
    const mcpServerStats = fs.statSync(path.join(scriptsDir, `${MCP_SERVER.name}.cjs`));
    console.log(`mcp-server built (${(mcpServerStats.size / 1024).toFixed(2)} KB)`);

    console.log(`\nBuilding context generator...`);
    await build({
      entryPoints: [path.join(ROOT, CONTEXT_GENERATOR.source)],
      bundle: true,
      platform: 'node',
      target: 'node18',
      format: 'cjs',
      outfile: path.join(scriptsDir, `${CONTEXT_GENERATOR.name}.cjs`),
      minify: true,
      logLevel: 'error',
      external: ['bun:sqlite'],
      define: {
        '__DEFAULT_PACKAGE_VERSION__': `"${version}"`
      }
    });

    const contextGenStats = fs.statSync(path.join(scriptsDir, `${CONTEXT_GENERATOR.name}.cjs`));
    console.log(`context-generator built (${(contextGenStats.size / 1024).toFixed(2)} KB)`);

    console.log(`\nBuilding worker wrapper...`);
    await build({
      entryPoints: [path.join(ROOT, WORKER_WRAPPER.source)],
      bundle: true,
      platform: 'node',
      target: 'node18',
      format: 'cjs',
      outfile: path.join(scriptsDir, `${WORKER_WRAPPER.name}.cjs`),
      minify: true,
      logLevel: 'error',
      external: ['bun:sqlite'],
      define: {
        '__DEFAULT_PACKAGE_VERSION__': `"${version}"`
      },
      banner: {
        js: '#!/usr/bin/env bun'
      }
    });

    fs.chmodSync(path.join(scriptsDir, `${WORKER_WRAPPER.name}.cjs`), 0o755);
    const wrapperStats = fs.statSync(path.join(scriptsDir, `${WORKER_WRAPPER.name}.cjs`));
    console.log(`worker-wrapper built (${(wrapperStats.size / 1024).toFixed(2)} KB)`);

    console.log('\nBuild completed successfully!');
    console.log(`Scripts output: ${scriptsDir}/`);
    console.log(`  - worker-service.cjs`);
    console.log(`  - mcp-server.cjs`);
    console.log(`  - context-generator.cjs`);
    console.log(`  - worker-wrapper.cjs`);
    console.log(`UI output: ${uiDir}/`);

  } catch (error) {
    console.error('\nBuild failed:', error.message);
    if (error.errors) {
      console.error('\nBuild errors:');
      error.errors.forEach(err => console.error(`  - ${err.text}`));
    }
    process.exit(1);
  }
}

buildHooks();

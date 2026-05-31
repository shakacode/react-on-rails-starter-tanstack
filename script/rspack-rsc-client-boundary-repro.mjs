#!/usr/bin/env node
// REFERENCE PATTERN: rspack-rsc-repro — see AGENTS.md

import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const clientBoundaryPath = 'app/javascript/src/HelloServer/components/LikeButton.tsx';
const rscBundlePath = 'ssr-generated/rsc-bundle.js';
const clientManifestPath = 'public/packs/react-client-manifest.json';
const serverManifestPath = 'ssr-generated/react-server-client-manifest.json';

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} exited with ${result.status}`);
  }
}

function exists(path) {
  return fs.existsSync(path);
}

for (const outputPath of [clientManifestPath, serverManifestPath, rscBundlePath]) {
  fs.rmSync(outputPath, { force: true });
}

run('bin/rails', ['react_on_rails:generate_packs']);
run('bin/shakapacker', []);

const clientBoundarySource = fs.readFileSync(clientBoundaryPath, 'utf8');
const hasUseClientBoundary = clientBoundarySource.includes("'use client'") || clientBoundarySource.includes('"use client"');
const missingManifests = [clientManifestPath, serverManifestPath].filter((path) => !exists(path));

const result = {
  status: missingManifests.length > 0 ? 'blocked' : 'ready',
  bundler: 'rspack',
  clientBoundary: {
    path: clientBoundaryPath,
    hasUseClientDirective: hasUseClientBoundary,
  },
  rscBundle: {
    path: rscBundlePath,
    exists: exists(rscBundlePath),
  },
  manifests: {
    client: { path: clientManifestPath, exists: exists(clientManifestPath) },
    server: { path: serverManifestPath, exists: exists(serverManifestPath) },
  },
};

console.log(JSON.stringify(result, null, 2));

if (!hasUseClientBoundary) {
  throw new Error(`${clientBoundaryPath} is not a client-boundary repro`);
}

if (!exists(rscBundlePath)) {
  throw new Error(`${rscBundlePath} was not emitted`);
}

if (process.env.REQUIRE_RSC_MANIFESTS === 'true' && missingManifests.length > 0) {
  throw new Error(`Rspack RSC manifests are missing: ${missingManifests.join(', ')}`);
}

if (missingManifests.length > 0) {
  console.log('Rspack/RSC client-boundary repro is present, but RSC manifests are missing from this build.');
}

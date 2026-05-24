#!/usr/bin/env node

import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = fs.readFileSync('app/javascript/lib/tanstackRouterStoreShim.ts', 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
});

const module = { exports: {} };
vm.runInNewContext(outputText, { module, exports: module.exports }, { filename: 'tanstackRouterStoreShim.js' });

const { installRouterStoreShim } = module.exports;

if (typeof installRouterStoreShim !== 'function') {
  throw new Error('installRouterStoreShim was not exported');
}

const updates = [];
const router = {
  state: {
    status: 'pending',
    isLoading: true,
    location: { pathname: '/dashboard' },
    resolvedLocation: null,
    statusCode: 200,
    redirect: null,
    matches: [],
  },
  stores: {
    status: { set: (value) => updates.push(['status', value]) },
    isLoading: { set: (value) => updates.push(['isLoading', value]) },
    location: { set: (value) => updates.push(['location', value]) },
    resolvedLocation: { set: (value) => updates.push(['resolvedLocation', value]) },
    statusCode: { set: (value) => updates.push(['statusCode', value]) },
    redirect: { set: (value) => updates.push(['redirect', value]) },
    setMatches: (value) => updates.push(['matches', value]),
  },
};

const shimmedRouter = installRouterStoreShim(router);

if (shimmedRouter !== router) {
  throw new Error('shim should return the same router instance');
}

if (typeof router.__store?.setState !== 'function') {
  throw new Error('shim did not install __store.setState');
}

router.__store.setState((state) => ({
  ...state,
  status: 'idle',
  isLoading: false,
  location: { pathname: '/projects/new' },
  resolvedLocation: { pathname: '/projects/new' },
  statusCode: 201,
  redirect: undefined,
  matches: [{ id: '/projects/new' }],
}));

const updateNames = updates.map(([name]) => name);
const expectedNames = ['status', 'isLoading', 'location', 'resolvedLocation', 'statusCode', 'redirect', 'matches'];

if (JSON.stringify(updateNames) !== JSON.stringify(expectedNames)) {
  throw new Error(`unexpected store updates: ${JSON.stringify(updates)}`);
}

const existingStore = { setState: () => updates.push(['existing']) };
const existingRouter = { __store: existingStore, state: {}, stores: {} };
installRouterStoreShim(existingRouter);

if (existingRouter.__store !== existingStore) {
  throw new Error('shim should not replace an existing __store');
}

console.log('TanStack router store shim regression passed');

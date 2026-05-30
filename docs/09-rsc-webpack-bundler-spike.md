# RSC Webpack Bundler Spike

## Question

Does switching the Shakapacker bundler from **Rspack to Webpack** make interactive
React Server Components actually work in this starter — i.e. does the Webpack
build emit the RSC client-reference manifests that the Rspack build does not?

- `public/packs/react-client-manifest.json`
- `ssr-generated/react-server-client-manifest.json`

(See `SPIKE.md` for the AMBER Rspack/RSC limitation and upstream
shakacode/react_on_rails#1828 / #3385.)

## Verdict: YES

On Webpack the build emits **both** RSC client-reference manifests, the React on
Rails Pro Node renderer loads them, and `/hello_server` (the `use client`
`LikeButton` island) renders end-to-end with `REQUIRE_RSC_MANIFESTS=true`.

### Evidence

Full production build on Webpack (`SHAKAPACKER_ASSETS_BUNDLER=webpack`):

```
public/packs/react-client-manifest.json        (2.2 KB)  ✅
ssr-generated/react-server-client-manifest.json (1.0 KB)  ✅
ssr-generated/server-bundle.js                 (3.9 MB)  ✅
ssr-generated/rsc-bundle.js                    (269 KB)  ✅
```

Both manifests contain the `LikeButton` client reference, e.g. the client
manifest:

```json
".../HelloServer/components/LikeButton.tsx": {
  "id": 3591, "chunks": [1719, "js/client1-….chunk.js"], "name": "*"
}
```

- `pnpm run repro:rspack-rsc` with `SHAKAPACKER_ASSETS_BUNDLER=webpack
  REQUIRE_RSC_MANIFESTS=true` → `"status": "ready"`, both manifests present,
  exit 0. (The same gate fails on Rspack.)
- `SHAKAPACKER_ASSETS_BUNDLER=webpack REQUIRE_RSC_MANIFESTS=true node
  script/dev-mode-smoke.mjs static hello-server` → full stack boots; the Node
  renderer logs `Copied assets ["react-client-manifest.json",
  "react-server-client-manifest.json"]`; `/hello_server` returns HTTP 200 with
  `"missingRscManifests": []`, `"outcome": "rendered"`.
- The Rspack track is unchanged: the default-bundler repro still reports
  `"status": "blocked"` with both manifests absent.

## Why Webpack works and Rspack doesn't

`react-on-rails-rsc`'s `RSCWebpackPlugin` is hard-wired to Webpack internals
(`require('webpack/lib/dependencies/ModuleDependency')`,
`require('webpack/lib/Template')`, etc.). Rspack does not expose those modules,
so the existing `config/rspack/*` configs deliberately skip the plugin on Rspack
(`if (config.assets_bundler !== 'rspack')`), which is exactly why the Rspack
build cannot emit the manifests. On Webpack the plugin runs:

- `RSCWebpackPlugin({ isServer: false })` on the client → `react-client-manifest.json`
- `RSCWebpackPlugin({ isServer: true })` on the server → `react-server-client-manifest.json`
- `react-on-rails-rsc/WebpackLoader` on the RSC bundle → strips client components.

## Configuration required

A new `config/webpack/` directory mirrors `config/rspack/` (client + server +
RSC + env dispatchers). Shakapacker auto-discovers `config/webpack/webpack.config.js`
when the active bundler is `webpack`. Rspack stays the committed default; Webpack
is opt-in and env-selectable:

```sh
# one-off build / run on Webpack, leaving config/shakapacker.yml on rspack
SHAKAPACKER_ASSETS_BUNDLER=webpack bin/shakapacker
bin/shakapacker --bundler webpack
```

Three non-obvious adjustments were needed beyond a straight port of the Pro
`spec/dummy` Webpack config, all caused by TanStack packages shipping dual
`src`/`dist` output with `use client` directives:

1. **`resolve.conditionNames`** pinned to the standard set
   (`['require','node','import','module','default','...']`). Without it Webpack's
   resolver falls through to the first `exports` key, and some `@tanstack/*-devtools`
   packages list a non-standard `@tanstack/custom-condition` first that points at
   raw `src/*.ts` → "Module parse failed".
2. **A scoped `swc-loader` rule** for `@tanstack` source TS that leaks into the
   RSC client-reference graph (Shakapacker's default JS rule excludes
   `node_modules`).
3. **Per-call rule construction + an RSC-loader skip for the `@tanstack` rule.**
   The RSC config appends `react-on-rails-rsc/WebpackLoader` to any swc/babel
   rule; sharing a single rule object across the client/server/RSC builds (one
   Webpack invocation) leaked the RSC transform into the client/server bundles,
   producing duplicate `export const type` / `export const interface` proxies
   from TanStack's TS type exports. This is the third-party-package form of the
   known RSC pitfall ("a `use client` module must export only its component, not
   TS types"). `config/webpack/rscWebpackConfig.js` skips the `@tanstack` rule so
   only type-stripping (not the RSC transform) runs on those files.

Rspack does not surface any of these because it doesn't run the Webpack RSC
plugin/loader and resolves the TanStack `exports` maps without the fall-through.

## Tradeoffs vs Rspack

| Dimension            | Rspack (default)         | Webpack (RSC-capable)               |
| -------------------- | ------------------------ | ----------------------------------- |
| Interactive RSC      | ❌ manifests not emitted | ✅ manifests emitted, island renders |
| Clean prod build     | ~2.8 s                   | ~8.3 s (≈3× slower)                 |
| Client JS total      | ~2.6 MB                  | ~2.6 MB (comparable)                |
| Dev server / HMR     | `@rspack/plugin-react-refresh` | `@pmmmwh/react-refresh-webpack-plugin` (HMR not exercised in this spike) |
| Extra deps           | —                        | `webpack`, `webpack-cli`, `webpack-dev-server`, `webpack-assets-manifest`, `@pmmmwh/react-refresh-webpack-plugin` |

Build time is the main regression (~3×). Bundle size is comparable. Webpack dev
server / HMR with this RSC config was not exercised in this spike (the manifest
evidence and the `static` full-stack smoke were the priority).

## Caveats / follow-ups

- The TanStack `src`-leak workarounds are specific to this app's dependency set.
  The cleaner long-term fix is upstream: either `react-on-rails-rsc` resolving
  third-party `use client` modules to their compiled entry, or Rspack support in
  `RSCWebpackPlugin` (which would let the starter stay on Rspack).
- `pnpm-workspace.yaml` gained `'core-js-pure': false` (a transitive dep of the
  new Webpack/react-refresh tree whose only postinstall is a funding message).

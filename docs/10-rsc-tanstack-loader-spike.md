# RSC Payloads In A TanStack Route Loader

This spike verifies the interim Webpack bridge can compose a React on Rails Pro
React Server Component payload inside a plain `@tanstack/react-router` route.
It does not use TanStack Start, Vite, file-based routing, Hotwire, or Stimulus.

## Result

- Rails serves the public `/rsc-showcase` page and remains responsible for the
  route, CSP, and the Pro `/rsc_payload/:component_name` endpoint.
- A TanStack Router loader fetches
  `/rsc_payload/RscShowcaseServerPanel?props=...`.
- The loader buffers the Pro length-prefixed RSC stream as serializable Flight
  chunks.
- The route component reconstructs a `ReadableStream` and passes it to
  `createFromReadableStream` from `react-on-rails-rsc/client.browser`.
- The fetched RSC tree renders beside ordinary route-level client React.
- A `use client` island inside the fetched RSC payload hydrates and updates
  independently from the route-owned client panel.

Verified locally on the Webpack bridge with:

```sh
SHAKAPACKER_ASSETS_BUNDLER=webpack bin/shakapacker
RENDERER_HOST=127.0.0.1 RENDERER_PORT=3402 node client/node-renderer.js
SKIP_DATABASE_CHECK=true RAILS_ENV=development PORT=3400 \
  REACT_RENDERER_URL=http://127.0.0.1:3402 \
  SHAKAPACKER_ASSETS_BUNDLER=webpack \
  bin/rails server -p 3400
```

Browser verification against `http://127.0.0.1:3400/rsc-showcase` confirmed:

- the loader fetched 3 RSC payload chunks;
- the server component rendered in the TanStack route;
- the RSC-embedded client island accepted clicks;
- the route-owned client island accepted clicks.

## Rspack Default Behavior

Rspack remains the local default in `config/shakapacker.yml`. Because the Rspack
RSC client-reference manifests are still the upstream blocker, `/rsc-showcase`
checks manifest availability before the loader fetches the payload. When the
manifests are missing, the route renders an honest fallback instead of issuing a
payload request that would fail at runtime.

## Follow-Up For Issue #110

This proves the core composition contract for the public centerpiece route:

> React on Rails Pro composes server-streamed RSC into a TanStack route on
> Rails; this is not TanStack Start parity.

The current route is intentionally client-loader-first. A future SSR-preloaded
version would need either an exported Pro helper for app code to consume the RSC
payload stream on the server or a React on Rails Pro wrapper that exposes the
same server/client `getComponent` behavior currently used internally by
`RSCRoute`.

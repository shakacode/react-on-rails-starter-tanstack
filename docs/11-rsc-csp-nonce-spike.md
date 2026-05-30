# RSC Streaming And CSP Nonces

## Question

Under the strict production CSP, `/hello_server` renders but the `LikeButton`
client island does not hydrate. Can this starter fix that safely in app code, or
does it require an upstream React on Rails Pro change?

## Verdict

The real fix belongs upstream in React on Rails Pro. The app already generates a
per-request `railsContext.cspNonce`, Rails pack tags receive that nonce, and Pro's
own RSC payload-injection scripts receive that nonce. The missing piece is the
React HTML streaming bootstrap emitted by `renderToPipeableStream`.

React supports a `nonce` option for `renderToPipeableStream`. Pro's streaming
renderer has access to `railsContext.cspNonce`, but the current call passes only
the stream callbacks and `identifierPrefix`. That means React's inline `$RC`
bootstrap script is emitted without a nonce and is blocked by:

```text
script-src 'self' 'nonce-...'
```

## Evidence

On the Webpack bridge, `/hello_server` emits both RSC manifests and the page
renders. Fetching the route locally shows the nonce split:

- external Rails pack scripts have `nonce="..."`;
- Pro's component-loaded, console replay, and embedded RSC payload scripts have
  `nonce="..."`;
- JSON data script tags do not need a nonce;
- React's final inline `$RC=function(...)...` script has no nonce.

The relevant source split is:

- `react_on_rails` adds `cspNonce` to `railsContext`;
- `react_on_rails_pro` passes that nonce into its RSC payload injection helper;
- `react_on_rails_pro` does not pass that nonce into React's
  `renderToPipeableStream` options for the HTML stream.

## In-App Fix Options Considered

- **Route-specific `unsafe-inline` CSP**: rejected. It would make the demo
  interactive by weakening the exact production policy this starter is trying to
  keep strict.
- **CSP hashes**: not viable for the streaming bootstrap. The script is emitted
  during React streaming and includes request-specific DOM IDs.
- **App-level Webpack alias or monkey patch around `renderToPipeableStream`**:
  rejected as a starter fix. It would rely on mutable renderer-side state or a
  local copy of Pro internals and would be fragile under concurrent renderer
  requests.
- **`pnpm patch` of `react-on-rails-pro`**: rejected for the starter. It would
  patch proprietary package output in the app repo and hide the real upstream
  contract that Pro should own.
- **RSC-as-data via a TanStack loader**: viable for the public centerpiece route,
  but it avoids the streaming HTML bootstrap rather than fixing
  `stream_react_component`.

## Upstream Fix

Tracked upstream as
[shakacode/react_on_rails#3491](https://github.com/shakacode/react_on_rails/issues/3491).

React on Rails Pro should pass the request nonce into the HTML stream renderer:

```ts
renderToPipeableStream(reactRenderedElement, {
  nonce: railsContext.cspNonce,
  identifierPrefix: domNodeId,
  // existing callbacks...
});
```

After upgrading Pro, the regression should be verified by running the Webpack
bridge under production CSP and clicking `/hello_server`'s `LikeButton` from
`0 likes` to `1 like` with no browser CSP console errors.

## Safe Interim

Keep the strict CSP. Do not add `unsafe-inline` for `/hello_server`.

For the relaunch demo, use the TanStack-loader RSC composition path as the public
centerpiece because it fetches the RSC payload as data and does not depend on
React's inline streaming bootstrap. Keep `/hello_server` as the lower-level
streaming reference route and document that its client island remains
server-rendered-only under the production CSP until the Pro nonce fix ships.

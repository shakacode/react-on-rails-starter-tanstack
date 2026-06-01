# Architecture Flow Diagrams

These diagrams show the runtime handoffs that sit behind the shorter ownership
diagram in [Architecture](01-architecture.md). They are implementation maps, not
new architecture promises. When a diagram and code disagree, treat the linked
source files as the source of truth.

## Rails Request Flow

Rails remains the application server. It owns request routing, auth gates,
session state, CSRF, controllers, Active Record access, and the HTML or JSON
response boundary for every surface.

```mermaid
flowchart TD
  Browser["Browser request"] --> Router["Rails router\nconfig/routes.rb"]

  Router --> Public["Public Rails routes\n/ and auth pages"]
  Router --> Classic["Classic Rails CRUD\n/classic/projects"]
  Router --> Dashboard["Verified dashboard routes\n/dashboard, /projects..., /settings..."]
  Router --> Api["Verified JSON API\n/api/projects"]
  Router --> RscShowcase["Public RSC showcase\n/rsc-showcase"]
  Router --> HelloServer["Streaming RSC demo\n/hello_server"]

  Public --> PublicController["Home, sessions, registrations,\npasswords, email verification"]
  Classic --> ProjectsController["ProjectsController\nCurrent.user scope"]
  Dashboard --> AuthGate["AuthenticatedController\nand verified email gate"]
  AuthGate --> DashboardController["DashboardController#show\nRails-owned props and paths"]
  Api --> ApiProjects["Api::ProjectsController\nfilter, sort, paginate, validate"]
  RscShowcase --> RscController["RscShowcaseController#show\nmanifest availability and RSC props"]
  HelloServer --> HelloController["HelloServerController#index\nmanifest gate and stream setup"]

  PublicController --> Html["Rails HTML response"]
  ProjectsController --> Html
  DashboardController --> DashboardShell["Rails dashboard shell\nreact_component DashboardApp"]
  ApiProjects --> Json["Explicit JSON response"]
  RscController --> RscShell["Rails RSC shell\nRscShowcaseApp props"]
  HelloController --> StreamedHtml["Streamed HTML response\nstream_react_component"]

  ProjectsController --> Models["Active Record models"]
  ApiProjects --> Models
  DashboardController --> Models
  HelloController --> Models
```

Implementation anchors:

- [`config/routes.rb`](../config/routes.rb) maps every public, authenticated,
  API, classic Rails, and RSC route.
- [`app/controllers/dashboard_controller.rb`](../app/controllers/dashboard_controller.rb)
  passes Rails-owned paths, current user data, API links, and build metadata to
  the authenticated TanStack shell.
- [`app/controllers/api/projects_controller.rb`](../app/controllers/api/projects_controller.rb)
  keeps filtering, sorting, pagination, validation, and per-user scoping on the
  Rails side.

## TanStack Full-Page Route Flow

The authenticated dashboard is still entered through Rails routes. React on
Rails Pro prerenders the TanStack Router tree on the server, then the browser
hydrates the same route tree and keeps route/search state client-side.

```mermaid
sequenceDiagram
  participant Browser
  participant Rails as Rails routes
  participant Controller as DashboardController
  participant View as dashboard/show.html.erb
  participant Pro as React on Rails Pro
  participant Node as Node renderer
  participant TanStack as DashboardApp route tree
  participant Api as Rails JSON API

  Browser->>Rails: GET /projects?status=active
  Rails->>Controller: Route to dashboard#show
  Controller->>Controller: Build initialPath, initialSearch, user, links, api
  Controller->>View: Assign @dashboard_props
  View->>Pro: react_component("DashboardApp", prerender: true)
  Pro->>Node: Invoke DashboardApp with railsContext.serverSide
  Node->>TanStack: serverRenderTanStackAppAsync with memory history
  TanStack-->>Node: Rendered shell and dehydrated router state
  Node-->>Pro: renderedHtml plus clientProps
  Pro-->>View: SSR markup and hydration props
  View-->>Browser: HTML shell
  Browser->>TanStack: Hydrate DashboardClientApp with browser history
  TanStack->>TanStack: Match /projects and validate URL search state
  TanStack->>Api: apiFetch with CSRF and same-origin credentials
  Api-->>TanStack: Project JSON, validation errors, or 404
  TanStack-->>Browser: Query, table, and route UI update
```

Implementation anchors:

- [`app/views/dashboard/show.html.erb`](../app/views/dashboard/show.html.erb)
  renders `DashboardApp` with React on Rails Pro prerendering outside test.
- [`app/javascript/src/Dashboard/ror_components/DashboardApp.tsx`](../app/javascript/src/Dashboard/ror_components/DashboardApp.tsx)
  defines the TanStack route tree, server rendering branch, browser hydration
  branch, query client provider, route/search validation, and project table UI.
- [`app/javascript/lib/apiFetch.ts`](../app/javascript/lib/apiFetch.ts) keeps
  Rails CSRF and same-origin credentials attached to dashboard JSON requests.

## RSC Rendering Flow

The starter has two RSC routes. `/rsc-showcase` composes an RSC payload inside a
bare TanStack Router route through `RSCRoute`. `/hello_server` demonstrates the
lower-level streaming helper. Both rely on the RSC client-reference manifests
emitted by the active Shakapacker bundler.

```mermaid
flowchart TD
  Browser["Browser"] --> ShowcaseRequest["GET /rsc-showcase"]
  Browser --> HelloRequest["GET /hello_server"]

  ShowcaseRequest --> ShowcaseController["RscShowcaseController#show"]
  ShowcaseController --> ManifestGateA{"RSC manifests available?"}
  ManifestGateA -- "No" --> ShowcaseFallback["Render route fallback\nwithout payload fetch"]
  ManifestGateA -- "Yes" --> ShowcaseShell["Rails shell with\nRscShowcaseApp props"]
  ShowcaseShell --> Loader["TanStack Router loader\nselects component and props"]
  Loader --> RSCRoute["react-on-rails-pro/RSCRoute"]
  RSCRoute --> PayloadRoute["Rails Pro rsc_payload_route"]

  HelloRequest --> HelloController["HelloServerController#index"]
  HelloController --> ManifestGateB{"RSC manifests available?"}
  ManifestGateB -- "No" --> HelloFallback["Render hello_server/unavailable"]
  ManifestGateB -- "Yes" --> StreamHelper["stream_react_component HelloServer"]

  PayloadRoute --> Renderer["React on Rails Pro\nNode renderer"]
  StreamHelper --> Renderer
  Renderer --> RscBundle["RSC bundle\nserver component tree"]
  RscBundle --> ClientRefs["Client references\nfrom manifest files"]
  ClientRefs --> Flight["Flight payload or streamed HTML chunks"]
  Flight --> BrowserTree["Browser composes server tree\nwith hydrated client islands"]
```

Implementation anchors:

- [`app/javascript/src/RscShowcase/ror_components/RscShowcaseApp.tsx`](../app/javascript/src/RscShowcase/ror_components/RscShowcaseApp.tsx)
  wraps the public route with
  `react-on-rails-pro/wrapServerComponentRenderer/client`, selects the RSC
  component in a TanStack loader, and renders the exported `RSCRoute` helper.
- [`app/views/hello_server/index.html.erb`](../app/views/hello_server/index.html.erb)
  calls `stream_react_component("HelloServer", props: @hello_server_props)`.
- [`app/javascript/src/HelloServer/components/HelloServer.tsx`](../app/javascript/src/HelloServer/components/HelloServer.tsx)
  is the async server component that includes a `LikeButton` client island.
- [`app/views/react_on_rails_pro/rsc_payload.text.erb`](../app/views/react_on_rails_pro/rsc_payload.text.erb)
  keeps the Pro payload response trim-safe for the current length-prefixed
  stream parser.

## Rspack And Shakapacker Asset Flow

Rspack is the default Shakapacker bundler. The same Shakapacker entrypoints
build public client assets, the private server bundle used by the Pro Node
renderer, and the RSC bundle used for server component payloads.

```mermaid
flowchart TD
  Source["App source\napp/javascript"] --> Shakapacker["Shakapacker config\nconfig/shakapacker.yml\nassets_bundler: rspack"]
  Shakapacker --> Hook["precompile_hook\nbin/shakapacker-precompile-hook"]
  Hook --> GeneratedPacks["React on Rails generated packs\napp/javascript/packs"]

  GeneratedPacks --> ClientConfig["Rspack client config\nconfig/rspack/clientWebpackConfig.js"]
  GeneratedPacks --> ServerConfig["Rspack server config\nconfig/rspack/serverWebpackConfig.js"]
  GeneratedPacks --> RscConfig["Rspack RSC config\nconfig/rspack/rscWebpackConfig.js"]

  ClientConfig --> PublicPacks["Public browser assets\npublic/packs"]
  ClientConfig --> ClientManifest["react-client-manifest.json\nvia RSCRspackPlugin isServer=false"]
  ServerConfig --> ServerBundle["Private SSR bundle\nssr-generated/server-bundle.js"]
  ServerConfig --> ServerManifest["react-server-client-manifest.json\nvia RSCRspackPlugin isServer=true"]
  RscConfig --> RscBundle["Private RSC bundle\nssr-generated/rsc-bundle.js"]

  PublicPacks --> RailsViews["Rails asset helpers\nand browser scripts"]
  ServerBundle --> NodeRenderer["React on Rails Pro\nNode renderer"]
  ClientManifest --> RscRuntime["RSC client-reference runtime"]
  ServerManifest --> RscRuntime
  RscBundle --> RscRuntime
  NodeRenderer --> DashboardSSR["Dashboard SSR"]
  RscRuntime --> RscRoutes["/rsc-showcase and /hello_server"]
```

Implementation anchors:

- [`config/shakapacker.yml`](../config/shakapacker.yml) selects `rspack`,
  defines public and private output paths, and wires the precompile hook.
- [`config/rspack/clientWebpackConfig.js`](../config/rspack/clientWebpackConfig.js)
  builds public client assets and emits the client RSC manifest.
- [`config/rspack/serverWebpackConfig.js`](../config/rspack/serverWebpackConfig.js)
  builds the private `server-bundle.js` for the Pro Node renderer and emits the
  server-side client-reference manifest.
- [`config/rspack/rscWebpackConfig.js`](../config/rspack/rscWebpackConfig.js)
  builds the private `rsc-bundle.js` with the RSC loader and `react-server`
  condition.
- [`docs/06-tested-modes.md`](06-tested-modes.md) records which smoke tiers
  cover live reload, static assets, production-like assets, HMR, production
  boot, and the Rspack/RSC repro.

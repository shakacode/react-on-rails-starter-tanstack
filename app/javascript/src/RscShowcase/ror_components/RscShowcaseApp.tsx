'use client';

import React, { Suspense, useMemo, useState } from 'react';
import {
  Outlet,
  RouterProvider,
  createBrowserHistory,
  createRootRoute,
  createRoute,
  createRouter,
  useRouter,
} from '@tanstack/react-router';
import { CheckCircle2, ExternalLink, RefreshCw, Route, Server, ShieldCheck, TriangleAlert } from 'lucide-react';
import RSCRoute from 'react-on-rails-pro/RSCRoute';
import wrapServerComponentRenderer from 'react-on-rails-pro/wrapServerComponentRenderer/client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type RscShowcaseAppProps = {
  initialPath: string;
  rscAvailable: boolean;
  rscPayloadPath: string;
  rscComponentName: string;
  build: {
    commitSha: string | null;
    commitLabel: string | null;
    commitUrl: string | null;
  };
};

type RscRouteData = {
  componentName: string;
  componentProps: {
    requestedBy: string;
    loaderRequestId: string;
  };
  metadata: Array<Record<string, unknown>>;
  requestPath: string;
};

const defaultProps: RscShowcaseAppProps = {
  initialPath: '/rsc-showcase',
  rscAvailable: false,
  rscPayloadPath: 'rsc_payload/',
  rscComponentName: 'RscShowcaseServerPanel',
  build: {
    commitSha: null,
    commitLabel: null,
    commitUrl: null,
  },
};

function buildRscRouteData(props: RscShowcaseAppProps): RscRouteData | null {
  if (!props.rscAvailable) return null;

  const payloadPath = props.rscPayloadPath.replace(/^\/|\/$/g, '') || 'rsc_payload';
  const componentProps = {
    requestedBy: 'TanStack Router loader',
    loaderRequestId: new Date().toISOString(),
  };
  const params = new URLSearchParams({ props: JSON.stringify(componentProps) });

  return {
    componentName: props.rscComponentName,
    componentProps,
    metadata: [
      { helper: 'react-on-rails-pro/RSCRoute' },
      { provider: 'react-on-rails-pro/wrapServerComponentRenderer/client' },
    ],
    requestPath: `/${payloadPath}/${props.rscComponentName}?${params.toString()}`,
  };
}

function PayloadRenderer({ routeData }: { routeData: RscRouteData }) {
  return (
    <RSCRoute
      componentName={routeData.componentName}
      componentProps={routeData.componentProps}
    />
  );
}

function ClientSignalPanel({ className }: { className?: string }) {
  const [pulses, setPulses] = useState(0);

  return (
    <Card className={cn('border-teal-300/70 bg-teal-50/80 shadow-sm dark:border-teal-800 dark:bg-teal-950/30', className)}>
      <CardHeader>
        <div className="flex items-center gap-2 text-teal-800 dark:text-teal-200">
          <ShieldCheck className="size-4" aria-hidden="true" />
          <span className="text-xs font-semibold uppercase">Client island beside the payload</span>
        </div>
        <CardTitle className="text-xl tracking-normal">Route-owned interactivity</CardTitle>
        <CardDescription>
          This panel is ordinary client React in the TanStack route, rendered next to the fetched RSC tree.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="secondary" onClick={() => setPulses((value) => value + 1)}>
          Pulse client state
        </Button>
        <Badge variant="outline">{pulses} route {pulses === 1 ? 'pulse' : 'pulses'}</Badge>
      </CardContent>
    </Card>
  );
}

function RscStatusGrid({ appProps }: { appProps: RscShowcaseAppProps }) {
  return (
    <section className="grid gap-4 md:grid-cols-3" aria-label="RSC capability status">
      <Card className="border-emerald-300/70 bg-emerald-50/70 shadow-sm dark:border-emerald-800 dark:bg-emerald-950/30">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200">
            <CheckCircle2 className="size-4" aria-hidden="true" />
            <span className="text-xs font-semibold uppercase">Working</span>
          </div>
          <CardTitle className="text-lg tracking-normal">RSC payload route</CardTitle>
          <CardDescription>
            This page fetches a React on Rails Pro RSC payload from Rails through <code>RSCRoute</code>
            and composes it inside bare TanStack Router.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card className="border-sky-300/70 bg-sky-50/70 shadow-sm dark:border-sky-800 dark:bg-sky-950/30">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-2 text-sky-800 dark:text-sky-200">
            <Server className="size-4" aria-hidden="true" />
            <span className="text-xs font-semibold uppercase">Working</span>
          </div>
          <CardTitle className="text-lg tracking-normal">Streaming RSC shell</CardTitle>
          <CardDescription>
            <a href="/hello_server" className="font-medium text-foreground underline-offset-4 hover:underline">
              /hello_server
            </a>{' '}
            remains the lower-level <code>stream_react_component</code> reference for server-rendered RSC.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card className="border-amber-300/70 bg-amber-50/80 shadow-sm dark:border-amber-800 dark:bg-amber-950/30">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
            <TriangleAlert className="size-4" aria-hidden="true" />
            <span className="text-xs font-semibold uppercase">Limited</span>
          </div>
          <CardTitle className="text-lg tracking-normal">Streaming client island</CardTitle>
          <CardDescription>
            The LikeButton on <code>/hello_server</code> is intentionally called out as a separate
            client-reference edge case while the upstream streaming hydration path settles.
          </CardDescription>
        </CardHeader>
      </Card>

      <p className="sr-only">
        RSC manifests are {appProps.rscAvailable ? 'available' : 'not available'} for this build.
      </p>
    </section>
  );
}

function RspackFallback() {
  return (
    <Alert className="border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
      <Server className="size-4" aria-hidden="true" />
      <AlertTitle>RSC manifests are not available for this build.</AlertTitle>
      <AlertDescription>
        Rebuild the Rspack assets with <code>bin/shakapacker</code> so React on Rails Pro can hydrate
        the server component payload on this route.
      </AlertDescription>
    </Alert>
  );
}

function RootLayout() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <Outlet />
    </main>
  );
}

function LoadingPanel() {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
        <RefreshCw className="size-4 animate-spin" aria-hidden="true" />
        Loading the RSC payload through React on Rails Pro...
      </CardContent>
    </Card>
  );
}

function ErrorPanel({ error }: { error: unknown }) {
  return (
    <Alert variant="destructive">
      <AlertTitle>RSC payload failed</AlertTitle>
      <AlertDescription>{error instanceof Error ? error.message : 'The payload could not be rendered.'}</AlertDescription>
    </Alert>
  );
}

function ShowcasePage({ appProps, routeData }: { appProps: RscShowcaseAppProps; routeData: RscRouteData | null }) {
  const router = useRouter();

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:py-12">
      <nav className="flex flex-wrap items-center justify-between gap-3" aria-label="RSC showcase navigation">
        <a className="text-sm font-semibold text-foreground underline-offset-4 hover:underline" href="/">
          RoR x TanStack
        </a>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <a href="/">Home</a>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <a href="/dashboard">Dashboard</a>
          </Button>
          <Button asChild variant="secondary" size="sm">
            <a
              href="https://github.com/shakacode/react-on-rails-starter-tanstack"
              target="_blank"
              rel="noopener noreferrer"
            >
              Source
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          </Button>
        </div>
      </nav>

      <header className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.6fr)] lg:items-end">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="rounded-md" variant="secondary">
              Rspack RSC
            </Badge>
            <Badge className="rounded-md border-sky-300 text-sky-800 dark:border-sky-700 dark:text-sky-200" variant="outline">
              <Route className="mr-1 size-3" aria-hidden="true" />
              TanStack Router loader
            </Badge>
          </div>
          <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-normal text-balance sm:text-5xl">
            Working RSC payloads with the client-reference limit called out
          </h1>
          <p className="mt-4 max-w-3xl text-lg text-muted-foreground">
            The route loader chooses the server component and props, then React on Rails Pro&apos;s
            RSCRoute helper fetches and renders the payload beside normal client React. The lower-level
            streaming demo stays separate so its client island does not get confused with the working
            RSC payload path.
          </p>
        </div>

        <Card className="min-w-0 border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base tracking-normal">Network contract</CardTitle>
            <CardDescription className="break-all">
              {routeData ? routeData.requestPath : `/${appProps.rscPayloadPath.replace(/^\/|\/$/g, '')}/${appProps.rscComponentName}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Payload helper</span>
              <Badge variant="outline">{routeData ? 'RSCRoute' : 'Unavailable'}</Badge>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Route data</span>
              <Badge variant="outline">{routeData?.metadata.length ?? 0} facts</Badge>
            </div>
            <Button
              type="button"
              variant="secondary"
              className="mt-2"
              disabled={!appProps.rscAvailable}
              onClick={() => router.invalidate()}
            >
              <RefreshCw className="size-4" aria-hidden="true" />
              Refetch payload
            </Button>
          </CardContent>
        </Card>
      </header>

      <RscStatusGrid appProps={appProps} />

      {appProps.rscAvailable && routeData ? (
        <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <Suspense fallback={<LoadingPanel />}>
            <PayloadRenderer routeData={routeData} />
          </Suspense>
          <ClientSignalPanel />
        </div>
      ) : (
        <RspackFallback />
      )}

      <footer className="flex flex-col gap-2 border-t border-border pt-5 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span>Rails serves this route; React on Rails Pro fetches the RSC payload; /hello_server keeps the streaming reference.</span>
        {appProps.build.commitLabel ? (
          <span>
            Commit{' '}
            {appProps.build.commitUrl ? (
              <a
                href={appProps.build.commitUrl}
                className="font-mono text-foreground underline-offset-4 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
                title={appProps.build.commitSha ?? appProps.build.commitLabel}
              >
                {appProps.build.commitLabel}
              </a>
            ) : (
              <code className="font-mono text-foreground" title={appProps.build.commitSha ?? appProps.build.commitLabel}>
                {appProps.build.commitLabel}
              </code>
            )}
          </span>
        ) : null}
      </footer>
    </div>
  );
}

// REFERENCE PATTERN: rsc-showcase-loader — see AGENTS.md
function createShowcaseRouter(appProps: RscShowcaseAppProps) {
  const rootRoute = createRootRoute({ component: RootLayout });
  const showcaseRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/rsc-showcase',
    loader: () => buildRscRouteData(appProps),
    pendingComponent: LoadingPanel,
    errorComponent: ({ error }) => <ErrorPanel error={error} />,
    component: () => (
      <ShowcasePage
        appProps={appProps}
        routeData={showcaseRoute.useLoaderData()}
      />
    ),
  });
  const routeTree = rootRoute.addChildren([showcaseRoute]);

  return createRouter({
    routeTree,
    history: createBrowserHistory(),
    defaultPendingComponent: LoadingPanel,
    defaultErrorComponent: ({ error }) => <ErrorPanel error={error} />,
  });
}

const RscShowcaseApp = (props: Partial<RscShowcaseAppProps>) => {
  const appProps = { ...defaultProps, ...props };
  const router = useMemo(() => createShowcaseRouter(appProps), [
    appProps.initialPath,
    appProps.rscAvailable,
    appProps.rscComponentName,
    appProps.rscPayloadPath,
  ]);

  return <RouterProvider router={router} />;
};

export default wrapServerComponentRenderer(RscShowcaseApp, 'RscShowcaseApp');

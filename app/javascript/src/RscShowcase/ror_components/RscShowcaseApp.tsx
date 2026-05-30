'use client';

import React, { Suspense, use, useMemo, useState } from 'react';
import {
  Outlet,
  RouterProvider,
  createBrowserHistory,
  createRootRoute,
  createRoute,
  createRouter,
  useRouter,
} from '@tanstack/react-router';
import { RefreshCw, Route, Server, ShieldCheck } from 'lucide-react';
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
};

type RscPayloadData = {
  byteCount: number;
  cacheKey: string;
  chunks: string[];
  componentName: string;
  fetchedAt: string;
  metadata: Array<Record<string, unknown>>;
  requestPath: string;
};

const defaultProps: RscShowcaseAppProps = {
  initialPath: '/rsc-showcase',
  rscAvailable: false,
  rscPayloadPath: 'rsc_payload/',
  rscComponentName: 'RscShowcaseServerPanel',
};

const flightNodeCache = new Map<string, Promise<React.ReactNode>>();

function findByte(bytes: Uint8Array, byte: number, start: number) {
  for (let index = start; index < bytes.length; index += 1) {
    if (bytes[index] === byte) return index;
  }

  return -1;
}

function contentFingerprint(bytes: Uint8Array) {
  let hash = 0x811c9dc5;

  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
}

function decodeLengthPrefixedPayload(arrayBuffer: ArrayBuffer, requestPath: string, componentName: string): RscPayloadData {
  const bytes = new Uint8Array(arrayBuffer);
  const decoder = new TextDecoder();
  const chunks: string[] = [];
  const metadata: Array<Record<string, unknown>> = [];
  let offset = 0;

  while (offset < bytes.length) {
    const tabIndex = findByte(bytes, 9, offset);
    if (tabIndex === -1) throw new Error('RSC payload metadata delimiter was missing.');

    const newlineIndex = findByte(bytes, 10, tabIndex + 1);
    if (newlineIndex === -1) throw new Error('RSC payload length delimiter was missing.');

    const metadataText = decoder.decode(bytes.slice(offset, tabIndex));
    const contentLengthText = decoder.decode(bytes.slice(tabIndex + 1, newlineIndex)).trim();
    const contentLength = Number.parseInt(contentLengthText, 16);

    if (!Number.isFinite(contentLength)) {
      throw new Error(`Invalid RSC payload chunk length: ${contentLengthText}`);
    }

    const contentStart = newlineIndex + 1;
    const contentEnd = contentStart + contentLength;
    if (contentEnd > bytes.length) throw new Error('RSC payload ended before a full chunk was received.');

    metadata.push(metadataText ? JSON.parse(metadataText) as Record<string, unknown> : {});
    chunks.push(decoder.decode(bytes.slice(contentStart, contentEnd)));
    offset = contentEnd;
  }

  return {
    byteCount: bytes.length,
    cacheKey: `${componentName}:${requestPath}:${bytes.length}:${chunks.length}:${contentFingerprint(bytes)}`,
    chunks,
    componentName,
    fetchedAt: new Date().toISOString(),
    metadata,
    requestPath,
  };
}

async function fetchRscPayload(props: RscShowcaseAppProps): Promise<RscPayloadData | null> {
  if (!props.rscAvailable) return null;

  const payloadPath = props.rscPayloadPath.replace(/^\/|\/$/g, '') || 'rsc_payload';
  const params = new URLSearchParams({
    props: JSON.stringify({ requestedBy: 'TanStack Router loader' }),
  });
  const requestPath = `/${payloadPath}/${props.rscComponentName}?${params.toString()}`;
  const response = await fetch(requestPath, { headers: { Accept: 'application/x-ndjson' } });

  if (!response.ok) {
    throw new Error(`RSC payload request failed with HTTP ${response.status}.`);
  }

  return decodeLengthPrefixedPayload(await response.arrayBuffer(), requestPath, props.rscComponentName);
}

function getFlightNode(payload: RscPayloadData) {
  const cached = flightNodeCache.get(payload.cacheKey);
  if (cached) return cached;

  const promise = (async () => {
    const { createFromReadableStream } = await import('react-on-rails-rsc/client.browser');
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        payload.chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)));
        controller.close();
      },
    });

    return createFromReadableStream<React.ReactNode>(stream);
  })();

  flightNodeCache.set(payload.cacheKey, promise);
  return promise;
}

function PayloadRenderer({ payload }: { payload: RscPayloadData }) {
  const node = use(getFlightNode(payload));

  return <>{node}</>;
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

function RspackFallback() {
  return (
    <Alert className="border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
      <Server className="size-4" aria-hidden="true" />
      <AlertTitle>RSC manifests are not available for this local build.</AlertTitle>
      <AlertDescription>
        Rspack remains the starter&apos;s local default while upstream Rspack RSC manifests are pending.
        Set <code>SHAKAPACKER_ASSETS_BUNDLER=webpack</code> and rebuild assets to exercise this route.
      </AlertDescription>
    </Alert>
  );
}

function RootLayout() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Outlet />
    </main>
  );
}

function LoadingPanel() {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
        <RefreshCw className="size-4 animate-spin" aria-hidden="true" />
        Loading the RSC payload through the TanStack loader...
      </CardContent>
    </Card>
  );
}

function ErrorPanel({ error }: { error: unknown }) {
  return (
    <Alert variant="destructive">
      <AlertTitle>RSC payload failed</AlertTitle>
      <AlertDescription>{error instanceof Error ? error.message : 'The payload could not be decoded.'}</AlertDescription>
    </Alert>
  );
}

function ShowcasePage({ appProps, payload }: { appProps: RscShowcaseAppProps; payload: RscPayloadData | null }) {
  const router = useRouter();

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:py-12">
      <header className="grid gap-5 lg:grid-cols-[1.4fr_0.6fr] lg:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="rounded-md" variant="secondary">
              Webpack bridge spike
            </Badge>
            <Badge className="rounded-md border-sky-300 text-sky-800 dark:border-sky-700 dark:text-sky-200" variant="outline">
              <Route className="mr-1 size-3" aria-hidden="true" />
              TanStack Router loader
            </Badge>
          </div>
          <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-normal text-balance sm:text-5xl">
            Server-streamed RSC composed inside a TanStack route on Rails
          </h1>
          <p className="mt-4 max-w-3xl text-lg text-muted-foreground">
            The route loader fetches a React on Rails Pro payload from Rails, decodes the Flight stream,
            and renders it beside normal client React without adding TanStack Start, Vite, Hotwire, or Stimulus.
          </p>
        </div>

        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base tracking-normal">Network contract</CardTitle>
            <CardDescription>
              {payload ? payload.requestPath : `/${appProps.rscPayloadPath.replace(/^\/|\/$/g, '')}/${appProps.rscComponentName}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Payload chunks</span>
              <Badge variant="outline">{payload?.chunks.length ?? 0}</Badge>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Bytes fetched</span>
              <Badge variant="outline">{payload?.byteCount ?? 0}</Badge>
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

      {appProps.rscAvailable && payload ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <Suspense fallback={<LoadingPanel />}>
            <PayloadRenderer payload={payload} />
          </Suspense>
          <ClientSignalPanel />
        </div>
      ) : (
        <RspackFallback />
      )}
    </div>
  );
}

function createShowcaseRouter(appProps: RscShowcaseAppProps) {
  const rootRoute = createRootRoute({ component: RootLayout });
  const showcaseRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/rsc-showcase',
    loader: () => fetchRscPayload(appProps),
    pendingComponent: LoadingPanel,
    errorComponent: ({ error }) => <ErrorPanel error={error} />,
    component: () => (
      <ShowcasePage
        appProps={appProps}
        payload={showcaseRoute.useLoaderData()}
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

export default RscShowcaseApp;

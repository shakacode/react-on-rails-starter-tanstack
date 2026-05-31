'use client';

import React, { createContext, Suspense, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  Link,
  Outlet,
  RouterProvider,
  createBrowserHistory,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  useRouter,
} from '@tanstack/react-router';
import {
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import { serverRenderTanStackAppAsync } from 'react-on-rails-pro/tanstack-router';
import type { TanStackRouterOptions } from 'react-on-rails-pro/tanstack-router';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  ArrowRight,
  ExternalLink,
  FolderKanban,
  GitBranch,
  Info,
  ServerCog,
  Settings,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Toaster } from '@/components/ui/sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { apiFetch } from '../../../lib/apiFetch';
import { createQueryClient } from '../../../lib/queryClient';
import { installRouterStoreShim } from '../../../lib/tanstackRouterStoreShim';

const ReactQueryDevtools = React.lazy(async () => {
  const { ReactQueryDevtools: Devtools } = await import('@tanstack/react-query-devtools');
  return { default: Devtools };
});

const TanStackRouterDevtools = React.lazy(async () => {
  const { TanStackRouterDevtools: Devtools } = await import('@tanstack/react-router-devtools');
  return { default: Devtools };
});

type DashboardAppProps = {
  initialPath: string;
  initialSearch: string;
  user: {
    name: string;
    emailAddress: string;
  };
  api: {
    projectsPath: string;
    metricsProjectId: number | null;
  };
  links: {
    dashboard: string;
    settings: string;
    projects: string;
    newProject: string;
    classicProjects: string;
    signOut: string;
  };
  build: {
    commitSha: string | null;
    commitLabel: string | null;
    commitUrl: string | null;
  };
};

type Project = {
  id: number;
  name: string;
  description: string | null;
  status: string;
  last_activity_at: string;
  archived: boolean;
  updated_at: string;
};

type ProjectsResponse = {
  projects: Project[];
  meta: {
    page: number;
    per_page: number;
    total: number;
  };
};

type ProjectResponse = {
  project: Project;
};

type ProjectFormValues = {
  name: string;
  description: string;
  status: string;
};

type MetricsResponse = {
  total: number;
  active_count: number;
  completed_this_week: number;
  avg_cycle_time: number;
};

type DashboardSearch = {
  status?: string;
  sort?: string;
  dir?: 'asc' | 'desc';
  page?: number;
};

type DashboardPropsContextValue = DashboardAppProps & {
  setMetricsProjectId: (metricsProjectId: number) => void;
  setUser: (user: DashboardAppProps['user']) => void;
};

const DashboardPropsContext = createContext<DashboardPropsContextValue | null>(null);

const useDashboardProps = () => {
  const props = useContext(DashboardPropsContext);
  if (!props) throw new Error('Dashboard props are missing');

  return props;
};

const showTanStackDevtools = () =>
  typeof window !== 'undefined' && window.localStorage.getItem('tanstack-devtools') === '1';

const panelClassName = 'tanstack-panel border-border/70 bg-card/95 shadow-sm';
const panelHeaderClassName = 'tanstack-panel-header gap-4 border-b border-border/60 pb-4';
const eyebrowClassName = 'tanstack-eyebrow text-muted-foreground';
const mutedTextClassName = 'text-sm text-muted-foreground';
const actionRowClassName = 'auth-actions flex flex-wrap items-center gap-2';
const formClassName = 'auth-form settings-pane grid max-w-2xl gap-4';
const fieldClassName = 'auth-field grid gap-2';
const inputLikeClassName = 'border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex min-h-9 w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50';
const dashboardLinkClassName = 'text-sm font-medium text-primary underline-offset-4 hover:underline';
const reactOnRailsProUrl = 'https://www.shakacode.com/react-on-rails-pro/';
const rscThesisUrl = 'https://github.com/shakacode/react-on-rails-starter-tanstack/blob/main/docs/08-why-rsc-on-rails.md';
const hackerNewsDemoUrl = 'https://github.com/shakacode/react-on-rails-demo-hacker-news-rsc';
const gumroadDemoUrl = 'https://github.com/shakacode/react-on-rails-demo-gumroad-rsc';
const demoPortfolioCards = [
  {
    shortLabel: 'HN',
    tone: 'hn',
    title: 'Hacker News RSC demo',
    proofPoint: 'Public-traffic perf benchmark (RSC + React 19 streaming)',
    href: hackerNewsDemoUrl,
  },
  {
    shortLabel: 'MP',
    tone: 'marketplace',
    title: 'Marketplace RSC demo',
    proofPoint: 'E-commerce surface with React Server Components',
    href: 'https://github.com/shakacode/react-on-rails-demo-marketplace-rsc',
  },
  {
    shortLabel: 'GM',
    tone: 'gumroad',
    title: 'Gumroad demo',
    proofPoint: 'Direct Inertia head-to-head: same product, both stacks',
    href: 'https://github.com/shakacode/react-on-rails-demo-gumroad-rsc',
  },
  {
    shortLabel: 'OC',
    tone: 'octochangelog',
    title: 'Octochangelog demo',
    proofPoint: 'Migrating an existing Rails app to React on Rails Pro + RSC',
    href: 'https://github.com/shakacode/react_on_rails-demo-octochangelog-on-rails-pro',
  },
] as const;

const overviewCards = [
  {
    icon: FolderKanban,
    title: 'Project workspace',
    description: 'Open the focused TanStack Table route for server-side filtering, sorting, pagination, and mutations.',
    href: '/projects',
    label: 'Open projects',
    internal: true,
  },
  {
    icon: Settings,
    title: 'Nested settings',
    description: 'Exercise authenticated nested routes and profile writes without a full-page document request.',
    href: '/settings',
    label: 'Open settings',
    internal: true,
  },
  {
    icon: ServerCog,
    title: 'RSC + TanStack',
    description: 'See a public TanStack route compose a React on Rails Pro RSC payload on the Rspack path.',
    href: '/rsc-showcase',
    label: 'Open RSC showcase',
    internal: false,
  },
  {
    icon: GitBranch,
    title: 'Classic Rails coexistence',
    description: 'Compare the Rails-rendered CRUD fallback that shares the same models, auth, and validations.',
    href: '/classic/projects',
    label: 'Open classic CRUD',
    internal: false,
  },
] as const;

const metricHelp: Record<keyof MetricsResponse, string> = {
  total: 'All projects scoped to the current Rails user.',
  active_count: 'Active records counted by Rails, cached by TanStack Query.',
  completed_this_week: 'Completed records updated in the last seven days.',
  avg_cycle_time: 'Nonnegative days from creation to last activity for completed work.',
};

type DashboardLinkProps = Omit<React.ComponentProps<typeof Link>, 'className' | 'params' | 'to'> & {
  className?: string;
  params?: Record<string, string>;
  to: string;
};

function DashboardLink({
  className,
  ...props
}: DashboardLinkProps) {
  return (
    <Link
      className={cn(dashboardLinkClassName, className)}
      {...(props as React.ComponentProps<typeof Link>)}
    />
  );
}

const ExternalDashboardLink = React.forwardRef<HTMLAnchorElement, React.ComponentProps<'a'>>(function ExternalDashboardLink({
  className,
  ...props
}, ref) {
  return (
    <a
      ref={ref}
      className={cn(dashboardLinkClassName, className)}
      {...props}
    />
  );
});

function ProjectStatusBadge({ status }: { status: string }) {
  const variant = status === 'active' ? 'default' : status === 'archived' ? 'outline' : 'secondary';

  return (
    <Badge className="capitalize" variant={variant}>
      {status}
    </Badge>
  );
}

const allowedStatuses = new Set(['active', 'paused', 'completed', 'archived']);
const allowedSorts = new Set(['name', 'status', 'last_activity_at', 'created_at']);

const normalizeDashboardSearch = (search: Record<string, unknown>): DashboardSearch => {
  const page = Number(search.page);
  const normalized: DashboardSearch = {};

  if (typeof search.status === 'string' && allowedStatuses.has(search.status)) {
    normalized.status = search.status;
  }
  if (typeof search.sort === 'string' && allowedSorts.has(search.sort)) {
    normalized.sort = search.sort;
  }
  if (search.dir === 'asc' || search.dir === 'desc') {
    normalized.dir = search.dir;
  }
  if (Number.isFinite(page) && page > 0) {
    normalized.page = Math.trunc(page);
  }

  return normalized;
};

const rootRoute = createRootRoute({
  component: RootLayout,
  errorComponent: RouteError,
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  validateSearch: normalizeDashboardSearch,
  component: DashboardPage,
});

const projectsIndexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/projects',
  validateSearch: normalizeDashboardSearch,
  component: ProjectsIndexPage,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: SettingsLayout,
});

const settingsIndexRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: '/',
  component: SettingsOverview,
});

const settingsProfileRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: 'profile',
  component: ProfileSettings,
});

const settingsSecurityRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: 'security',
  component: SecuritySettings,
});

const projectsNewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/projects/new',
  component: NewProjectPage,
});

const projectShowRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/projects/$projectId',
  component: ProjectShowPage,
});

const projectEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/projects/$projectId/edit',
  component: EditProjectPage,
});

const routeTree = rootRoute.addChildren([
  dashboardRoute,
  projectsIndexRoute,
  settingsRoute.addChildren([
    settingsIndexRoute,
    settingsProfileRoute,
    settingsSecurityRoute,
  ]),
  projectsNewRoute,
  projectShowRoute,
  projectEditRoute,
]);

// Reuses the landing page's dark-mode mechanism: the layout's nonce theme script
// (app/views/layouts/application.html.erb) attaches a document-level click listener to
// any [data-theme-toggle] element, toggles `.dark` on <html>, and persists the choice
// under the same localStorage `theme` key. This button just opts into that listener —
// no second mechanism, matching app/views/shared/_site_header.html.erb.
function ThemeToggleButton() {
  return (
    <button
      type="button"
      data-theme-toggle
      aria-label="Toggle dark mode"
      className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground"
    >
      <svg
        className="block size-4 dark:hidden"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </svg>
      <svg
        className="hidden size-4 dark:block"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    </button>
  );
}

function RootLayout() {
  const { user, links } = useDashboardProps();
  const router = useRouter();
  const showDevtools = showTanStackDevtools();
  const pathname = router.state.location.pathname;

  return (
    <main className="tanstack-shell bg-background text-foreground">
      <header className="tanstack-header border border-border/70 bg-card/95 shadow-sm">
        <div>
          <p className={eyebrowClassName}>React on Rails + TanStack</p>
          <h1>{shellTitleForPath(pathname)}</h1>
          <p className={mutedTextClassName}>Signed in as <strong>{user.emailAddress}</strong>.</p>
        </div>
        <nav className="tanstack-nav" aria-label="Dashboard navigation">
          <DashboardLink to="/dashboard">Dashboard</DashboardLink>
          <DashboardLink to="/projects">Projects</DashboardLink>
          <DashboardLink to="/settings">Settings</DashboardLink>
          <ExternalDashboardLink href={links.classicProjects}>Classic Rails CRUD</ExternalDashboardLink>
          <Button asChild size="sm" className="shrink-0">
            <Link to="/projects/new">Create project</Link>
          </Button>
          <ThemeToggleButton />
        </nav>
      </header>

      <Suspense
        fallback={(
          <Card className={panelClassName}>
            <CardContent>Loading route...</CardContent>
          </Card>
        )}
      >
        <Outlet />
      </Suspense>

      <DashboardFooter />

      <Toaster richColors position="top-right" />

      {showDevtools ? (
        <Suspense fallback={null}>
          <TanStackRouterDevtools router={router} position="bottom-right" />
        </Suspense>
      ) : null}
    </main>
  );
}

function shellTitleForPath(pathname: string) {
  if (pathname.startsWith('/projects')) return 'Projects';
  if (pathname.startsWith('/settings')) return 'Settings';

  return 'Dashboard';
}

function DashboardFooter() {
  const { build } = useDashboardProps();

  return (
    <footer className="flex flex-col gap-2 border-t border-border/60 pt-5 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <ExternalDashboardLink
        className="text-muted-foreground hover:text-primary"
        href={reactOnRailsProUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        Powered by React on Rails Pro
      </ExternalDashboardLink>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 sm:justify-end">
        <span>Rails stays the app server; Pro handles the React rendering boundary.</span>
        {build.commitLabel ? (
          <span>
            Commit{' '}
            {build.commitUrl ? (
              <a
                href={build.commitUrl}
                className="font-mono text-foreground underline-offset-4 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
                title={build.commitSha ?? build.commitLabel}
              >
                {build.commitLabel}
              </a>
            ) : (
              <code className="font-mono text-foreground" title={build.commitSha ?? build.commitLabel}>
                {build.commitLabel}
              </code>
            )}
          </span>
        ) : null}
      </div>
    </footer>
  );
}

function RouteError({ error }: { error: Error }) {
  return (
    <Alert className={panelClassName} variant="destructive">
      <AlertTitle>This section is unavailable</AlertTitle>
      <AlertDescription>
        <p>{error.message}</p>
        <Button className="mt-3" type="button" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </AlertDescription>
    </Alert>
  );
}

function DashboardPage() {
  return <DashboardOverviewPage />;
}

function ProjectsIndexPage() {
  const search = projectsIndexRoute.useSearch();
  const navigate = projectsIndexRoute.useNavigate();

  return (
    <ProjectsPage
      search={search}
      updateSearch={(next) => {
        navigate({
          search: (previous: DashboardSearch) => ({
            ...previous,
            ...next,
            page: next.page ?? 1,
          }),
        });
      }}
    />
  );
}

function DashboardOverviewPage() {
  return (
    <div className="tanstack-stack">
      <DashboardOverviewHero />
      <MetricsGrid />
      <OverviewRouteCards />
      <DemoPortfolioCards />
      <RenderingModeDrawer />
    </div>
  );
}

function ProjectsPage({
  search,
  updateSearch,
}: {
  search: DashboardSearch;
  updateSearch: (next: Partial<DashboardSearch>) => void;
}) {
  return (
    <div className="tanstack-stack">
      <ProjectsIntro />
      <ProjectsTable search={search} updateSearch={updateSearch} />
    </div>
  );
}

function DashboardOverviewHero() {
  return (
    <Card className={cn(panelClassName, 'overview-hero')}>
      <CardHeader className={panelHeaderClassName}>
        <div>
          <p className={eyebrowClassName}>Dashboard overview</p>
          <CardTitle><h2>Rails-owned app shell with React where it pays off</h2></CardTitle>
          <CardDescription>
            Use this page to orient yourself. The project table lives at /projects,
            while the dashboard explains the app surfaces and shows account-level metrics.
          </CardDescription>
        </div>
        <div className={actionRowClassName}>
          <Button asChild>
            <Link to="/projects">
              View projects
              <ArrowRight aria-hidden="true" size={16} />
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <a href="/rsc-showcase">Open RSC showcase</a>
          </Button>
        </div>
      </CardHeader>
    </Card>
  );
}

function OverviewRouteCards() {
  return (
    <section className="overview-route-grid" aria-labelledby="overview-route-title">
      <div className="overview-route-heading">
        <p className={eyebrowClassName}>Route map</p>
        <h2 id="overview-route-title">Pick the surface you want to inspect</h2>
      </div>
      <div className="overview-route-cards">
        {overviewCards.map((card) => {
          const Icon = card.icon;
          const icon = <Icon aria-hidden="true" size={20} strokeWidth={2.2} />;

          return (
            <Card className="overview-route-card" key={card.href}>
              <CardHeader>
                <span className="overview-route-icon">{icon}</span>
                <div>
                  <CardTitle><h3>{card.title}</h3></CardTitle>
                  <CardDescription>{card.description}</CardDescription>
                </div>
              </CardHeader>
              <CardFooter>
                {card.internal ? (
                  <DashboardLink className="overview-route-link" to={card.href}>
                    {card.label}
                    <ArrowRight aria-hidden="true" size={15} />
                  </DashboardLink>
                ) : (
                  <ExternalDashboardLink className="overview-route-link" href={card.href}>
                    {card.label}
                    <ArrowRight aria-hidden="true" size={15} />
                  </ExternalDashboardLink>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

function ProjectsIntro() {
  return (
    <Card className={panelClassName}>
      <CardHeader className={panelHeaderClassName}>
        <div>
          <p className={eyebrowClassName}>Project workspace</p>
          <CardTitle><h2>Workspace controls</h2></CardTitle>
          <CardDescription>
            This route is the focused TanStack Table surface. Rails owns persistence,
            validation, filtering, sorting, and pagination through the JSON API.
          </CardDescription>
        </div>
        <div className={actionRowClassName}>
          <Button asChild>
            <Link to="/projects/new">Create project</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link to="/dashboard">Dashboard overview</Link>
          </Button>
        </div>
      </CardHeader>
    </Card>
  );
}

function DemoPortfolioCards() {
  return (
    <section className="demo-portfolio" aria-labelledby="demo-portfolio-title">
      <div className="demo-portfolio-header">
        <p className={eyebrowClassName}>Demo portfolio</p>
        <h2 id="demo-portfolio-title">See React on Rails Pro in production</h2>
        <p className={mutedTextClassName}>
          Four sibling apps show the same Rails + React on Rails Pro foundation applied to public RSC,
          e-commerce, Inertia comparison, and migration use cases.
        </p>
      </div>

      <div className="demo-portfolio-grid">
        {demoPortfolioCards.map((card) => (
          <Card className="demo-portfolio-card" key={card.href}>
            <CardHeader>
              <span className={`demo-portfolio-thumbnail demo-portfolio-thumbnail-${card.tone}`}>
                {card.shortLabel}
              </span>
              <div>
                <CardTitle><h3>{card.title}</h3></CardTitle>
                <CardDescription>{card.proofPoint}</CardDescription>
              </div>
            </CardHeader>
            <CardFooter>
              <ExternalDashboardLink
                className="demo-portfolio-link"
                href={card.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open repo
                <ExternalLink aria-hidden="true" size={15} strokeWidth={2.2} />
              </ExternalDashboardLink>
            </CardFooter>
          </Card>
        ))}
      </div>
    </section>
  );
}

function MetricsGrid() {
  const { api } = useDashboardProps();
  const metricsProjectId = api.metricsProjectId;
  const query = useQuery({
    queryKey: ['metrics', metricsProjectId],
    enabled: Boolean(metricsProjectId),
    queryFn: () => apiFetch<MetricsResponse>(`${api.projectsPath}/${metricsProjectId}/metrics`),
  });
  const metrics = [
    ['total', 'Total projects'],
    ['active_count', 'Active projects'],
    ['completed_this_week', 'Completed this week'],
    ['avg_cycle_time', 'Avg. cycle time'],
  ] as const;

  return (
    <section className="metric-grid" aria-label="Project metrics">
      {metrics.map(([key, label]) => (
        <MetricCard
          key={key}
          metricKey={key}
          label={label}
          metricsProjectId={metricsProjectId}
          isPending={query.isPending}
          errorMessage={query.isError ? query.error.message : null}
          value={query.data?.[key] ?? 0}
        />
      ))}
    </section>
  );
}

function MetricCard({
  metricKey,
  label,
  metricsProjectId,
  isPending,
  errorMessage,
  value,
}: {
  metricKey: keyof MetricsResponse;
  label: string;
  metricsProjectId: number | null;
  isPending: boolean;
  errorMessage: string | null;
  value: number;
}) {
  if (!metricsProjectId) {
    return (
      <Card className="metric-card">
        <CardHeader>
          <CardDescription>{label}</CardDescription>
          <CardTitle className="text-3xl"><strong>0</strong></CardTitle>
        </CardHeader>
        <CardContent>
          <p>Create a project to populate metrics.</p>
        </CardContent>
      </Card>
    );
  }

  if (isPending) {
    return (
      <Card className="metric-card metric-card-muted">
        <CardHeader>
          <CardDescription>{label}</CardDescription>
          <CardTitle className="text-3xl"><strong>...</strong></CardTitle>
        </CardHeader>
        <CardContent>
          <p>Loading</p>
        </CardContent>
      </Card>
    );
  }

  if (errorMessage) {
    return (
      <Card className="metric-card metric-card-error border-destructive/50">
        <CardHeader>
          <CardDescription>{label}</CardDescription>
          <CardTitle className="text-3xl"><strong>!</strong></CardTitle>
        </CardHeader>
        <CardContent>
          <p>{errorMessage}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="metric-card">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl"><strong>{formatMetricValue(metricKey, value)}</strong></CardTitle>
      </CardHeader>
      <CardContent>
        <p>{metricHelp[metricKey]}</p>
      </CardContent>
    </Card>
  );
}

function formatMetricValue(metricKey: keyof MetricsResponse, value: number) {
  if (metricKey === 'avg_cycle_time') return `${value}d`;

  return value;
}

function ProjectsTable({
  search,
  updateSearch,
}: {
  search: DashboardSearch;
  updateSearch: (next: Partial<DashboardSearch>) => void;
}) {
  // REFERENCE PATTERN: tanstack-table — see AGENTS.md
  const { api } = useDashboardProps();
  const status = search.status ?? '';
  const sort = search.sort ?? 'last_activity_at';
  const dir = search.dir ?? 'desc';
  const page = search.page ?? 1;

  const projectsQuery = useQuery({
    queryKey: ['projects', status, sort, dir, page],
    queryFn: () => {
      const params = new URLSearchParams({
        sort,
        dir,
        page: String(page),
        per_page: '8',
      });
      if (status) params.set('status', status);

      return apiFetch<ProjectsResponse>(`${api.projectsPath}?${params.toString()}`);
    },
  });

  const columns = useMemo<ColumnDef<Project>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => (
          <DashboardLink
            to="/projects/$projectId"
            params={{ projectId: String(row.original.id) }}
          >
            {row.original.name}
          </DashboardLink>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <ProjectStatusBadge status={row.original.status} />,
      },
      {
        accessorKey: 'last_activity_at',
        header: 'Last activity',
        cell: ({ row }) => new Date(row.original.last_activity_at).toLocaleDateString(),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <DashboardLink
            to="/projects/$projectId/edit"
            params={{ projectId: String(row.original.id) }}
          >
            Edit
          </DashboardLink>
        ),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: projectsQuery.data?.projects ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Card className={panelClassName}>
      <CardHeader className={panelHeaderClassName}>
        <div>
          <p className={eyebrowClassName}>TanStack Table</p>
          <CardTitle><h2>Project list</h2></CardTitle>
          <CardDescription>Server-driven sort, filter, and pagination stored in the URL.</CardDescription>
        </div>
        <Button asChild>
          <Link to="/projects/new">New project</Link>
        </Button>
      </CardHeader>

      <CardContent className="grid gap-4">
        <div className="table-controls">
          <Label className="grid gap-2">
            Status
            <select
              className={inputLikeClassName}
              value={status}
              onChange={(event) => updateSearch({ status: event.target.value || undefined })}
            >
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </Label>
          <Button variant="secondary" type="button" onClick={() => updateSearch({ sort: 'name', dir: sort === 'name' && dir === 'asc' ? 'desc' : 'asc' })}>
            Sort name {sort === 'name' ? dir : ''}
          </Button>
          <Button variant="secondary" type="button" onClick={() => updateSearch({ sort: 'last_activity_at', dir: sort === 'last_activity_at' && dir === 'asc' ? 'desc' : 'asc' })}>
            Sort activity {sort === 'last_activity_at' ? dir : ''}
          </Button>
        </div>

        {projectsQuery.isError ? (
          <Alert variant="destructive">
            <AlertTitle>This section is unavailable.</AlertTitle>
            <AlertDescription>
              <Button variant="outline" type="button" onClick={() => projectsQuery.refetch()}>Retry</Button>
            </AlertDescription>
          </Alert>
        ) : (
          <div className="table-wrap" aria-busy={projectsQuery.isPending}>
            <Table className="data-table">
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {projectsQuery.isPending ? (
                  <TableRow>
                    <TableCell colSpan={columns.length}>Loading projects...</TableCell>
                  </TableRow>
                ) : table.getRowModel().rows.length > 0 ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length}>No projects match this view.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="table-controls">
          <Button variant="secondary" type="button" disabled={page <= 1} onClick={() => updateSearch({ page: page - 1 })}>
            Previous
          </Button>
          <span>Page {page}</span>
          <Button
            variant="secondary"
            type="button"
            disabled={!projectsQuery.data || page * projectsQuery.data.meta.per_page >= projectsQuery.data.meta.total}
            onClick={() => updateSearch({ page: page + 1 })}
          >
            Next
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function projectPath(projectsPath: string, projectId: string) {
  return `${projectsPath}/${projectId}`;
}

function classicProjectPath(classicProjectsPath: string, projectId: string, suffix = '') {
  return `${classicProjectsPath}/${projectId}${suffix}`;
}

function useProject(projectId: string) {
  const { api } = useDashboardProps();

  return useQuery({
    queryKey: ['project', projectId],
    queryFn: () => apiFetch<ProjectResponse>(projectPath(api.projectsPath, projectId)),
  });
}

function NewProjectPage() {
  const { api, setMetricsProjectId } = useDashboardProps();
  const navigate = projectsNewRoute.useNavigate();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (values: ProjectFormValues) =>
      apiFetch<ProjectResponse>(api.projectsPath, {
        method: 'POST',
        json: { project: values },
      }),
    onSuccess: ({ project }) => {
      queryClient.setQueryData(['project', String(project.id)], { project });
      if (!api.metricsProjectId) setMetricsProjectId(project.id);
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      toast.success('Project created.');
      navigate({ to: '/projects/$projectId', params: { projectId: String(project.id) } });
    },
  });

  return (
    <ProjectFormPanel
      title="New project"
      description="Create a project without leaving the TanStack dashboard surface."
      submitLabel="Create project"
      mutation={mutation}
    />
  );
}

function ProjectShowPage() {
  const { projectId } = projectShowRoute.useParams();
  const { links } = useDashboardProps();
  const projectQuery = useProject(projectId);

  return (
    <Card className={panelClassName}>
      <CardHeader className={panelHeaderClassName}>
        <div>
          <p className={eyebrowClassName}>TanStack route</p>
          <CardTitle><h2>{projectQuery.data?.project.name ?? 'Project'}</h2></CardTitle>
          <CardDescription>Read through the Rails JSON API, with the classic Rails CRUD page still available as a fallback.</CardDescription>
        </div>
        <div className={actionRowClassName}>
          <Button asChild>
            <Link to="/projects/$projectId/edit" params={{ projectId }}>Edit</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link to="/dashboard">Dashboard</Link>
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {projectQuery.isPending ? (
          <p className="auth-muted">Loading project...</p>
        ) : projectQuery.isError ? (
          <Alert variant="destructive">
            <AlertTitle>Project unavailable</AlertTitle>
            <AlertDescription>
              <p>{projectQuery.error.message}</p>
              <Button variant="outline" type="button" onClick={() => projectQuery.refetch()}>
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          <div className="project-summary">
            <div>
              <h3>Description</h3>
              <p>{projectQuery.data.project.description || 'No description yet.'}</p>
            </div>
            <div className="project-meta">
              <ProjectStatusBadge status={projectQuery.data.project.status} />
              <Badge variant="outline">
                Last activity {new Date(projectQuery.data.project.last_activity_at).toLocaleDateString()}
              </Badge>
            </div>
            <ExternalDashboardLink href={classicProjectPath(links.classicProjects, projectId)}>
              Open classic Rails-rendered project page
            </ExternalDashboardLink>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EditProjectPage() {
  const { projectId } = projectEditRoute.useParams();
  const { api } = useDashboardProps();
  const queryClient = useQueryClient();
  const projectQuery = useProject(projectId);
  const navigate = projectEditRoute.useNavigate();
  const mutation = useMutation({
    mutationFn: (values: ProjectFormValues) =>
      apiFetch<ProjectResponse>(projectPath(api.projectsPath, projectId), {
        method: 'PATCH',
        json: { project: values },
      }),
    onSuccess: ({ project }) => {
      queryClient.setQueryData(['project', String(project.id)], { project });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      toast.success('Project saved.');
      navigate({ to: '/projects/$projectId', params: { projectId: String(project.id) } });
    },
  });

  if (projectQuery.isPending) {
    return (
      <Card className={panelClassName}>
        <CardContent>Loading project...</CardContent>
      </Card>
    );
  }

  if (projectQuery.isError) {
    return (
      <Alert className={panelClassName} variant="destructive">
        <AlertTitle>Project unavailable</AlertTitle>
        <AlertDescription>
          <p>{projectQuery.error.message}</p>
          <Button className="mt-3" type="button" onClick={() => projectQuery.refetch()}>
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <ProjectFormPanel
      title="Edit project"
      description="The client route submits to Rails, so model validations remain the source of truth."
      submitLabel="Save project"
      initialProject={projectQuery.data.project}
      mutation={mutation}
    />
  );
}

function ProjectFormPanel({
  title,
  description,
  submitLabel,
  initialProject,
  mutation,
}: {
  title: string;
  description: string;
  submitLabel: string;
  initialProject?: Project;
  mutation: UseMutationResult<ProjectResponse, Error, ProjectFormValues>;
}) {
  const [name, setName] = useState(initialProject?.name ?? '');
  const [projectDescription, setProjectDescription] = useState(initialProject?.description ?? '');
  const [status, setStatus] = useState(initialProject?.status ?? 'active');
  const { links } = useDashboardProps();

  useEffect(() => {
    if (!initialProject) return;

    setName(initialProject.name);
    setProjectDescription(initialProject.description ?? '');
    setStatus(initialProject.status);
  }, [initialProject]);

  return (
    <Card className={panelClassName}>
      <CardHeader className={panelHeaderClassName}>
        <div>
          <p className={eyebrowClassName}>TanStack Router</p>
          <CardTitle><h2>{title}</h2></CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <ExternalDashboardLink
          href={
            initialProject
              ? classicProjectPath(links.classicProjects, String(initialProject.id), '/edit')
              : `${links.classicProjects}/new`
          }
        >
          Open classic Rails form
        </ExternalDashboardLink>
      </CardHeader>

      <CardContent>
        <form
          className={formClassName}
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate({
              name,
              description: projectDescription,
              status,
            });
          }}
        >
          <div className={fieldClassName}>
            <Label htmlFor="project_name">Name</Label>
            <Input
              id="project_name"
              value={name}
              maxLength={120}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className={fieldClassName}>
            <Label htmlFor="project_description">Description</Label>
            <textarea
              id="project_description"
              className={inputLikeClassName}
              value={projectDescription}
              rows={5}
              maxLength={2_000}
              onChange={(event) => setProjectDescription(event.target.value)}
            />
          </div>
          <div className={fieldClassName}>
            <Label htmlFor="project_status">Status</Label>
            <select id="project_status" className={inputLikeClassName} value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          {mutation.isError ? (
            <Alert variant="destructive">
              <AlertTitle>Unable to save project</AlertTitle>
              <AlertDescription>{mutation.error.message}</AlertDescription>
            </Alert>
          ) : null}
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving...' : submitLabel}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function SettingsLayout() {
  return (
    <Card className={panelClassName}>
      <CardHeader className={panelHeaderClassName}>
        <div>
          <p className={eyebrowClassName}>TanStack Router</p>
          <CardTitle><h2>Account preferences</h2></CardTitle>
          <CardDescription>Nested routes render client-side without leaving the Rails shell.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
      <nav className="tanstack-nav tanstack-tabs" aria-label="Settings tabs">
        <DashboardLink to="/settings">Overview</DashboardLink>
        <DashboardLink to="/settings/profile">Profile</DashboardLink>
        <DashboardLink to="/settings/security">Security</DashboardLink>
      </nav>
      <Outlet />
      </CardContent>
    </Card>
  );
}

function SettingsOverview() {
  const { user } = useDashboardProps();

  return (
    <div className="settings-pane">
      <h3>{user.name}</h3>
      <p className={mutedTextClassName}>{user.emailAddress}</p>
    </div>
  );
}

function ProfileSettings() {
  const { user, setUser } = useDashboardProps();
  const [name, setName] = useState(user.name);
  const [emailAddress, setEmailAddress] = useState(user.emailAddress);
  const mutation = useMutation({
    mutationFn: () =>
      apiFetch<{ user?: DashboardAppProps['user']; redirect_to?: string }>('/settings/profile', {
        method: 'PATCH',
        json: {
          user: {
            name,
            email_address: emailAddress,
          },
        },
      }),
    onSuccess: (payload) => {
      if (payload.redirect_to && typeof window !== 'undefined') {
        window.location.assign(payload.redirect_to);
      }
      if (payload.user) setUser(payload.user);
    },
  });

  useEffect(() => {
    if (mutation.isSuccess && !mutation.data?.redirect_to) {
      toast.success('Profile updated.', { duration: 6_000 });
    }
  }, [mutation.data?.redirect_to, mutation.isSuccess]);

  return (
    <form className={formClassName} onSubmit={(event) => { event.preventDefault(); mutation.mutate(); }}>
      <div className={fieldClassName}>
        <Label htmlFor="settings_name">Name</Label>
        <Input id="settings_name" value={name} onChange={(event) => setName(event.target.value)} />
      </div>
      <div className={fieldClassName}>
        <Label htmlFor="settings_email">Email</Label>
        <Input id="settings_email" type="email" value={emailAddress} onChange={(event) => setEmailAddress(event.target.value)} />
      </div>
      {mutation.isError ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to update profile</AlertTitle>
          <AlertDescription>{mutation.error.message}</AlertDescription>
        </Alert>
      ) : null}
      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? 'Saving...' : 'Save profile'}
      </Button>
    </form>
  );
}

function SecuritySettings() {
  return (
    <div className="settings-pane">
      <h3>Password</h3>
      <p className={mutedTextClassName}>Use the Rails password reset flow to rotate credentials.</p>
      <Button asChild>
        <a href="/passwords/new">Send reset link</a>
      </Button>
    </div>
  );
}

function RenderingModeDrawer() {
  const [open, setOpen] = useState(false);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);

  return (
    <Card className={panelClassName}>
      <CardHeader className={panelHeaderClassName}>
        <div>
          <p className={eyebrowClassName}>Rendering mode</p>
          <CardTitle><h2>Classic SSR + TanStack</h2></CardTitle>
          <CardDescription>This authenticated surface renders through React on Rails Pro's Node renderer, then TanStack Router, Query, and Table own the client experience.</CardDescription>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              className="rendering-info-button"
              type="button"
              variant="secondary"
              size="icon"
              aria-label="Rendering mode details"
            >
              <Info aria-hidden="true" size={18} strokeWidth={2.3} />
            </Button>
          </DialogTrigger>
          <DialogContent
            className="rendering-mode-dialog"
            onOpenAutoFocus={(event) => {
              event.preventDefault();
              firstLinkRef.current?.focus();
            }}
          >
            <DialogHeader>
              <DialogTitle>Rendering on this page</DialogTitle>
              <DialogDescription>
                This app keeps Rails as the system of record and chooses the React rendering model that fits each surface.
              </DialogDescription>
            </DialogHeader>

            <div className="rendering-mode-grid">
              <section className="rendering-mode-section">
                <Badge>Dashboard</Badge>
                <h3>This page (/dashboard) - classic SSR via the Pro Node renderer.</h3>
                <p>
                  Behind auth, type-safe routing, interactivity, URL state, and cached Rails-backed data
                  matter more than public cold-load SEO wins.
                </p>
              </section>

              <section className="rendering-mode-section">
                <Badge variant="secondary">Public</Badge>
                <h3>The public RSC showcase (/rsc-showcase) - RSC composed inside TanStack.</h3>
                <p>
                  The root path is a Rails landing page; the showcase is the public RSC route where a
                  TanStack loader composes a Pro payload with client islands.
                </p>
                <ExternalDashboardLink
                  className="rendering-mode-inline-link"
                  href="/rsc-showcase"
                  target="_blank"
                  rel="noopener noreferrer"
                  ref={firstLinkRef}
                >
                  Open RSC showcase
                  <ExternalLink aria-hidden="true" size={14} />
                </ExternalDashboardLink>
              </section>

              <section className="rendering-mode-section">
                <Badge variant="outline">Classic Rails</Badge>
                <h3>Classic Rails views - incremental React where useful.</h3>
                <p>
                  Rails-shaped CRUD pages can stay Rails-shaped, with React islands added only where the
                  page earns the extra client-side surface.
                </p>
                <ExternalDashboardLink
                  className="rendering-mode-inline-link"
                  href="/classic/projects"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open classic projects
                  <ExternalLink aria-hidden="true" size={14} />
                </ExternalDashboardLink>
              </section>
            </div>

            <div className="rendering-mode-summary">
              <p className="font-medium text-foreground">Surface-aware rendering - pick the right tool per surface.</p>
              <p>
                Use RSC where streaming and public content pay off, SSR where authenticated interaction
                matters, and classic Rails views where full React is not the simplest path.
              </p>
              <div className="rendering-mode-links">
                <ExternalDashboardLink
                  className="rendering-mode-inline-link"
                  href={rscThesisUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Full thesis
                  <ExternalLink aria-hidden="true" size={14} />
                </ExternalDashboardLink>
                <ExternalDashboardLink
                  className="rendering-mode-inline-link"
                  href={hackerNewsDemoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Hacker News RSC demo
                  <ExternalLink aria-hidden="true" size={14} />
                </ExternalDashboardLink>
                <ExternalDashboardLink
                  className="rendering-mode-inline-link"
                  href={gumroadDemoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Gumroad Inertia comparison
                  <ExternalLink aria-hidden="true" size={14} />
                </ExternalDashboardLink>
              </div>
            </div>

            <div className="rendering-mode-cta">
              <div>
                <p className="font-medium text-foreground">Built on React on Rails Pro</p>
                <p>Rails owns the app; Pro owns the rendering boundary.</p>
              </div>
              <ExternalDashboardLink
                className="rendering-mode-inline-link"
                href={reactOnRailsProUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Why Pro
                <ExternalLink aria-hidden="true" size={14} />
              </ExternalDashboardLink>
            </div>

            <DialogFooter>
              <Button variant="secondary" type="button" onClick={() => setOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
    </Card>
  );
}

type DashboardAppWrapperProps = DashboardAppProps & {
  children?: React.ReactNode;
  __tanstackRouterDehydratedState?: unknown;
};

type RailsContext = {
  serverSide?: boolean;
};

type DehydratedRouterMatch = {
  i: string;
  u: number;
  s: string;
  b?: unknown;
  l?: unknown;
  e?: unknown;
  ssr?: unknown;
};

type DehydratedRouterState = {
  dehydratedRouter?: unknown;
  ssrRouter?: {
    matches?: DehydratedRouterMatch[];
  };
};

type DashboardRouter = ReturnType<TanStackRouterOptions['createRouter']>;

type DashboardRenderFunction = {
  (props?: Record<string, unknown>, railsContext?: RailsContext): unknown;
  renderFunction?: boolean;
};

function DashboardAppWrapper(input: { children?: React.ReactNode } & Record<string, unknown>) {
  const {
    children,
    __tanstackRouterDehydratedState: _dehydratedRouterState,
    ...props
  } = input as DashboardAppWrapperProps;
  const queryClient = useMemo(() => createQueryClient(), []);
  const [metricsProjectId, setMetricsProjectId] = useState(props.api.metricsProjectId);
  const [user, setUser] = useState(props.user);
  const showDevtools = showTanStackDevtools();
  const dashboardProps = {
    ...props,
    user,
    api: {
      ...props.api,
      metricsProjectId,
    },
    setMetricsProjectId,
    setUser,
  };

  return (
    <DashboardPropsContext.Provider value={dashboardProps}>
      <QueryClientProvider client={queryClient}>
        {children}
        {showDevtools ? (
          <Suspense fallback={null}>
            <ReactQueryDevtools initialIsOpen={false} />
          </Suspense>
        ) : null}
      </QueryClientProvider>
    </DashboardPropsContext.Provider>
  );
}

const createDashboardRouter: TanStackRouterOptions['createRouter'] = () =>
  installRouterStoreShim(
    createRouter({ routeTree }) as unknown as ReturnType<TanStackRouterOptions['createRouter']>,
  );
const DashboardRouterProvider = RouterProvider as unknown as React.ComponentType<{
  router: ReturnType<TanStackRouterOptions['createRouter']>;
}>;

const tanStackRouterOptions: TanStackRouterOptions = {
  createRouter: createDashboardRouter,
  AppWrapper: DashboardAppWrapper,
};

const rehydrateMatchId = (id: string) => id.split('\0').join('/');

const applyDehydratedMatchData = (matches: unknown[], dehydratedMatches: DehydratedRouterMatch[] = []) =>
  matches.map((match) => {
    const currentMatch = match as Record<string, unknown>;
    const dehydratedMatch = dehydratedMatches.find((candidate) => rehydrateMatchId(candidate.i) === currentMatch.id);

    if (!dehydratedMatch) {
      return currentMatch.status === 'pending' ? { ...currentMatch, status: 'success' } : match;
    }

    return {
      ...currentMatch,
      status: dehydratedMatch.s,
      updatedAt: dehydratedMatch.u,
      ...(dehydratedMatch.b !== undefined ? { __beforeLoadContext: dehydratedMatch.b } : {}),
      ...(dehydratedMatch.l !== undefined ? { loaderData: dehydratedMatch.l } : {}),
      ...(dehydratedMatch.e !== undefined ? { error: dehydratedMatch.e } : {}),
      ...(dehydratedMatch.ssr !== undefined ? { ssr: dehydratedMatch.ssr } : {}),
    };
  });

const createHydratedDashboardRouter = (dehydratedState: DehydratedRouterState | null) => {
  type HydrationRouter = DashboardRouter & {
    hydrate?: (payload: unknown) => void;
    matchRoutes?: (location: unknown) => unknown[];
    ssr?: unknown;
  };

  const router = createDashboardRouter() as HydrationRouter;
  router.update({ history: createBrowserHistory() });

  if (!dehydratedState || typeof router.matchRoutes !== 'function') {
    return router;
  }

  const rawMatches = router.matchRoutes(router.state.location);
  const matches = applyDehydratedMatchData(rawMatches, dehydratedState.ssrRouter?.matches);
  router.__store?.setState((state) => ({
    ...state,
    status: 'idle',
    resolvedLocation: state.location,
    matches,
  }));
  router.ssr ??= { manifest: undefined };

  if (dehydratedState.dehydratedRouter !== undefined && dehydratedState.dehydratedRouter !== null) {
    router.hydrate?.(dehydratedState.dehydratedRouter);
  }

  return router;
};

function DashboardClientApp(props: DashboardAppWrapperProps) {
  const routerRef = useRef<DashboardRouter | null>(null);
  const dehydratedState = props.__tanstackRouterDehydratedState as DehydratedRouterState | null;

  if (routerRef.current === null) {
    routerRef.current = createHydratedDashboardRouter(dehydratedState);
  }

  useEffect(() => {
    const router = routerRef.current as (DashboardRouter & { cancelLoad?: () => void; ssr?: unknown }) | null;
    if (!router || !dehydratedState) return undefined;

    let cancelled = false;
    void router.load()
      .catch((error: unknown) => {
        if (!cancelled) console.error('Dashboard TanStack Router hydration load failed:', error);
      })
      .finally(() => {
        if (!cancelled) router.ssr = undefined;
      });

    return () => {
      cancelled = true;
      router.ssr = undefined;
      router.cancelLoad?.();
    };
  }, [dehydratedState]);

  return (
    <DashboardAppWrapper {...props}>
      <DashboardRouterProvider router={routerRef.current} />
    </DashboardAppWrapper>
  );
}

// REFERENCE PATTERN: tanstack-route — see AGENTS.md
const DashboardApp: DashboardRenderFunction = (props = {}, railsContext) => {
  if (!railsContext) {
    throw new Error('DashboardApp requires railsContext from react_component.');
  }

  if (railsContext.serverSide) {
    return serverRenderTanStackAppAsync(
      tanStackRouterOptions,
      props,
      railsContext as never,
      DashboardRouterProvider,
      createMemoryHistory,
    ).then(({ appElement, dehydratedState }) => ({
      renderedHtml: appElement,
      clientProps: {
        __tanstackRouterDehydratedState: dehydratedState,
      },
    }));
  }

  return function DashboardClientComponent(clientProps: DashboardAppWrapperProps) {
    return <DashboardClientApp {...clientProps} />;
  };
};

DashboardApp.renderFunction = true;

export default DashboardApp;

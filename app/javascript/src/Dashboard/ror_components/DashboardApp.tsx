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
import { Button } from '@/components/ui/button';
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

function RootLayout() {
  const { user, links } = useDashboardProps();
  const router = useRouter();
  const showDevtools = showTanStackDevtools();

  return (
    <main className="tanstack-shell">
      <header className="tanstack-header">
        <div>
          <p className="tanstack-eyebrow">React on Rails + TanStack</p>
          <h1>Dashboard</h1>
          <p>Signed in as <strong>{user.emailAddress}</strong>.</p>
        </div>
        <nav className="tanstack-nav" aria-label="Dashboard navigation">
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/projects">Projects</Link>
          <Link to="/settings">Settings</Link>
          <a href={links.classicProjects}>Classic Rails CRUD</a>
          <Button asChild size="sm" className="shrink-0">
            <Link to="/projects/new">Create project</Link>
          </Button>
        </nav>
      </header>

      <Suspense fallback={<section className="tanstack-panel">Loading route...</section>}>
        <Outlet />
      </Suspense>

      {showDevtools ? (
        <Suspense fallback={null}>
          <TanStackRouterDevtools router={router} position="bottom-right" />
        </Suspense>
      ) : null}
    </main>
  );
}

function RouteError({ error }: { error: Error }) {
  return (
    <section className="tanstack-panel" role="alert">
      <h2>This section is unavailable</h2>
      <p>{error.message}</p>
      <button className="auth-button" type="button" onClick={() => window.location.reload()}>
        Retry
      </button>
    </section>
  );
}

function DashboardPage() {
  const search = dashboardRoute.useSearch();
  const navigate = dashboardRoute.useNavigate();

  return (
    <DashboardContent
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

function ProjectsIndexPage() {
  const search = projectsIndexRoute.useSearch();
  const navigate = projectsIndexRoute.useNavigate();

  return (
    <DashboardContent
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

function DashboardContent({
  search,
  updateSearch,
}: {
  search: DashboardSearch;
  updateSearch: (next: Partial<DashboardSearch>) => void;
}) {
  return (
    <div className="tanstack-stack">
      <RenderingModeDrawer />
      <MetricsGrid />
      <ProjectsTable search={search} updateSearch={updateSearch} />
    </div>
  );
}

function MetricsGrid() {
  const { api } = useDashboardProps();
  const metricsProjectId = api.metricsProjectId;
  const metrics = [
    ['total', 'Total projects'],
    ['active_count', 'Active projects'],
    ['completed_this_week', 'Completed this week'],
    ['avg_cycle_time', 'Avg. cycle time'],
  ] as const;

  return (
    <section className="metric-grid" aria-label="Project metrics">
      {metrics.map(([key, label]) => (
        <MetricCard key={key} metricKey={key} label={label} metricsProjectId={metricsProjectId} />
      ))}
    </section>
  );
}

function MetricCard({
  metricKey,
  label,
  metricsProjectId,
}: {
  metricKey: keyof MetricsResponse;
  label: string;
  metricsProjectId: number | null;
}) {
  const { api } = useDashboardProps();
  const query = useQuery({
    queryKey: ['metric', metricKey, metricsProjectId],
    enabled: Boolean(metricsProjectId),
    queryFn: () => apiFetch<MetricsResponse>(`${api.projectsPath}/${metricsProjectId}/metrics`),
  });

  if (!metricsProjectId) {
    return (
      <article className="metric-card">
        <span>{label}</span>
        <strong>0</strong>
        <p>Create a project to populate metrics.</p>
      </article>
    );
  }

  if (query.isPending) {
    return (
      <article className="metric-card metric-card-muted">
        <span>{label}</span>
        <strong>...</strong>
        <p>Loading</p>
      </article>
    );
  }

  if (query.isError) {
    return (
      <article className="metric-card metric-card-error">
        <span>{label}</span>
        <strong>!</strong>
        <p>{query.error.message}</p>
      </article>
    );
  }

  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{query.data[metricKey]}</strong>
      <p>Loaded independently with TanStack Query.</p>
    </article>
  );
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
          <Link
            className="auth-link"
            to="/projects/$projectId"
            params={{ projectId: String(row.original.id) }}
          >
            {row.original.name}
          </Link>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <span className="project-badge">{row.original.status}</span>,
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
          <Link
            className="auth-link"
            to="/projects/$projectId/edit"
            params={{ projectId: String(row.original.id) }}
          >
            Edit
          </Link>
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
    <section className="tanstack-panel">
      <div className="tanstack-panel-header">
        <div>
          <p className="tanstack-eyebrow">TanStack Table</p>
          <h2>Projects</h2>
          <p>Server-driven sort, filter, and pagination stored in the URL.</p>
        </div>
        <Link className="auth-button" to="/projects/new">New project</Link>
      </div>

      <div className="table-controls">
        <label>
          Status
          <select
            value={status}
            onChange={(event) => updateSearch({ status: event.target.value || undefined })}
          >
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <button className="auth-button auth-button-secondary" type="button" onClick={() => updateSearch({ sort: 'name', dir: sort === 'name' && dir === 'asc' ? 'desc' : 'asc' })}>
          Sort name {sort === 'name' ? dir : ''}
        </button>
        <button className="auth-button auth-button-secondary" type="button" onClick={() => updateSearch({ sort: 'last_activity_at', dir: sort === 'last_activity_at' && dir === 'asc' ? 'desc' : 'asc' })}>
          Sort activity {sort === 'last_activity_at' ? dir : ''}
        </button>
      </div>

      {projectsQuery.isError ? (
        <div className="auth-alert" role="alert">
          This section is unavailable. <button type="button" onClick={() => projectsQuery.refetch()}>Retry</button>
        </div>
      ) : (
        <div className="table-wrap" aria-busy={projectsQuery.isPending}>
          <table className="data-table">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th key={header.id}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {projectsQuery.isPending ? (
                <tr>
                  <td colSpan={columns.length}>Loading projects...</td>
                </tr>
              ) : table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map((row) => (
                  <tr key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length}>No projects match this view.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="table-controls">
        <button className="auth-button auth-button-secondary" type="button" disabled={page <= 1} onClick={() => updateSearch({ page: page - 1 })}>
          Previous
        </button>
        <span>Page {page}</span>
        <button
          className="auth-button auth-button-secondary"
          type="button"
          disabled={!projectsQuery.data || page * projectsQuery.data.meta.per_page >= projectsQuery.data.meta.total}
          onClick={() => updateSearch({ page: page + 1 })}
        >
          Next
        </button>
      </div>
    </section>
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
      queryClient.invalidateQueries({ queryKey: ['metric'] });
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
    <section className="tanstack-panel">
      <div className="tanstack-panel-header">
        <div>
          <p className="tanstack-eyebrow">TanStack route</p>
          <h2>{projectQuery.data?.project.name ?? 'Project'}</h2>
          <p>Read through the Rails JSON API, with the classic Rails CRUD page still available as a fallback.</p>
        </div>
        <div className="auth-actions">
          <Link className="auth-button" to="/projects/$projectId/edit" params={{ projectId }}>
            Edit
          </Link>
          <Link className="auth-button auth-button-secondary" to="/dashboard">
            Dashboard
          </Link>
        </div>
      </div>

      {projectQuery.isPending ? (
        <p className="auth-muted">Loading project...</p>
      ) : projectQuery.isError ? (
        <div className="auth-alert" role="alert">
          {projectQuery.error.message}
          <button className="auth-button auth-button-secondary" type="button" onClick={() => projectQuery.refetch()}>
            Retry
          </button>
        </div>
      ) : (
        <div className="project-summary">
          <div>
            <h3>Description</h3>
            <p>{projectQuery.data.project.description || 'No description yet.'}</p>
          </div>
          <div className="project-meta">
            <span className="project-badge">{projectQuery.data.project.status}</span>
            <span className="project-badge">
              Last activity {new Date(projectQuery.data.project.last_activity_at).toLocaleDateString()}
            </span>
          </div>
          <a className="auth-link" href={classicProjectPath(links.classicProjects, projectId)}>
            Open classic Rails-rendered project page
          </a>
        </div>
      )}
    </section>
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
      queryClient.invalidateQueries({ queryKey: ['metric'] });
      navigate({ to: '/projects/$projectId', params: { projectId: String(project.id) } });
    },
  });

  if (projectQuery.isPending) {
    return <section className="tanstack-panel">Loading project...</section>;
  }

  if (projectQuery.isError) {
    return (
      <section className="tanstack-panel" role="alert">
        <h2>Project unavailable</h2>
        <p>{projectQuery.error.message}</p>
        <button className="auth-button" type="button" onClick={() => projectQuery.refetch()}>
          Retry
        </button>
      </section>
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
    <section className="tanstack-panel">
      <div className="tanstack-panel-header">
        <div>
          <p className="tanstack-eyebrow">TanStack Router</p>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <a
          className="auth-link"
          href={
            initialProject
              ? classicProjectPath(links.classicProjects, String(initialProject.id), '/edit')
              : `${links.classicProjects}/new`
          }
        >
          Open classic Rails form
        </a>
      </div>

      <form
        className="auth-form settings-pane"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate({
            name,
            description: projectDescription,
            status,
          });
        }}
      >
        <div className="auth-field">
          <label className="auth-label" htmlFor="project_name">Name</label>
          <input
            id="project_name"
            className="auth-input"
            value={name}
            maxLength={120}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div className="auth-field">
          <label className="auth-label" htmlFor="project_description">Description</label>
          <textarea
            id="project_description"
            className="auth-input"
            value={projectDescription}
            rows={5}
            maxLength={2_000}
            onChange={(event) => setProjectDescription(event.target.value)}
          />
        </div>
        <div className="auth-field">
          <label className="auth-label" htmlFor="project_status">Status</label>
          <select id="project_status" className="auth-input" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        {mutation.isError ? <div className="auth-alert" role="alert">{mutation.error.message}</div> : null}
        <button className="auth-button" type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving...' : submitLabel}
        </button>
      </form>
    </section>
  );
}

function SettingsLayout() {
  return (
    <section className="tanstack-panel">
      <div className="tanstack-panel-header">
        <div>
          <p className="tanstack-eyebrow">TanStack Router</p>
          <h2>Settings</h2>
          <p>Nested routes render client-side without leaving the Rails shell.</p>
        </div>
      </div>
      <nav className="tanstack-nav tanstack-tabs" aria-label="Settings tabs">
        <Link to="/settings">Overview</Link>
        <Link to="/settings/profile">Profile</Link>
        <Link to="/settings/security">Security</Link>
      </nav>
      <Outlet />
    </section>
  );
}

function SettingsOverview() {
  const { user } = useDashboardProps();

  return (
    <div className="settings-pane">
      <h3>{user.name}</h3>
      <p>{user.emailAddress}</p>
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

  return (
    <form className="auth-form settings-pane" onSubmit={(event) => { event.preventDefault(); mutation.mutate(); }}>
      <div className="auth-field">
        <label className="auth-label" htmlFor="settings_name">Name</label>
        <input id="settings_name" className="auth-input" value={name} onChange={(event) => setName(event.target.value)} />
      </div>
      <div className="auth-field">
        <label className="auth-label" htmlFor="settings_email">Email</label>
        <input id="settings_email" className="auth-input" type="email" value={emailAddress} onChange={(event) => setEmailAddress(event.target.value)} />
      </div>
      {mutation.isError ? <div className="auth-alert" role="alert">{mutation.error.message}</div> : null}
      {mutation.isSuccess && !mutation.data.redirect_to ? <div className="auth-notice">Profile updated.</div> : null}
      <button className="auth-button" type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? 'Saving...' : 'Save profile'}
      </button>
    </form>
  );
}

function SecuritySettings() {
  return (
    <div className="settings-pane">
      <h3>Password</h3>
      <p>Use the Rails password reset flow to rotate credentials.</p>
      <a className="auth-button" href="/passwords/new">Send reset link</a>
    </div>
  );
}

function RenderingModeDrawer() {
  const [open, setOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || typeof document === 'undefined') return undefined;

    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    drawerRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        return;
      }

      if (event.key !== 'Tab' || !drawerRef.current) return;

      const focusable = Array.from(
        drawerRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'),
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [open]);

  return (
    <section className="tanstack-panel">
      <div className="tanstack-panel-header">
        <div>
          <p className="tanstack-eyebrow">Rendering mode</p>
          <h2>Classic SSR + TanStack</h2>
          <p>This authenticated surface renders through React on Rails Pro's Node renderer, then TanStack Router, Query, and Table own the client experience.</p>
        </div>
        <button
          className="auth-button auth-button-secondary rendering-info-button"
          type="button"
          aria-expanded={open}
          aria-label="Rendering mode details"
          onClick={() => setOpen((value) => !value)}
        >
          i
        </button>
      </div>
      {open ? (
        <div className="drawer" role="dialog" aria-label="Rendering mode details" ref={drawerRef} tabIndex={-1}>
          <p>The public landing is where RSC streaming pays off for cold visitors and SEO. Behind auth, URL state, cached data, and table interactivity matter more.</p>
          <div className="auth-actions">
            <a className="auth-link" href="https://github.com/shakacode/react-on-rails-demo-hacker-news-rsc">Hacker News RSC demo</a>
            <a className="auth-link" href="https://github.com/shakacode/react-on-rails-demo-ssr-hmr">SSR/HMR demo</a>
            <button className="auth-button auth-button-secondary" type="button" onClick={() => setOpen(false)}>
              Close
            </button>
          </div>
        </div>
      ) : null}
    </section>
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

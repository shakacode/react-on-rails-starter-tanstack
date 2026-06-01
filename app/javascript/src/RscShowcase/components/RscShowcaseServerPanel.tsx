import React from 'react';
import RscShowcaseReaction from './RscShowcaseReaction';

type RscShowcaseServerPanelProps = {
  requestedBy?: string;
};

const sourceSnippet = `const rscShowcaseRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/rsc-showcase',
  loader: () => ({
    componentName: 'RscShowcaseServerPanel',
    componentProps: { requestedBy: 'TanStack Router loader' },
  }),
  component: () => <RSCRoute {...rscShowcaseRoute.useLoaderData()} />,
});`;

const wait = (milliseconds: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });

async function loadBridgeNotes() {
  await wait(80);

  return [
    'Rails still owns the route, session, CSP, and component payload endpoint.',
    'React on Rails Pro renders the Server Component payload through the exported RSCRoute helper.',
    'TanStack Router owns the route data and keeps this payload demo separate from the /hello_server streaming client island.',
  ];
}

const RscShowcaseServerPanel = async ({
  requestedBy = 'TanStack Router loader',
}: RscShowcaseServerPanelProps) => {
  const notes = await loadBridgeNotes();
  const renderedAt = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  });

  return (
    <article className="min-w-0 rounded-lg border border-slate-300 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-950">
      <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
        <p className="text-xs font-semibold uppercase text-sky-700 dark:text-sky-300">
          Server component payload
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-normal text-slate-950 dark:text-white">
          RSC streamed by Rails, consumed by a TanStack route
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Requested by {requestedBy}; rendered on the server at {renderedAt}.
        </p>
      </div>

      <div className="grid gap-5 p-5">
        <section className="rounded-md border border-emerald-300 bg-emerald-50 p-4 text-emerald-950 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-50">
          <p className="text-xs font-semibold uppercase text-emerald-700 dark:text-emerald-300">
            Server payload proof
          </p>
          <h3 className="mt-2 text-lg font-semibold tracking-normal">
            The server panel code stays out of the browser bundle.
          </h3>
          <p className="mt-2 text-sm text-emerald-900/80 dark:text-emerald-100/80">
            Rails and Pro rendered these notes into the RSC payload. Any client interactivity is explicit
            and visible, instead of being mixed into the lower-level streaming reference.
          </p>
          <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
            <div className="rounded border border-emerald-200 bg-white/70 p-3 dark:border-emerald-800 dark:bg-emerald-950/50">
              <dt className="text-emerald-700 dark:text-emerald-300">Server panel JS shipped</dt>
              <dd className="mt-1 text-xl font-semibold">0 KB</dd>
            </div>
            <div className="rounded border border-emerald-200 bg-white/70 p-3 dark:border-emerald-800 dark:bg-emerald-950/50">
              <dt className="text-emerald-700 dark:text-emerald-300">Client boundary</dt>
              <dd className="mt-1 text-xl font-semibold">Called out</dd>
            </div>
            <div className="rounded border border-emerald-200 bg-white/70 p-3 dark:border-emerald-800 dark:bg-emerald-950/50">
              <dt className="text-emerald-700 dark:text-emerald-300">Transport</dt>
              <dd className="mt-1 text-xl font-semibold">Flight data</dd>
            </div>
          </dl>
        </section>

        <pre className="max-w-full overflow-x-auto rounded-md border border-slate-800 bg-slate-950 p-4 text-sm leading-6 text-slate-100">
          <code>{sourceSnippet}</code>
        </pre>

        <ul className="grid gap-3">
          {notes.map((note) => (
            <li key={note} className="flex gap-3 text-sm text-slate-700 dark:text-slate-200">
              <span className="mt-1 size-2 rounded-full bg-sky-500" aria-hidden="true" />
              <span>{note}</span>
            </li>
          ))}
        </ul>

        <RscShowcaseReaction initialCount={1} />
      </div>
    </article>
  );
};

export default RscShowcaseServerPanel;

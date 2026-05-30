import React from 'react';
import RscShowcaseReaction from './RscShowcaseReaction';

type RscShowcaseServerPanelProps = {
  requestedBy?: string;
};

const sourceSnippet = `const rscShowcaseRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/rsc-showcase',
  loader: () => fetch('/rsc_payload/RscShowcaseServerPanel'),
  component: RscShowcasePage,
});`;

const wait = (milliseconds: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });

async function loadBridgeNotes() {
  await wait(80);

  return [
    'Rails still owns the route, session, CSP, and component payload endpoint.',
    'React on Rails Pro renders the Server Component payload through the Webpack bridge.',
    'TanStack Router treats the payload as loader data and composes it with route-level client UI.',
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
    <article className="rounded-lg border border-slate-300 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-950">
      <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
        <p className="text-xs font-semibold uppercase text-sky-700 dark:text-sky-300">
          Server component payload
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-normal text-slate-950 dark:text-white">
          RSC streamed by Rails, consumed by a TanStack loader
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Requested by {requestedBy}; rendered on the server at {renderedAt}.
        </p>
      </div>

      <div className="grid gap-5 p-5">
        <pre className="overflow-x-auto rounded-md border border-slate-800 bg-slate-950 p-4 text-sm leading-6 text-slate-100">
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

# Demo Evaluator Checklist

Use this checklist when reviewing the public demo or a local checkout. It is a
manual route-by-route pass for understanding what to click and what each surface
proves. It is not a deployed smoke test, release gate, or architecture diagram.

## Before You Start

- Public demo base URL: <https://starter.reactonrails.com>
- Local base URL: <http://localhost:3000> after `bin/setup` and `bin/dev`
- Demo login: `demo@example.com` / `password`

When using the public demo, prefer read-only checks. If you need to create data,
use a disposable project name such as `Review checklist <your initials>` and set
it to `archived` when you are done. Do not change the shared demo account email,
and avoid leaving a changed display name behind, unless you are intentionally
testing the email-verification gate in a disposable environment.

## Fast Reviewer Path

| Step | Click or visit | Expected result | What it proves |
| --- | --- | --- | --- |
| 1 | `/` | The Rails landing page loads, shows the route map, source links, AI-agent prompts, and demo login hint. | Rails serves the public shell and links reviewers to the main example surfaces. |
| 2 | On `/`, click `Open the RSC showcase`. | `/rsc-showcase` opens without requiring sign-in. | The public RSC + TanStack route is separate from authenticated dashboard routes. |
| 3 | On `/rsc-showcase`, click `Refetch payload`. | The route remains on `/rsc-showcase`; the payload section refreshes without a document navigation. | TanStack Router owns route data while React on Rails Pro fetches the RSC payload. |
| 4 | On `/rsc-showcase`, click `Pulse client state` and `Hydrated island` inside the fetched payload if visible. | Client counters increment next to the server-rendered payload. | Client islands can hydrate beside server-streamed RSC content. |
| 5 | Visit `/hello_server`. | The RSC demo shell renders, including the `What this page shows` cards. | The lower-level React on Rails Pro streaming RSC example still has a visible public route. |
| 6 | Visit `/dashboard`; sign in if redirected. | The dashboard loads and says `Signed in as demo@example.com`. | Rails session auth gates the authenticated TanStack shell. |
| 7 | On `/dashboard`, click `View projects`. | The URL changes to `/projects` inside the dashboard shell. | TanStack Router handles authenticated client navigation after Rails serves the full-page route. |
| 8 | On `/dashboard`, open the `Rendering mode details` icon button. | The dialog explains dashboard SSR, public RSC, and classic Rails surfaces, with links to each. | Reviewers can see the intended rendering boundary in product UI. |
| 9 | On `/projects`, change `Status`, then click `Sort name` and `Sort activity`. | The table updates and the URL search params change, for example `status=active`, `sort=name`, or `dir=asc`. | Rails owns filtering/sorting/pagination through JSON APIs while TanStack Table and Router keep URL state. |
| 10 | On `/projects`, click `New project`, fill `Name`, optionally add `Description`, choose a `Status`, then click `Create project`. | A project detail page opens and a success toast appears. | TanStack Query mutates Rails JSON APIs with CSRF-aware browser requests. |
| 11 | On the project detail page, click `Edit`, change the status, then click `Save project`. | The detail page reflects the changed status and a success toast appears. | Client routes can edit server-owned records without leaving the dashboard shell. |
| 12 | On a project detail page, click `Open classic Rails-rendered project page`. | `/classic/projects/:id` opens as a Rails-rendered page for the same record. | Classic Rails CRUD coexists with the TanStack surface over the same model and auth boundary. |
| 13 | From the dashboard nav, click `Settings`, then `Profile`. In local or review apps, change only the display name; on the public demo, leave fields unchanged. Click `Save profile`. | The save succeeds and the dashboard user context updates without a full document navigation. | Nested TanStack settings routes submit to Rails while preserving the client shell. |
| 14 | From `Settings`, click `Security`, then `Send reset link`. | The Rails password reset request page opens. | Auth account flows can still use regular Rails views where a client route adds no value. |

## Optional Deep Checks

Run these only when the review is specifically about build, rendering, or route
contracts. They are intentionally outside the default manual click path.

| Check | Command | Use when |
| --- | --- | --- |
| Playwright browser suite | `bin/test playwright` | A change affects dashboard routing, hydration, forms, or public browser workflows. |
| Rspack/RSC repro | `REQUIRE_RSC_MANIFESTS=true pnpm run repro:rspack-rsc` | A change affects Rspack, RSC bundles, manifests, or the RSC showcase path. |
| Dev-mode smoke | `bin/test dev-modes` | A change affects Procfiles, dev server wiring, live reload, static assets, or production-like assets. |
| HMR smoke | `bin/test hmr` | A change affects explicit HMR mode or React Fast Refresh behavior. |

For the full command matrix, see [Tested Modes](06-tested-modes.md).

## What Not To Infer

- Passing this checklist does not prove production deploy readiness. Use the
  release-impacting checks in [Tested Modes](06-tested-modes.md) for that.
- `/hello_server` is the lower-level streaming RSC reference. The root path `/`
  is the Rails landing page, not a final RSC landing page.
- The public demo account is shared. Email-change verification behavior should
  be tested in a disposable local or review-app environment unless the reviewer
  is explicitly resetting the shared account afterward.

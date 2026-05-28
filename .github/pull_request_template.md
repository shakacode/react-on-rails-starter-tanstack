## Summary

## Validation Tier

Choose the highest tier that matches this PR. See `bin/test` and
`docs/06-tested-modes.md` for the full mode matrix.

- [ ] Template/docs-only: `git diff --check` plus a markdown/file sanity check.
- [ ] Smoke: `bin/test smoke`
- [ ] CI core: `bin/ci` or `bin/test ci`
- [ ] Full app/browser: `bin/test all`
- [ ] Release-impacting: `bin/test release`

Use the release-impacting tier, or list the focused commands below, for changes
to Rspack config, React on Rails Pro SSR/Node renderer paths, TanStack Router
hydration/routing, HMR/dev modes, production assets/boot, or RSC behavior.

## Test Plan

- [ ] `bin/test smoke`
- [ ] `bin/test ci` or `bin/ci`
- [ ] `bin/test router-shim`
- [ ] `bin/test playwright`
- [ ] `bin/test all`
- [ ] `bin/test dev-modes`
- [ ] `bin/test hmr`
- [ ] `bin/test production-precompile`
- [ ] `bin/test production-boot`
- [ ] `bin/test rsc-repro`
- [ ] Other:

## Starter Checklist

- [ ] Kept Rspack as the supported bundler; did not switch this starter to
      Webpack unless the issue explicitly asks for a bundler evaluation.
- [ ] Updated `README.md`, `docs/`, or `SPIKE.md` when behavior, supported
      modes, known limitations, or Rspack/RSC status changed.
- [ ] For dashboard route changes, checked direct full-page loads, client
      navigation, URL state, and hydration behavior.

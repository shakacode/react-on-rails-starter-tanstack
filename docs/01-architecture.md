# Architecture

This starter begins from `create-react-on-rails-app@16.7.0-rc.0 --rsc --rspack`.

- Rails owns the public routes, auth routes, API routes, and the HTML shell.
- Shakapacker uses Rspack for client, server, and RSC bundles.
- React on Rails Pro provides the Node renderer and RSC streaming path.
- SolidQueue is installed by Rails and runs as a separate worker process in development and production.

The Tier 1 implementation plan adds TanStack Router, Query, and Table on the authenticated surface after this bootstrap phase.

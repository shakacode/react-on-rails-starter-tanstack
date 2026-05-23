# Architecture

This starter begins from `create-react-on-rails-app@16.7.0-rc.0 --rsc --rspack`.

- Rails owns the public routes, auth routes, API routes, and the HTML shell.
- Shakapacker uses Rspack for client, server, and RSC bundles.
- React on Rails Pro provides the Node renderer and RSC streaming path.
- SolidQueue is installed by Rails and runs as a separate worker process in development and production.

## Authentication

Rails 8 authentication provides sessions, password reset, signup, and email verification. The verification lifecycle stores only a SHA-256 token digest, expires links after 24 hours, clears the digest after successful verification, and rotates the DB-backed session on success.

Rack::Attack limits verification email sends per IP and per email address. Development mail is available through `/letter_opener`.

## Projects

Projects are scoped to the verified current user. The HTML controller is the Rails validation reference pattern: server-side validations, inline errors, scoped lookup, and archive-on-destroy. The JSON API under `/api/projects` supports status filtering, sorting, pagination, scoped show, and metrics for the future dashboard cards.

The Tier 1 implementation plan adds TanStack Router, Query, and Table on the authenticated surface next.

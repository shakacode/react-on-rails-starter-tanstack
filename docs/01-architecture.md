# Architecture

This starter begins from `create-react-on-rails-app@16.7.0-rc.0 --rsc --rspack`.

- Rails owns the public routes, auth routes, API routes, and the HTML shell.
- Shakapacker uses Rspack for client, server, and RSC bundles.
- React on Rails Pro provides the Node renderer and RSC streaming path.
- SolidQueue is installed by Rails and runs as a separate worker process in development and production.

## Authentication

Rails 8 authentication provides sessions, password reset, signup, and email verification. The verification lifecycle stores only a SHA-256 token digest, expires links after 24 hours, clears the digest after successful verification, and rotates the DB-backed session on success.

Rack::Attack limits verification email sends per IP and per email address. Development mail is available through `/letter_opener`.

The Tier 1 implementation plan adds Projects CRUD next, then TanStack Router, Query, and Table on the authenticated surface.

# Customizing

## Rename The App

Update the Rails module name in `config/application.rb`, database names in `config/database.yml`, and package metadata in `package.json`.

## Change Development Ports

Copy `.env.example` to `.env`, then change `PORT`, `SHAKAPACKER_DEV_SERVER_PORT`, or `RENDERER_PORT`.

## Add UI Packages

Use pnpm for JavaScript dependencies:

```sh
pnpm add @tanstack/react-router @tanstack/react-query @tanstack/react-table
```

Use Bun only for shadcn/ui commands once the shadcn setup is added:

```sh
bunx shadcn add card button input
```

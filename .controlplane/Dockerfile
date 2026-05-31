ARG RUBY_VERSION=3.4.6

# Node and Ruby base images share the same Debian release so that glibc, libssl, and
# other system libraries line up between stages.
FROM docker.io/library/node:22-bookworm-slim AS node
FROM ruby:$RUBY_VERSION-slim-bookworm

# Yarn Classic / pnpm fallbacks for projects that haven't adopted corepack via
# `packageManager` in package.json. Override at build time (`--build-arg=YARN_CLASSIC_VERSION=...`)
# rather than editing this file so regenerating the Dockerfile keeps your pin.
ARG YARN_CLASSIC_VERSION=1.22.22
ARG PNPM_FALLBACK_VERSION=9.12.3

WORKDIR /app

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential git libpq-dev libvips libyaml-dev pkg-config && \
    rm -rf /var/lib/apt/lists /var/cache/apt/archives

# Keep Node.js available both for asset compilation and for SSR runtimes that
# rely on ExecJS in production. Narrowed to just what the node stage actually
# ships under /usr/local so we don't drag in unused Debian libs from that image.
COPY --from=node /usr/local/bin/node /usr/local/bin/node
COPY --from=node /usr/local/lib/node_modules /usr/local/lib/node_modules
COPY --from=node /usr/local/include/node /usr/local/include/node

RUN ln -sf ../lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm && \
    ln -sf ../lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx && \
    ln -sf ../lib/node_modules/corepack/dist/corepack.js /usr/local/bin/corepack && \
    chmod +x /usr/local/lib/node_modules/npm/bin/npm-cli.js \
             /usr/local/lib/node_modules/npm/bin/npx-cli.js \
             /usr/local/lib/node_modules/corepack/dist/corepack.js

# Expose Corepack-managed shims so later build steps can call yarn/pnpm
# directly during asset precompilation hooks.
RUN printf '%s\n' '#!/bin/sh' 'exec corepack yarn "$@"' > /usr/bin/yarn && \
    chmod +x /usr/bin/yarn && \
    printf '%s\n' '#!/bin/sh' 'exec corepack pnpm "$@"' > /usr/bin/pnpm && \
    chmod +x /usr/bin/pnpm

# install ruby gems
COPY Gemfile* ./

RUN bundle config set without 'development test' && \
    bundle config set with 'production' && \
    bundle install --jobs=3 --retry=3

COPY . ./

# Install JavaScript dependencies only when the project actually has them.
# Pin `packageManager` in package.json to take the corepack path and avoid the
# YARN_CLASSIC_VERSION / PNPM_FALLBACK_VERSION fallbacks below; the fallbacks exist for
# projects that haven't adopted corepack and should be reviewed periodically as they go stale.
RUN if [ -f package.json ]; then \
      package_manager="$(node -p "require('./package.json').packageManager || ''")"; \
      if [ -f yarn.lock ]; then \
        if printf '%s' "$package_manager" | grep -q '^yarn@'; then \
          corepack prepare "$package_manager" --activate && \
            (corepack yarn install --immutable || corepack yarn install --frozen-lockfile); \
        else \
          npm install -g "yarn@${YARN_CLASSIC_VERSION}" && \
            (yarn install --immutable || yarn install --frozen-lockfile); \
        fi; \
      elif [ -f pnpm-lock.yaml ]; then \
        if printf '%s' "$package_manager" | grep -q '^pnpm@'; then \
          corepack prepare "$package_manager" --activate && \
            corepack pnpm install --frozen-lockfile; \
        else \
          corepack prepare "pnpm@${PNPM_FALLBACK_VERSION}" --activate && \
            corepack pnpm install --frozen-lockfile; \
        fi; \
      elif [ -f package-lock.json ]; then \
        npm ci; \
      else \
        npm install; \
      fi; \
    fi

ENV RAILS_ENV=production

# Shakapacker assets bundler used for the deployed build.
#
# The bundler is selected at `assets:precompile` time (here, inside the image
# build) — NOT at runtime — so this canNOT be set via a Control Plane GVC env
# var. It must be baked into the build.
#
# `rspack` is the repo and deploy default. `react-on-rails-rsc@19.0.5-rc.2`
# emits the RSC client-reference manifests on Rspack. The Webpack bridge remains
# available as an opt-in comparison path with:
#   --build-arg SHAKAPACKER_ASSETS_BUNDLER=webpack
ARG SHAKAPACKER_ASSETS_BUNDLER=rspack
ENV SHAKAPACKER_ASSETS_BUNDLER=${SHAKAPACKER_ASSETS_BUNDLER}

# compiling assets requires any value for ENV of SECRET_KEY_BASE
ENV SECRET_KEY_BASE=NOT_USED_NON_BLANK

RUN bin/shakapacker-precompile-hook


RUN rails assets:precompile

# add entrypoint
COPY .controlplane/entrypoint.sh ./
RUN chmod +x /app/entrypoint.sh
ENTRYPOINT ["/app/entrypoint.sh"]

CMD ["./bin/thrust", "./bin/rails", "server"]

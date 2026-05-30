// Common configuration applying to client, server, and RSC Webpack builds.
//
// Mirrors config/rspack/commonWebpackConfig.js. Shakapacker's
// generateWebpackConfig() returns a Webpack-flavored base config whenever the
// active bundler is `webpack` (selected via assets_bundler in
// config/shakapacker.yml, the `--bundler webpack` flag, or
// SHAKAPACKER_ASSETS_BUNDLER=webpack).

const path = require('path');
const { generateWebpackConfig, merge } = require('shakapacker');

const baseClientWebpackConfig = generateWebpackConfig();

const commonOptions = {
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../../app/javascript/src'),
    },
    extensions: ['.css', '.ts', '.tsx'],
    // Pin the package-exports conditions to the standard set (plus webpack's
    // `...` default expansion). Without this, Webpack's resolver falls through
    // to the FIRST key in an `exports` map when no listed condition matches.
    // Some TanStack dev-tools packages list a non-standard `@tanstack/custom-condition`
    // first, which points at raw `src/*.ts(x)` — Webpack would then try to bundle
    // un-transpiled TypeScript from node_modules and fail with "Module parse failed".
    // (Rspack does not exhibit this fall-through, which is why the Rspack build is green.)
    conditionNames: ['require', 'node', 'import', 'module', 'default', '...'],
  },
};

// Some TanStack packages (e.g. @tanstack/react-router and the *-devtools
// packages) are pulled into the RSC client-reference graph and resolve to raw
// `src/*.ts(x)` TypeScript that ships inside node_modules. Shakapacker's default
// JS rule excludes node_modules, so Webpack would hit "Module parse failed:
// Unexpected token" on that un-transpiled TypeScript. Add a dedicated swc-loader
// rule scoped to @tanstack packages so those source files compile.
// (Rspack does not surface these modules, which is why the Rspack build is green
// without this rule.)
//
// IMPORTANT: this returns a FRESH rule object every call. The RSC config
// (rscWebpackConfig.js) appends `react-on-rails-rsc/WebpackLoader` to any rule
// whose `use` chain contains swc/babel. If this rule object were shared across
// the client/server/RSC config builds (which all run in one Webpack invocation),
// the RSC loader-append would mutate the shared object and leak the RSC transform
// into the client/server bundles — producing duplicate `export const type` /
// `export const interface` parse errors. `rorRscSkip` marks it so the RSC config
// leaves it alone.
const makeTanstackSourceRule = () => ({
  test: /\.(ts|tsx)$/,
  include: /[/\\]@tanstack[/\\]/,
  use: [
    {
      loader: require.resolve('swc-loader'),
      options: {
        jsc: {
          parser: { syntax: 'typescript', tsx: true },
          transform: { react: { runtime: 'automatic' } },
        },
      },
    },
  ],
});

// Copy the object using merge b/c the baseClientWebpackConfig and commonOptions
// are mutable globals.
const commonWebpackConfig = () => {
  const webpackConfig = merge({}, baseClientWebpackConfig, commonOptions);
  webpackConfig.module.rules.unshift(makeTanstackSourceRule());
  const postcssLoader = {
    loader: require.resolve('postcss-loader'),
    options: {
      postcssOptions: {
        config: path.resolve(__dirname, '../../postcss.config.mjs'),
      },
      sourceMap: true,
    },
  };

  webpackConfig.module.rules.forEach((rule) => {
    if (!Array.isArray(rule.use)) return;
    const hasPostcssLoader = rule.use.some((item) => {
      const loader = typeof item === 'string' ? item : item?.loader;
      return loader?.includes('postcss-loader');
    });
    if (hasPostcssLoader) return;

    const cssLoaderIndex = rule.use.findIndex((item) => {
      const loader = typeof item === 'string' ? item : item?.loader;
      return loader?.includes('css-loader');
    });
    if (cssLoaderIndex >= 0) {
      rule.use.splice(cssLoaderIndex + 1, 0, postcssLoader);
    }
  });

  return webpackConfig;
};

module.exports = commonWebpackConfig;

// React Server Components bundle Webpack configuration.
//
// Mirrors config/rspack/rscWebpackConfig.js. The RSC bundle is a clone of the
// server bundle with two changes:
//   1. react-on-rails-rsc/WebpackLoader is appended to the JS loader chain so
//      `use client` modules are replaced with registerClientReference proxies.
//   2. The `react-server` resolve condition is enabled so React resolves its
//      server-component runtime.
// See: https://reactonrails.com/docs/pro/react-server-components/

const serverWebpackModule = require('./serverWebpackConfig');

const serverWebpackConfig = serverWebpackModule.default;
const { extractLoader } = serverWebpackModule;

const configureRsc = () => {
  // Pass true to skip RSCWebpackPlugin - the RSC bundle uses the WebpackLoader.
  const rscConfig = serverWebpackConfig(true);

  // Update the entry name to be `rsc-bundle` instead of `server-bundle`.
  rscConfig.entry = {
    'rsc-bundle': rscConfig.entry['server-bundle'],
  };

  // Append the RSC WebpackLoader to the JS rule's loader chain. Webpack loaders
  // execute right-to-left, so appending makes the RSC loader run first (before
  // swc/babel). It works with either a static `use` array (Webpack + swc-loader
  // or babel-loader) or a function-style `use` (some swc setups).
  const { rules } = rscConfig.module;
  rules.forEach((rule) => {
    // Skip the dedicated @tanstack source rule (see commonWebpackConfig.js).
    // Those packages ship `use client` TypeScript source with `export type` /
    // `export interface`; running the RSC client-reference loader over that raw
    // source generates invalid `export const type` proxies. They only need
    // type-stripping (swc), not the RSC transform.
    if (rule.include instanceof RegExp && /@tanstack/.test(String(rule.include))) {
      return;
    }
    if (typeof rule.use === 'function') {
      const originalUse = rule.use;
      // Must use `function` (not arrow) so `.call(this, data)` forwards
      // webpack's loader context.
      rule.use = function rscLoaderWrapper(data) {
        const result = originalUse.call(this, data);
        const resultArray = Array.isArray(result) ? result : result ? [result] : [];
        const resolvedRule = { use: resultArray };
        const jsLoader =
          extractLoader(resolvedRule, 'babel-loader') || extractLoader(resolvedRule, 'swc-loader');
        if (jsLoader) {
          return [...resultArray, { loader: 'react-on-rails-rsc/WebpackLoader' }];
        }
        return result;
      };
    } else if (Array.isArray(rule.use)) {
      const jsLoader = extractLoader(rule, 'babel-loader') || extractLoader(rule, 'swc-loader');
      if (jsLoader) {
        rule.use.push({ loader: 'react-on-rails-rsc/WebpackLoader' });
      }
    }
  });

  // Add the `react-server` condition to the resolve config. This condition lets
  // React and React on Rails identify this as an RSC bundle. `...` retains the
  // default conditions (e.g. `node` for the server target).
  rscConfig.resolve = {
    ...rscConfig.resolve,
    // `react-server` must come first so React resolves its server-component
    // runtime. The remaining conditions mirror commonWebpackConfig's explicit
    // set (see the note there about Webpack's exports-map fall-through).
    conditionNames: ['react-server', 'require', 'node', 'import', 'module', 'default', '...'],
    alias: {
      ...rscConfig.resolve?.alias,
      // Ignore react-dom/server in the RSC bundle - not needed for RSC payload
      // generation, and leaving it in causes a runtime error.
      'react-dom/server': false,
    },
  };

  // Update the output bundle name to be `rsc-bundle.js`.
  rscConfig.output.filename = 'rsc-bundle.js';

  return rscConfig;
};

module.exports = configureRsc;

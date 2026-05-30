// Development Webpack configuration. Mirrors config/rspack/development.js.

const { inliningCss } = require('shakapacker');

const serverClientOrBoth = require('./ServerClientOrBoth');

const developmentEnvOnly = (clientWebpackConfig, _serverWebpackConfig, _rscWebpackConfig) => {
  // Enable React Refresh (Fast Refresh) only when the dev server is inlining CSS
  // (i.e. HMR mode). Requires @pmmmwh/react-refresh-webpack-plugin and the
  // react-refresh/babel plugin (already wired in babel.config.js behind
  // WEBPACK_SERVE). Skipped for static watch builds.
  if (inliningCss && process.env.WEBPACK_SERVE) {
    // eslint-disable-next-line global-require
    const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');
    clientWebpackConfig.plugins.push(new ReactRefreshWebpackPlugin());
  }
};

module.exports = serverClientOrBoth(developmentEnvOnly);

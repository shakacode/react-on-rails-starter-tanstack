// Development Webpack configuration. Mirrors config/rspack/development.js.

const { inliningCss } = require('shakapacker');

const { normalizeDevServerMode } = require('../devServerMode');
const serverClientOrBoth = require('./ServerClientOrBoth');

const writeNonHotUpdateAssetsToDisk = (clientWebpackConfig) => {
  if (!clientWebpackConfig.devServer) return;

  clientWebpackConfig.devServer = {
    ...clientWebpackConfig.devServer,
    devMiddleware: {
      ...clientWebpackConfig.devServer.devMiddleware,
      writeToDisk: (filePath) => !filePath.includes('.hot-update.'),
    },
  };
};

const developmentEnvOnly = (clientWebpackConfig, _serverWebpackConfig, _rscWebpackConfig) => {
  normalizeDevServerMode(clientWebpackConfig);
  // React on Rails Pro's RSC payload renderer reads the client-reference
  // manifest from disk, even when webpack-dev-server serves browser assets from
  // memory. Persist non-HMR assets so /hello_server works in Webpack dev/HMR.
  writeNonHotUpdateAssetsToDisk(clientWebpackConfig);

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

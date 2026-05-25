// The source code including full typescript support is available at: 
// https://github.com/shakacode/react_on_rails_demo_ssr_hmr/blob/master/config/webpack/development.js

const { devServer, inliningCss, config } = require('shakapacker');

const serverClientOrBoth = require('./ServerClientOrBoth');

const developmentEnvOnly = (clientWebpackConfig, serverWebpackConfig, rscWebpackConfig) => {
  clientWebpackConfig.experiments = {
    ...clientWebpackConfig.experiments,
    lazyCompilation: false,
  };

  // Static watch builds should not embed the Rspack dev-server client.
  if (config.assets_bundler === 'rspack' && process.env.WEBPACK_SERVE !== 'true') {
    [clientWebpackConfig, serverWebpackConfig, rscWebpackConfig].forEach((webpackConfig) => {
      delete webpackConfig.devServer;
    });
  }

  // React Refresh (Fast Refresh) setup - only when dev server is running (HMR mode)
  if (process.env.WEBPACK_SERVE === 'true') {
    // eslint-disable-next-line global-require
    if (config.assets_bundler === 'rspack') {
      // Rspack React Refresh currently trips webpack-dev-server's active-module
      // endpoint in this rc stack, which raises a full-screen overlay on every page.
      // Keep the dev server usable until shakapacker-rspack's Rspack 2 peer lands.
    } else {
      // Webpack uses @pmmmwh/react-refresh-webpack-plugin
      const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');
      clientWebpackConfig.plugins.push(
        new ReactRefreshWebpackPlugin({
          // Use default overlay configuration for better compatibility
        }),
      );
    }
  }
};

module.exports = serverClientOrBoth(developmentEnvOnly);

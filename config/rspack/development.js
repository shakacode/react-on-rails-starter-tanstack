// The source code including full typescript support is available at: 
// https://github.com/shakacode/react-on-rails-demo-ssr-hmr/blob/master/config/webpack/development.js

const { devServer, inliningCss, config } = require('shakapacker');

const serverClientOrBoth = require('./ServerClientOrBoth');

// REFERENCE PATTERN: rspack-dev-config - see AGENTS.md section 9
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
};

module.exports = serverClientOrBoth(developmentEnvOnly);

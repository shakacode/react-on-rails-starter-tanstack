// The source code including full typescript support is available at: 
// https://github.com/shakacode/react-on-rails-demo-ssr-hmr/blob/master/config/webpack/development.js

const { devServer, inliningCss, config } = require('shakapacker');

const serverClientOrBoth = require('./ServerClientOrBoth');

// REFERENCE PATTERN: rspack-dev-config - see AGENTS.md section 9
const developmentEnvOnly = (clientWebpackConfig, serverWebpackConfig, rscWebpackConfig) => {
  // Rspack 2 reads lazyCompilation at the client config top level. Keeping it
  // off avoids lazy-trigger 404s for optional browser-only devtools chunks.
  clientWebpackConfig.lazyCompilation = false;
  clientWebpackConfig.experiments = {
    ...clientWebpackConfig.experiments,
    // Keep the experiments flag explicit for compatibility with older option shapes.
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

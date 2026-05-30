// Production Webpack configuration. Mirrors config/rspack/production.js.

const serverClientOrBoth = require('./ServerClientOrBoth');

const productionEnvOnly = (_clientWebpackConfig, _serverWebpackConfig, _rscWebpackConfig) => {
  // place any code here that is for production only
};

module.exports = serverClientOrBoth(productionEnvOnly);

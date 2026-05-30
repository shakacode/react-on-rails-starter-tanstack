// Test Webpack configuration. Mirrors config/rspack/test.js.

const serverClientOrBoth = require('./ServerClientOrBoth');

const testOnly = (_clientWebpackConfig, _serverWebpackConfig, _rscWebpackConfig) => {
  // place any code here that is for test only
};

module.exports = serverClientOrBoth(testOnly);

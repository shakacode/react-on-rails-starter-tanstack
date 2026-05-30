// Assembles the client, server (SSR), and RSC Webpack configs.
// Mirrors config/rspack/ServerClientOrBoth.js.

const clientWebpackConfig = require('./clientWebpackConfig');
const { default: serverWebpackConfig } = require('./serverWebpackConfig');
const rscWebpackConfig = require('./rscWebpackConfig');

const serverClientOrBoth = (envSpecific) => {
  const clientConfig = clientWebpackConfig();
  const serverConfig = serverWebpackConfig();
  const rscConfig = rscWebpackConfig();

  if (envSpecific) {
    envSpecific(clientConfig, serverConfig, rscConfig);
  }

  let result;
  // For HMR, the client and server configs must be built separately.
  if (process.env.WEBPACK_SERVE || process.env.CLIENT_BUNDLE_ONLY) {
    // eslint-disable-next-line no-console
    console.log('[React on Rails] Creating only the client bundles.');
    result = clientConfig;
  } else if (process.env.SERVER_BUNDLE_ONLY) {
    // eslint-disable-next-line no-console
    console.log('[React on Rails] Creating only the server bundle.');
    result = serverConfig;
  } else if (process.env.RSC_BUNDLE_ONLY) {
    // eslint-disable-next-line no-console
    console.log('[React on Rails] Creating only the RSC bundle.');
    result = rscConfig;
  } else {
    // eslint-disable-next-line no-console
    console.log('[React on Rails] Creating client, server, and RSC bundles.');
    result = [clientConfig, serverConfig, rscConfig];
  }

  return result;
};

module.exports = serverClientOrBoth;

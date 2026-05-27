// The source code including full typescript support is available at: 
// https://github.com/shakacode/react-on-rails-demo-ssr-hmr/blob/master/config/webpack/clientWebpackConfig.js

const commonWebpackConfig = require('./commonWebpackConfig');
const { config } = require('shakapacker');
const { RSCWebpackPlugin } = require('react-on-rails-rsc/WebpackPlugin');

// REFERENCE PATTERN: rspack-client-config - see AGENTS.md section 9
const configureClient = () => {
  const clientConfig = commonWebpackConfig();

  // server-bundle is special and should ONLY be built by the serverConfig
  // In case this entry is not deleted, a very strange "window" not found
  // error shows referring to window["webpackJsonp"]. That is because the
  // client config is going to try to load chunks.
  delete clientConfig.entry['server-bundle'];

  // AMBER fallback from the Phase 0 spike:
  // react-on-rails-rsc's WebpackPlugin calls a Webpack API that Rspack does not
  // currently expose. Keep Rspack builds green and let the RSC bundle compile
  // without client-reference plugin metadata until the upstream plugin supports
  // Rspack.
  if (config.assets_bundler !== 'rspack') {
    clientConfig.plugins.push(new RSCWebpackPlugin({ isServer: false }));
  }

  return clientConfig;
};

module.exports = configureClient;

// The source code including full typescript support is available at: 
// https://github.com/shakacode/react-on-rails-demo-ssr-hmr/blob/master/config/webpack/clientWebpackConfig.js

const commonWebpackConfig = require('./commonWebpackConfig');
const { config } = require('shakapacker');
const { RSCWebpackPlugin } = require('react-on-rails-rsc/WebpackPlugin');
const { RSCRspackPlugin } = require('react-on-rails-rsc/RspackPlugin');
const rscClientReferences = require('./rscClientReferences');

// REFERENCE PATTERN: rspack-client-config — see AGENTS.md
const configureClient = () => {
  const clientConfig = commonWebpackConfig();

  // server-bundle is special and should ONLY be built by the serverConfig
  // In case this entry is not deleted, a very strange "window" not found
  // error shows referring to window["webpackJsonp"]. That is because the
  // client config is going to try to load chunks.
  delete clientConfig.entry['server-bundle'];

  const RSCClientReferencePlugin =
    config.assets_bundler === 'rspack' ? RSCRspackPlugin : RSCWebpackPlugin;

  clientConfig.plugins.push(new RSCClientReferencePlugin({
    isServer: false,
    clientReferences: rscClientReferences,
  }));

  return clientConfig;
};

module.exports = configureClient;

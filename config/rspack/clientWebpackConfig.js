// The source code including full typescript support is available at: 
// https://github.com/shakacode/react-on-rails-demo-ssr-hmr/blob/master/config/webpack/clientWebpackConfig.js

const commonWebpackConfig = require('./commonWebpackConfig');
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

  clientConfig.plugins.push(new RSCRspackPlugin({
    isServer: false,
    clientReferences: rscClientReferences,
  }));

  return clientConfig;
};

module.exports = configureClient;

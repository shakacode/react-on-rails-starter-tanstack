// Client bundle Webpack configuration.
//
// Mirrors config/rspack/clientWebpackConfig.js but targets Webpack only, so the
// React on Rails Pro RSC plugin is wired unconditionally. On the client bundle,
// react-on-rails-rsc/WebpackPlugin({ isServer: false }) emits
// public/packs/react-client-manifest.json — the second of the two RSC
// client-reference manifests the Rspack track cannot currently produce.

const { RSCWebpackPlugin } = require('react-on-rails-rsc/WebpackPlugin');
const commonWebpackConfig = require('./commonWebpackConfig');

const configureClient = () => {
  const clientConfig = commonWebpackConfig();

  // server-bundle is special and should ONLY be built by the serverConfig.
  // In case this entry is not deleted, a very strange "window" not found
  // error shows referring to window["webpackJsonp"]. That is because the
  // client config is going to try to load chunks.
  delete clientConfig.entry['server-bundle'];

  // Emits public/packs/react-client-manifest.json mapping each `use client`
  // component to its Webpack module/chunk IDs. Required by the RSC payload
  // generator to locate client-component entry points in the browser bundle.
  clientConfig.plugins.push(new RSCWebpackPlugin({ isServer: false }));

  return clientConfig;
};

module.exports = configureClient;

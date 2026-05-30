// Webpack entry point for Shakapacker.
//
// Shakapacker resolves this file when `assets_bundler` is `webpack`
// (or when `--bundler webpack` / `SHAKAPACKER_ASSETS_BUNDLER=webpack` is set).
// It mirrors `config/rspack/rspack.config.js` and loads the env-specific
// configuration (development.js / production.js / test.js) from this directory.
//
// The Webpack track is the mature React on Rails Pro RSC path: it runs
// `react-on-rails-rsc/WebpackPlugin`, which emits the client-reference
// manifests (`react-client-manifest.json` and `react-server-client-manifest.json`)
// that the Rspack track cannot currently produce. See SPIKE.md and
// docs/09-rsc-webpack-bundler-spike.md.

const { env } = require('shakapacker');
const { existsSync } = require('fs');
const { resolve } = require('path');

const envSpecificConfig = () => {
  const path = resolve(__dirname, `${env.nodeEnv}.js`);
  if (existsSync(path)) {
    // eslint-disable-next-line no-console
    console.log(`Loading ENV specific Webpack configuration file ${path}`);
    // eslint-disable-next-line global-require, import/no-dynamic-require
    return require(path);
  }
  throw new Error(`Could not find file to load ${path}, based on NODE_ENV`);
};

module.exports = envSpecificConfig();

// Server (SSR) bundle Webpack configuration.
//
// Mirrors config/rspack/serverWebpackConfig.js but targets Webpack only, so the
// React on Rails Pro RSC plugin is wired unconditionally. On the server bundle,
// react-on-rails-rsc/WebpackPlugin({ isServer: true }) emits
// ssr-generated/react-server-client-manifest.json — one of the two RSC
// client-reference manifests the Rspack track cannot currently produce.

const webpack = require('webpack');
const { config } = require('shakapacker');
const { RSCWebpackPlugin } = require('react-on-rails-rsc/WebpackPlugin');
const commonWebpackConfig = require('./commonWebpackConfig');

function extractLoader(rule, loaderName) {
  if (!Array.isArray(rule.use)) return null;
  return rule.use.find((item) => {
    let testValue = '';
    if (typeof item === 'string') {
      testValue = item;
    } else if (item && typeof item.loader === 'string') {
      testValue = item.loader;
    }
    return testValue.includes(loaderName);
  });
}

// rscBundle parameter: when true, skips RSCWebpackPlugin (the RSC bundle gets
// the WebpackLoader instead — see rscWebpackConfig.js).
const configureServer = (rscBundle = false) => {
  // We need to use "merge" because the clientConfigObject, EVEN after running
  // toWebpackConfig() is a mutable GLOBAL. Thus any changes, like modifying the
  // entry value will result in changing the client config!
  const serverWebpackConfig = commonWebpackConfig();

  // We just want the single server bundle entry
  const serverEntry = {
    'server-bundle': serverWebpackConfig.entry['server-bundle'],
  };

  if (!serverEntry['server-bundle']) {
    throw new Error(
      "Create a pack with the file name 'server-bundle.js' containing all the server rendering files",
    );
  }

  serverWebpackConfig.entry = serverEntry;

  // Remove the mini-css-extract-plugin from the style loaders because
  // the client build will handle exporting CSS.
  serverWebpackConfig.module.rules.forEach((loader) => {
    if (loader.use && loader.use.filter) {
      loader.use = loader.use.filter((item) => {
        let testValue = '';
        if (typeof item === 'string') {
          testValue = item;
        } else if (item && typeof item.loader === 'string') {
          testValue = item.loader;
        }
        return !testValue.includes('mini-css-extract-plugin');
      });
    }
  });

  // No splitting of chunks for a server bundle
  serverWebpackConfig.optimization = {
    minimize: false,
  };

  // Add RSC plugin for the SSR server bundle (handles client-component
  // references). Skip for the RSC bundle - it gets the RSC WebpackLoader.
  if (!rscBundle) {
    serverWebpackConfig.plugins.push(new RSCWebpackPlugin({ isServer: true }));
  }
  serverWebpackConfig.plugins.unshift(new webpack.optimize.LimitChunkCountPlugin({ maxChunks: 1 }));

  // Custom output for the server-bundle.
  // Using Shakapacker 9.0+ privateOutputPath for automatic sync with
  // shakapacker.yml (private_output_path: ssr-generated).
  const serverBundleOutputPath =
    config.privateOutputPath || require('path').resolve(__dirname, '../../ssr-generated');

  serverWebpackConfig.output = {
    filename: 'server-bundle.js',
    globalObject: 'this',
    // Required for React on Rails Pro Node Renderer
    libraryTarget: 'commonjs2',
    path: serverBundleOutputPath,
    // No publicPath needed since server bundles are not served via web
  };

  if (!config.privateOutputPath) {
    // eslint-disable-next-line no-console
    console.warn('⚠️  private_output_path not configured in shakapacker.yml; falling back to ssr-generated');
  }

  // Don't hash the server bundle b/c would conflict with the client manifest
  // And no need for the MiniCssExtractPlugin / asset manifest / ts checker.
  serverWebpackConfig.plugins = serverWebpackConfig.plugins.filter(
    (plugin) =>
      plugin.constructor.name !== 'WebpackAssetsManifest' &&
      plugin.constructor.name !== 'MiniCssExtractPlugin' &&
      plugin.constructor.name !== 'ForkTsCheckerWebpackPlugin',
  );

  // Configure loader rules for SSR.
  const { rules } = serverWebpackConfig.module;
  rules.forEach((rule) => {
    if (Array.isArray(rule.use)) {
      // remove the mini-css-extract-plugin and style-loader
      rule.use = rule.use.filter((item) => {
        let testValue = '';
        if (typeof item === 'string') {
          testValue = item;
        } else if (item && typeof item.loader === 'string') {
          testValue = item.loader;
        }
        return !(testValue.includes('mini-css-extract-plugin') || testValue === 'style-loader');
      });
      const cssLoader = rule.use.find((item) => {
        let testValue = '';
        if (typeof item === 'string') {
          testValue = item;
        } else if (item && typeof item.loader === 'string') {
          testValue = item.loader;
        }
        return testValue.includes('css-loader');
      });
      if (cssLoader && cssLoader.options && cssLoader.options.modules) {
        cssLoader.options.modules = {
          ...(typeof cssLoader.options.modules === 'object' ? cssLoader.options.modules : {}),
          exportOnlyLocals: true,
        };
      }

      // Set SSR caller for Babel (if using Babel instead of SWC)
      const babelLoader = extractLoader(rule, 'babel-loader');
      if (babelLoader && babelLoader.options) {
        babelLoader.options.caller = { ssr: true };
      }
      // Skip writing image files during SSR by setting emitFile to false
    } else if (rule.use && (rule.use.loader === 'url-loader' || rule.use.loader === 'file-loader')) {
      rule.use.options.emitFile = false;
    }
  });

  // eval works well for the SSR bundle because it's the fastest and shows
  // lines in the server bundle which is good for debugging SSR.
  serverWebpackConfig.devtool = 'eval';

  // React on Rails Pro uses the Node renderer, so target must be 'node'.
  serverWebpackConfig.target = 'node';

  // Disable Node.js polyfills - not needed when targeting Node
  serverWebpackConfig.node = false;

  return serverWebpackConfig;
};

module.exports = {
  default: configureServer,
  extractLoader,
};

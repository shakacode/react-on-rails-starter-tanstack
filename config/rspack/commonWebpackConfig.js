// The source code including full typescript support is available at: 
// https://github.com/shakacode/react-on-rails-demo-ssr-hmr/blob/master/config/webpack/commonWebpackConfig.js

// Common configuration applying to client and server configuration
const path = require('path');
const { generateWebpackConfig, merge } = require('shakapacker');

const baseClientWebpackConfig = generateWebpackConfig();

const commonOptions = {
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../../app/javascript/src'),
    },
    extensions: ['.css', '.ts', '.tsx'],
  },
};

// Copy the object using merge b/c the baseClientWebpackConfig and commonOptions are mutable globals
const commonWebpackConfig = () => {
  const webpackConfig = merge({}, baseClientWebpackConfig, commonOptions);
  const postcssLoader = {
    loader: require.resolve('postcss-loader'),
    options: {
      postcssOptions: {
        config: path.resolve(__dirname, '../../postcss.config.mjs'),
      },
      sourceMap: true,
    },
  };

  webpackConfig.module.rules.forEach((rule) => {
    if (!Array.isArray(rule.use)) return;
    const hasPostcssLoader = rule.use.some((item) => {
      const loader = typeof item === 'string' ? item : item?.loader;
      return loader?.includes('postcss-loader');
    });
    if (hasPostcssLoader) return;

    const cssLoaderIndex = rule.use.findIndex((item) => {
      const loader = typeof item === 'string' ? item : item?.loader;
      return loader?.includes('css-loader');
    });
    if (cssLoaderIndex >= 0) {
      rule.use.splice(cssLoaderIndex + 1, 0, postcssLoader);
    }
  });

  return webpackConfig;
};

module.exports = commonWebpackConfig;

const readBooleanEnv = (key) => {
  if (!Object.prototype.hasOwnProperty.call(process.env, key)) return undefined;

  const value = String(process.env[key]).toLowerCase();
  if (value === 'true') return true;
  if (value === 'false') return false;

  return undefined;
};

const booleanOr = (value, fallback) => (typeof value === 'boolean' ? value : fallback);

const normalizeDevServerMode = (webpackConfig) => {
  if (!webpackConfig.devServer) return;

  const envHmr = readBooleanEnv('SHAKAPACKER_DEV_SERVER_HMR');
  const hot = envHmr ?? booleanOr(webpackConfig.devServer.hot, false);
  const envLiveReload = readBooleanEnv('SHAKAPACKER_DEV_SERVER_LIVE_RELOAD');
  const liveReload = envLiveReload ?? (
    envHmr === undefined ? booleanOr(webpackConfig.devServer.liveReload, !hot) : !hot
  );

  webpackConfig.devServer = {
    ...webpackConfig.devServer,
    hot,
    liveReload,
  };
};

module.exports = { normalizeDevServerMode };

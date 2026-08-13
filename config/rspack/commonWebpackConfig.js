// The source code including full typescript support is available at: 
// https://github.com/shakacode/react-on-rails-demo-ssr-hmr/blob/master/config/webpack/commonWebpackConfig.js

// Common configuration applying to client and server configuration
const path = require('path');
const { generateWebpackConfig, merge } = require('shakapacker');

const baseClientWebpackConfig = generateWebpackConfig();

const commonOptions = {
  resolve: {
    extensions: ['.css', '.ts', '.tsx'],
    // Mirrors tsconfig.json's "@/*" path alias -- Rspack doesn't read tsconfig paths itself.
    alias: {
      '@': path.resolve(__dirname, '../../app/javascript'),
    },
  },
  ignoreWarnings: [
    // react-router's SSR route-module reloader references import.meta.hot, a Vite-only API
    // used by its Data/Framework Mode dev server. We only use Declarative Mode
    // (BrowserRouter/StaticRouter/Routes/Route, no route config, no loaders), so this code
    // path never executes -- Rspack just doesn't recognize the property and warns.
    {
      module: /react-router[\\/]dist[\\/].*routeModules\.js$/,
      message: /import\.meta.*'hot'/,
    },
  ],
};

// Copy the object using merge b/c the baseClientWebpackConfig and commonOptions are mutable globals
const commonWebpackConfig = () => {
  const webpackConfig = merge({}, baseClientWebpackConfig, commonOptions);
  return webpackConfig;
};

module.exports = commonWebpackConfig;

// Project-level SWC overrides, merged into Shakapacker's default swc-loader
// config by `shakapacker/package/swc` (getSwcLoaderConfig reads this file).
//
// WHY THIS EXISTS (Webpack bundler path):
// Shakapacker's default swc-loader config does NOT set
// `jsc.transform.react.runtime`, so SWC falls back to the *classic* JSX runtime
// (`React.createElement`). App source files that use JSX without
// `import React from 'react'` — e.g. app/javascript/src/components/ui/sonner.tsx —
// then throw `ReferenceError: React is not defined` during SSR on the Node
// renderer, 500-ing every prerendered route (e.g. /dashboard).
//
// The Rspack bundler path does not hit this because Shakapacker's Rspack rules
// hardcode `jsc.transform.react.runtime: "automatic"` in its builtin:swc-loader
// (see shakapacker/package/rules/rspack.js). This file brings the Webpack
// swc-loader to parity. It is inert on Rspack (Rspack uses builtin:swc-loader
// and never calls getSwcLoaderConfig), so it is safe to keep regardless of the
// active bundler.
module.exports = {
  options: {
    jsc: {
      transform: {
        react: {
          runtime: 'automatic',
        },
      },
    },
  },
};

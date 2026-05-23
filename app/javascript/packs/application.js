import ReactOnRails from 'react-on-rails-pro/client';

// React on Rails emits inline startup code that looks for this global after
// auto-loaded component bundles have registered.
globalThis.ReactOnRails = ReactOnRails;

export default ReactOnRails;

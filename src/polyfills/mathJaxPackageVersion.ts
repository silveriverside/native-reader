declare global {
  // MathJax checks this build-time constant before falling back to Node's require().
  // React Native/Hermes does not expose a global require, so we provide the value
  // at startup to keep MathJax on the browser/runtime-safe branch.
  // eslint-disable-next-line no-var
  var PACKAGE_VERSION: string | undefined;
}

globalThis.PACKAGE_VERSION = globalThis.PACKAGE_VERSION ?? '3.2.1';

export {};

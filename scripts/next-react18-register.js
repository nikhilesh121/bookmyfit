const Module = require('module');

if (!global.__BMF_NEXT_REACT18_PATCHED__) {
  global.__BMF_NEXT_REACT18_PATCHED__ = true;

  const resolveFromNext = (request) => require.resolve(`next/node_modules/${request}`);
  const reactEntries = new Map([
    ['react', resolveFromNext('react')],
    ['react-dom', resolveFromNext('react-dom')],
    ['react/jsx-runtime', resolveFromNext('react/jsx-runtime')],
    ['react/jsx-dev-runtime', resolveFromNext('react/jsx-dev-runtime')],
  ]);

  const originalResolve = Module._resolveFilename;
  Module._resolveFilename = function resolveReact18(request, parent, isMain, options) {
    const target = reactEntries.get(request);
    if (target) return target;
    return originalResolve.call(this, request, parent, isMain, options);
  };
}

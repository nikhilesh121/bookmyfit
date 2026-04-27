const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');
const workspaceModules = path.resolve(workspaceRoot, 'node_modules');
// Local node_modules for packages that need different versions from workspace root
// (e.g. React 19 for mobile vs React 18 for Next.js apps)
const localModules = path.resolve(projectRoot, 'node_modules');

const config = getDefaultConfig(projectRoot);

// Watch both local and workspace node_modules; local takes precedence
config.watchFolders = [localModules, workspaceModules];

// Resolve local node_modules first so React 19 (mobile) wins over workspace React 18
config.resolver.nodeModulesPaths = [localModules, workspaceModules];

// Fix: Metro sometimes fails to resolve react-native sub-path imports (e.g.
// react-native/Libraries/Core/InitializeCore) when the package.json exports
// field is evaluated. Force-resolve react-native/* sub-paths directly.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith('react-native/') && !moduleName.includes('..')) {
    const subPath = moduleName.slice('react-native/'.length);
    for (const modules of [localModules, workspaceModules]) {
      for (const ext of ['', '.js', '.native.js', '.ios.js']) {
        const candidate = path.resolve(modules, 'react-native', subPath + ext);
        if (fs.existsSync(candidate)) {
          return { filePath: candidate, type: 'sourceFile' };
        }
      }
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;

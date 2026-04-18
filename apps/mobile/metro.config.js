const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');
const workspaceModules = path.resolve(workspaceRoot, 'node_modules');

// apps/mobile/node_modules removed — pnpm hoisted all packages to workspace root.
// All requires resolve to workspace/node_modules (one React, one react-native).

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceModules];

config.resolver.nodeModulesPaths = [workspaceModules];

// Fix: Metro sometimes fails to resolve react-native sub-path imports (e.g.
// react-native/Libraries/Core/InitializeCore) when the package.json exports
// field is evaluated. Force-resolve react-native/* sub-paths directly.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith('react-native/') && !moduleName.includes('..')) {
    const subPath = moduleName.slice('react-native/'.length);
    for (const ext of ['', '.js', '.native.js', '.ios.js']) {
      const candidate = path.resolve(workspaceModules, 'react-native', subPath + ext);
      if (fs.existsSync(candidate)) {
        return { filePath: candidate, type: 'sourceFile' };
      }
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;

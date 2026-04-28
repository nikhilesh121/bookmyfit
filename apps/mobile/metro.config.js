const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');
const workspaceModules = path.resolve(workspaceRoot, 'node_modules');
const localModules = path.resolve(projectRoot, 'node_modules');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [localModules, workspaceModules];
config.resolver.nodeModulesPaths = [localModules, workspaceModules];

// Resolve a module name to its entry file from localModules
function resolveLocal(moduleName) {
  try {
    return require.resolve(moduleName, { paths: [localModules] });
  } catch {
    return null;
  }
}

// Pre-resolve the single-instance modules at startup so they're fast
const FORCE_LOCAL = ['react', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'react-dom'];
const forcedPaths = {};
for (const mod of FORCE_LOCAL) {
  const resolved = resolveLocal(mod);
  if (resolved) forcedPaths[mod] = resolved;
}

// Absolute path to our self-contained registry shim
const REGISTRY_SHIM = path.resolve(projectRoot, 'shims/ReactNativeViewConfigRegistry.js');

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // BMF fix: redirect ALL copies of ReactNativeViewConfigRegistry to our shim.
  // This prevents the "Tried to register two views with the same name DebuggingOverlay"
  // crash in Expo Go (SDK 54 / RN 0.76) where pnpm has 60+ copies across the virtual store.
  if (
    moduleName === 'ReactNativeViewConfigRegistry' ||
    moduleName.endsWith('/ReactNativeViewConfigRegistry') ||
    moduleName.endsWith('/ReactNativeViewConfigRegistry.js')
  ) {
    return { filePath: REGISTRY_SHIM, type: 'sourceFile' };
  }

  // Force single React instance — redirect all react imports to local copy
  if (forcedPaths[moduleName]) {
    return { filePath: forcedPaths[moduleName], type: 'sourceFile' };
  }

  // Fix react-native/* sub-path imports in monorepo
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

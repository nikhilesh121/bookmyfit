/**
 * Shim: wraps ReactNativeViewConfigRegistry to silently skip duplicate registrations.
 * Expo Go (SDK 54 / RN 0.76) pre-registers 'DebuggingOverlay' in its native binary.
 * When the JS bundle also tries to register it, the normal registry throws.
 * We intercept and return early on duplicates.
 */
'use strict';

// We import from the actual source path to avoid the metro redirect loop.
// Metro will resolve this to the workspace node_modules copy.
const actual = require('react-native/Libraries/Renderer/shims/ReactNativeViewConfigRegistry_ORIGINAL');

const originalRegister = actual.register;
actual.register = function patchedRegister(name, callback) {
  try {
    return originalRegister.call(actual, name, callback);
  } catch (e) {
    if (typeof e.message === 'string' && e.message.includes('Tried to register two views with the same name')) {
      if (__DEV__) {
        console.warn('[BMF] Skipped duplicate native view registration: ' + name);
      }
      return name;
    }
    throw e;
  }
};

module.exports = actual;

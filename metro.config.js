const { getSentryExpoConfig } = require("@sentry/react-native/metro");
const path = require("path");

const config = getSentryExpoConfig(__dirname);

// Add support for symlinked @agent-expo/bridge package
const agentExpoBridgePath = path.resolve(__dirname, "../open-source/agent-expo/packages/bridge");

config.watchFolders = [
  ...(config.watchFolders || []),
  agentExpoBridgePath,
];

config.resolver.nodeModulesPaths = [
  ...(config.resolver.nodeModulesPaths || []),
  path.resolve(__dirname, "node_modules"),
  path.resolve(agentExpoBridgePath, "node_modules"),
];

// Ensure symlinks are followed
config.resolver.unstable_enableSymlinks = true;

module.exports = config;

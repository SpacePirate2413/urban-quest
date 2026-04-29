// Metro bundler config for pnpm monorepo layout.
//
// pnpm puts every direct dep at `apps/mobile/node_modules/<pkg>` (a symlink)
// and every TRANSITIVE dep at `<workspace-root>/node_modules/.pnpm/<pkg>@<ver>...
// /node_modules/<dep>`. Default Metro:
//   1. doesn't watch the workspace root (so the .pnpm store changes go
//      unnoticed), and
//   2. searches a fixed list of node_modules dirs.
//
// The fix has two pieces:
//   - `watchFolders` includes the workspace root so changes in .pnpm/* are
//     picked up.
//   - `nodeModulesPaths` lists both this app's node_modules and the workspace
//     root's, so Metro looks in both for direct deps.
//
// We do NOT set `disableHierarchicalLookup: true` here, even though that's
// recommended in some monorepo guides. With pnpm, transitive deps live in
// each package's own nested node_modules (e.g. expo-router's
// `@expo/metro-runtime` symlink lives inside expo-router's package dir).
// Hierarchical lookup is what walks up from the importing file to find them;
// turning it off breaks every transitive resolve.

const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = config;

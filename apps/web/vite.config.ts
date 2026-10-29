import { createRequire } from 'node:module';
import { dirname, join, relative } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

// Cesium loads its workers, assets and widget CSS at runtime, so they are copied next to the
// app under /cesium. Resolve the package so this works with workspace hoisting.
const cesiumBuild = join(dirname(createRequire(import.meta.url).resolve('cesium/package.json')), 'Build/Cesium');
// The copy plugin keeps each file's path relative to this folder (minus any leading "..");
// strip those segments so files land at /cesium/Workers/... rather than /cesium/node_modules/...
const cesiumPathDepth = relative(import.meta.dirname, cesiumBuild).split(/[\\/]/).filter((s) => s !== '..').length;

export default defineConfig({
  // Relative base so the build also works from a sub-path (e.g. GitHub Pages).
  base: './',
  plugins: [
    react(),
    viteStaticCopy({
      targets: ['Workers', 'ThirdParty', 'Assets', 'Widgets'].map((dir) => ({
        src: join(cesiumBuild, dir).replaceAll('\\', '/'),
        dest: 'cesium',
        rename: { stripBase: cesiumPathDepth },
      })),
    }),
  ],
  build: { chunkSizeWarningLimit: 6000 },
});

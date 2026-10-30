// Build config for the standalone block screen (block.html + src/block-main.jsx).
//
// This is a second, separate build rather than a second entry in the main
// config because single-file output requires `inlineDynamicImports`, which
// rollup only allows with a single input. Building it on its own keeps each
// bundle self-contained and, crucially, keeps everything the block screen does
// not use (Dashboard, charts, Analytics, Settings, ...) out of it.
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'
import path from 'path'

export default defineConfig({
  plugins: [react(), viteSingleFile()],
  resolve: {
    // Matched against the raw import specifier (not the resolved path), which
    // is why this is a pattern for the relative form the store imports.
    // See src/lib/supabase.blockStub.js — keeps the Supabase client out of the
    // block screen bundle, which never authenticates or syncs.
    alias: [
      {
        find: /^\.{1,2}\/lib\/supabase$/,
        replacement: path.resolve(__dirname, 'src/lib/supabase.blockStub.js'),
      },
    ],
  },
  build: {
    outDir: 'dist-block',
    assetsInlineLimit: 100000000,
    cssCodeSplit: false,
    modulePreload: { polyfill: false },
    rollupOptions: {
      input: path.resolve(__dirname, 'block.html'),
      output: {
        inlineDynamicImports: true,
      },
    },
  },
})

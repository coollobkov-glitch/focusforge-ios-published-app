import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
export default defineConfig({
  root: 'web-auth',
  plugins: [viteSingleFile()],
  build: { outDir: '../dist-auth', emptyOutDir: true, cssCodeSplit: false, modulePreload: { polyfill: false }, rollupOptions: { output: { inlineDynamicImports: true } } }
})

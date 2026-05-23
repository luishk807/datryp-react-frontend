import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'build',
  },
  // Pre-bundle CJS/UMD packages that the export utilities lazy-import.
  // Without this, Vite's on-demand optimizer sometimes serves a broken
  // module shape (e.g. `Workbook` ends up undefined inside the dynamic-
  // import payload) and the export silently fails because the click
  // handler swallows the rejection. Listing them here forces pre-
  // bundling at dev-server startup so the shapes stabilize.
  optimizeDeps: {
    include: ['exceljs', 'pdfmake/build/pdfmake', 'pdfmake/build/vfs_fonts'],
  },
});

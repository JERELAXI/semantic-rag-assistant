import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig(({ mode }) => {
  // Standalone build for the background service worker (ES module, no React)
  if (mode === 'background') {
    return {
      build: {
        lib: {
          entry: resolve(__dirname, 'src/background.ts'),
          formats: ['es'],
          fileName: () => 'background.js',
        },
        outDir: 'dist',
        emptyOutDir: false,
        minify: false,
      },
    }
  }

  // Default: SidePanel React app
  return {
    plugins: [react()],
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      rollupOptions: {
        output: {
          // Keep chunk names stable for the extension
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',
        },
      },
    },
  }
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        // Main-Process entry file of the Electron App.
        entry: 'src/main/index.ts',
        vite: {
          build: {
            sourcemap: true,
            outDir: 'dist-electron/main',
          },
        },
      },
      {
        entry: 'src/main/preload.ts',
        vite: {
          build: {
            sourcemap: 'inline',
            outDir: 'dist-electron/preload',
          },
        },
        onstart(options) {
          // Notify the Renderer-Process to reload the page when the Preload-Scripts build is complete
          options.reload()
        },
      },
    ]),
    renderer(),
  ],
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
      '@renderer': resolve(__dirname, 'src/renderer'),
    },
  },
})

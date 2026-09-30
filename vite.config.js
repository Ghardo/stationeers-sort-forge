import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ command }) => ({
  plugins: [vue()],
  // GitHub Pages serves the release from a sub path, dev runs at the root
  base: command === 'build' ? '/stationeers-sort-forge/' : '/',
}))

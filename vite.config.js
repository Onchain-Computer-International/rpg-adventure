import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      'three': path.resolve(__dirname, 'node_modules/three/build/three.module.js')
    }
  },
  base: '/'
}); 
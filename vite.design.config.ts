import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const root = fileURLToPath(new URL('.', import.meta.url));
export default defineConfig({
  root: fileURLToPath(new URL('./tests/design-lab', import.meta.url)),
  plugins: [react()],
  server: { host: '127.0.0.1', port: 5174, strictPort: true, cors: false, fs: { strict: true, allow: [root] } },
  preview: { host: '127.0.0.1', port: 5174, strictPort: true },
  build: { outDir: fileURLToPath(new URL('./dist-design', import.meta.url)), emptyOutDir: true, target: 'es2022' },
});

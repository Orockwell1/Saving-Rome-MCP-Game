import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  plugins: [react(), viteSingleFile(), {
    name: 'bundled-license-notices',
    transformIndexHtml: {
      order: 'post',
      handler: html => `${html}\n<!--\n${readFileSync(new URL('./THIRD_PARTY_NOTICES.txt', import.meta.url), 'utf8').replaceAll('-->', '--&gt;')}\n-->`,
    },
  }],
  build: { target: 'es2022', assetsInlineLimit: 100_000_000, cssCodeSplit: false },
  server: { proxy: { '/api': 'http://127.0.0.1:8787' } },
});

import { defineConfig } from 'vite';

export default defineConfig({
  // assets/ holds manifest.json and future PNG sprites; served at the site root.
  publicDir: 'assets',
  base: './',
  server: { port: 5173, host: true },
  preview: { port: 4173 },
});

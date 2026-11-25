import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig(({ mode }) => {
  // PYTH_API_KEY has no VITE_ prefix on purpose: the dev/preview proxy injects it, it never reaches the bundle.
  const key = loadEnv(mode, process.cwd(), '').PYTH_API_KEY;
  const hermes = {
    '/hermes': {
      target: 'https://hermes.pyth.network',
      changeOrigin: true,
      rewrite: (p: string) => p.replace(/^\/hermes/, ''),
      headers: key ? { Authorization: `Bearer ${key}` } : {},
    },
  };
  return {
    plugins: [react()],
    define: {
      'process.env': {},
      global: 'globalThis',
    },
    resolve: {
      alias: {
        buffer: 'buffer/',
        'jito-ts/dist/sdk/block-engine/types': fileURLToPath(new URL('./src/solana/jito-stub.ts', import.meta.url)),
      },
    },
    server: {
      port: 5173,
      host: true,
      proxy: hermes,
    },
    preview: { proxy: hermes },
  };
});

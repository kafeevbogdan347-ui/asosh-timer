import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { createHash } from 'crypto';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { normalizeCode } from './src/utils/normalizeCode';

const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // CLASS_CODES="5А:код,5Б:код,..." → в приложение попадают только отпечатки кодов
  const classCodeHashes = (env.CLASS_CODES || '')
    .split(',')
    .map((pair) => pair.split(':').map((s) => s.trim()))
    .filter(([className, code]) => className && code)
    .map(([className, code]) => ({ className, hash: sha256(normalizeCode(code)) }));

  const devPassword = (env.DEV_PASSWORD || '').trim();

  return {
    // На GitHub Pages приложение открывается в подпапке /asosh-timer/
    base: env.BASE_PATH || '/',
    plugins: [react(), tailwindcss()],
    define: {
      __CLASS_CODE_HASHES__: JSON.stringify(classCodeHashes),
      __DEV_PASSWORD_HASH__: JSON.stringify(devPassword ? sha256(devPassword) : ''),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});

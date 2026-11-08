import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import { normalizeCode } from './src/utils/normalizeCode';
import { classCheckHash, devPasswordHash } from './src/utils/kdf';
import { buildPresentationHtml, buildPresentationMarkdown } from './src/data/presentationContent';

// Слайды и текст презентации собираются из src/data/presentationContent.ts,
// чтобы на сайте всегда была актуальная версия: …/presentation.html и …/presentation.md
function presentationPlugin(): Plugin {
  const files: Record<string, { type: string; build: () => string }> = {
    'presentation.html': { type: 'text/html; charset=utf-8', build: buildPresentationHtml },
    'presentation.md': { type: 'text/markdown; charset=utf-8', build: buildPresentationMarkdown },
  };
  return {
    name: 'asosh-presentation',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const name = Object.keys(files).find((f) => req.url?.split('?')[0].endsWith('/' + f));
        if (!name) return next();
        res.setHeader('Content-Type', files[name].type);
        res.end(files[name].build());
      });
    },
    generateBundle() {
      for (const [fileName, file] of Object.entries(files)) {
        this.emitFile({ type: 'asset', fileName, source: file.build() });
      }
    },
  };
}

export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // CLASS_CODES="5А:код,5Б:код,..." → в приложение попадают только медленные отпечатки кодов (PBKDF2)
  const classCodeHashes = await Promise.all(
    (env.CLASS_CODES || '')
      .split(',')
      .map((pair) => pair.split(':').map((s) => s.trim()))
      .filter(([className, code]) => className && code)
      .map(async ([className, code]) => ({ className, hash: await classCheckHash(normalizeCode(code)) }))
  );

  const devPassword = (env.DEV_PASSWORD || '').trim();
  const devPasswordHashValue = devPassword ? await devPasswordHash(devPassword) : '';

  return {
    // На GitHub Pages приложение открывается в подпапке /asosh-timer/
    base: env.BASE_PATH || '/',
    plugins: [react(), tailwindcss(), presentationPlugin()],
    define: {
      __CLASS_CODE_HASHES__: JSON.stringify(classCodeHashes),
      __DEV_PASSWORD_HASH__: JSON.stringify(devPasswordHashValue),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});

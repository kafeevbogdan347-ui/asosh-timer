import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { createHash } from 'crypto';
import path from 'path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import { normalizeCode } from './src/utils/normalizeCode';
import { buildPresentationHtml, buildPresentationMarkdown } from './src/data/presentationContent';

const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');

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
    plugins: [react(), tailwindcss(), presentationPlugin()],
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

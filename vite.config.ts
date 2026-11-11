import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { createHash, pbkdf2Sync, randomBytes } from 'crypto';
import path from 'path';
import { readFileSync } from 'fs';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import { normalizeCode } from './src/utils/normalizeCode';
import { buildPresentationHtml, buildPresentationMarkdown } from './src/data/presentationContent';

const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');
// Медленные отпечатки кодов и пароля: новая случайная соль в каждой сборке
const KDF_ITER = 150000;
const KDF_SALT = randomBytes(16).toString('hex');
const slowHash = (text: string) => pbkdf2Sync(text, Buffer.from(KDF_SALT, 'hex'), KDF_ITER, 32, 'sha256').toString('hex');

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

// version.json рядом с сайтом: по нему старые копии приложения узнают, что вышла новая версия
function versionPlugin(): Plugin {
  const version = (readFileSync(path.resolve(__dirname, 'src/data/constants.ts'), 'utf8').match(/APP_VERSION = '([^']+)'/) || [])[1] || '';
  return {
    name: 'asosh-version',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ version }) });
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
    .map(([className, code]) => ({ className, hash: slowHash(normalizeCode(code)) }));

  const devPassword = (env.DEV_PASSWORD || '').trim();

  return {
    // На GitHub Pages приложение открывается в подпапке /asosh-timer/
    base: env.BASE_PATH || '/',
    plugins: [react(), tailwindcss(), presentationPlugin(), versionPlugin()],
    define: {
      __CLASS_CODE_HASHES__: JSON.stringify(classCodeHashes),
      __DEV_PASSWORD_HASH__: JSON.stringify(devPassword ? slowHash(devPassword) : ''),
      __KDF__: JSON.stringify({ salt: KDF_SALT, iter: KDF_ITER }),
      // Ключ Асошика: VITE_GEMINI_API_KEY (сборка на GitHub) или GEMINI_API_KEY (Google AI Studio)
      'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY || ''),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});

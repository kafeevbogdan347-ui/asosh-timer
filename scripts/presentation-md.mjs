// Пересобирает PRESENTATION.md из src/data/presentationContent.ts: npm run presentation:md
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const { buildPresentationMarkdown } = await import(new URL('../src/data/presentationContent.ts', import.meta.url).href);
writeFileSync(root + 'PRESENTATION.md', buildPresentationMarkdown());
console.log('PRESENTATION.md обновлён');

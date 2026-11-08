// Ключи участников классов для базы: npm run class-keys
// Берёт CLASS_CODES из .env (или из переменной окружения) и пишет class-keys.json.
// Этот файл загружается в Firebase в узел asosh_class_keys (см. README) — после этого база
// пускает в чат класса только тех, кто ввёл верный код. Файл не коммитится.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const { normalizeCode } = await import(new URL('../src/utils/normalizeCode.ts', import.meta.url).href);
const { classMemberKey, classDbKey } = await import(new URL('../src/utils/kdf.ts', import.meta.url).href);

function readClassCodes() {
  if (process.env.CLASS_CODES) return process.env.CLASS_CODES;
  if (!existsSync(root + '.env')) return '';
  const line = readFileSync(root + '.env', 'utf8')
    .split('\n')
    .find((l) => l.trim().startsWith('CLASS_CODES='));
  return line ? line.slice(line.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '') : '';
}

const pairs = readClassCodes()
  .split(',')
  .map((pair) => pair.split(':').map((s) => s.trim()))
  .filter(([cls, code]) => cls && code);

if (!pairs.length) {
  console.error('CLASS_CODES не найден: заполните его в .env (формат "5А:код,5Б:код,...")');
  process.exit(1);
}

const keys = {};
for (const [cls, code] of pairs) keys[classDbKey(cls)] = await classMemberKey(normalizeCode(code));
writeFileSync(root + 'class-keys.json', JSON.stringify(keys, null, 2) + '\n');
console.log(`class-keys.json: ${pairs.length} классов. Загрузите его в Firebase в узел asosh_class_keys (README → «Коды классов в базе»).`);

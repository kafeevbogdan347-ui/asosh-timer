#!/usr/bin/env node
// Надёжный мастер публикации релизов «АСОШ Таймер» для Windows / macOS / Linux.
// Запуск: через publish-asosh.bat или `node scripts/publish.mjs`.
// Работает без сторонних пакетов (только встроенные модули Node.js).

import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import { stdin as input, stdout as output } from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

const log = (msg = '') => console.log(msg);
const ok = (msg) => console.log(`${C.green}[OK]${C.reset} ${msg}`);
const info = (msg) => console.log(`${C.cyan}[..]${C.reset} ${msg}`);
const warn = (msg) => console.log(`${C.yellow}[!]${C.reset} ${msg}`);
const errLog = (msg) => console.log(`${C.red}[ОШИБКА]${C.reset} ${msg}`);

const PROTECTED_ROOT_DIRS = new Set(['.git', 'node_modules', 'dist', 'build', 'coverage', 'android', '.aistudio']);
const PROTECTED_FILES = new Set([
  '.env',
  '.env.local',
  '.env.production',
  'metadata.json',
  'publish-asosh.bat',
  'scripts/publish.mjs',
  'src/data/constants.ts',
  'src/data/whatsNew.ts',
  'package.json',
  'package-lock.json',
  'bun.lock',
  'public/version.json',
]);

function configPath() {
  return path.join(homedir(), '.asosh-publish.json');
}

function loadUserConfig() {
  try {
    return JSON.parse(readFileSync(configPath(), 'utf8'));
  } catch {
    return {};
  }
}

function saveUserConfig(patch) {
  try {
    const next = { ...loadUserConfig(), ...patch };
    writeFileSync(configPath(), JSON.stringify(next, null, 2), 'utf8');
  } catch {
    // не критично
  }
}

export function bumpPatchVersion(ver) {
  const m = String(ver || '').trim().match(/^v?(\d+)\.(\d+)(?:\.(\d+))?$/i);
  if (!m) return 'v16.29';
  const major = Number(m[1]);
  const minor = Number(m[2]);
  const patch = m[3] !== undefined ? Number(m[3]) : null;
  if (patch !== null) return `v${major}.${minor}.${patch + 1}`;
  return `v${major}.${minor + 1}`;
}

export function normalizeVersion(raw) {
  const cleaned = String(raw || '').trim().replace(/^v/i, '');
  if (!/^\d+\.\d+(?:\.\d+)?$/.test(cleaned)) return null;
  return `v${cleaned}`;
}

export function formatRussianDate(date = new Date()) {
  const months = [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
  ];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function escapeSingleQuoted(text) {
  return String(text || '')
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseChangelogText(rawText) {
  const lines = String(rawText || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#') && l !== '---');

  const items = [];
  for (const line of lines) {
    const cleanLine = line.replace(/^[-*•]\s+/, '').trim();
    if (!cleanLine) continue;
    if (cleanLine.includes('|')) {
      const parts = cleanLine.split('|').map((p) => p.trim());
      if (parts.length >= 3) {
        items.push({
          icon: parts[0] || '✨',
          title: parts[1] || 'Обновление',
          text: parts.slice(2).join(' | '),
        });
      } else {
        items.push({
          icon: '✨',
          title: parts[0] || 'Обновление',
          text: parts[1] || parts[0],
        });
      }
      continue;
    }

    const colonIdx = cleanLine.indexOf(':');
    if (colonIdx > 2 && colonIdx < 60) {
      const left = cleanLine.slice(0, colonIdx).trim();
      const right = cleanLine.slice(colonIdx + 1).trim();
      const emojiMatch = left.match(/^(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*)\s+(.+)$/u);
      items.push({
        icon: emojiMatch ? emojiMatch[1] : '✨',
        title: emojiMatch ? emojiMatch[2].trim() : left,
        text: right || left,
      });
      continue;
    }

    const emojiMatch = cleanLine.match(/^(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*)\s+(.+)$/u);
    const body = emojiMatch ? emojiMatch[2].trim() : cleanLine;
    items.push({
      icon: emojiMatch ? emojiMatch[1] : '✨',
      title: body.length > 48 ? `${body.slice(0, 45).trim()}…` : body,
      text: body,
    });
  }
  return items.filter((it) => it.title && it.text);
}

export function insertReleaseIntoWhatsNew(sourceCode, release) {
  const anchor = 'export const WHATS_NEW: WhatsNewRelease[] = [';
  const anchorIdx = sourceCode.indexOf(anchor);
  if (anchorIdx === -1) {
    throw new Error('Не найден массив WHATS_NEW в src/data/whatsNew.ts');
  }

  const head = sourceCode.slice(0, anchorIdx + anchor.length);
  let tail = sourceCode.slice(anchorIdx + anchor.length);

  // Если релиз с таким же номером версии уже стоит первым — заменяем его без дублей
  const firstReleaseMatch = tail.match(/^\s*\{\s*version:\s*'([^']*)'[\s\S]*?\n\s*\},?/);
  if (firstReleaseMatch && firstReleaseMatch[1] === release.version) {
    tail = tail.slice(firstReleaseMatch[0].length);
  }

  const itemsCode = release.items
    .map(
      (it) =>
        `      { icon: '${escapeSingleQuoted(it.icon || '✨')}', title: '${escapeSingleQuoted(it.title)}', text: '${escapeSingleQuoted(it.text)}' },`
    )
    .join('\n');

  const block = `\n  {\n    version: '${escapeSingleQuoted(release.version)}',\n    date: '${escapeSingleQuoted(release.date)}',\n    items: [\n${itemsCode}\n    ],\n  },`;

  return `${head}${block}${tail}`;
}

export function mergePackageJsonSafe(currentRaw, incomingRaw) {
  const cur = JSON.parse(currentRaw);
  const inc = JSON.parse(incomingRaw);
  let changed = false;

  const existingAll = new Set([
    ...Object.keys(cur.dependencies || {}),
    ...Object.keys(cur.devDependencies || {}),
  ]);

  // Добавляем ТОЛЬКО по-настоящему новые пакеты, не трогая версии уже установленных
  // (чтобы не ломать package-lock.json и npm ci в GitHub Actions)
  for (const field of ['dependencies', 'devDependencies']) {
    if (!inc[field]) continue;
    cur[field] = cur[field] || {};
    for (const [pkg, ver] of Object.entries(inc[field])) {
      if (!existingAll.has(pkg)) {
        cur[field][pkg] = ver;
        existingAll.add(pkg);
        changed = true;
      }
    }
  }
  return {
    changed,
    nextJson: `${JSON.stringify(cur, null, 2)}\n`,
  };
}

function sha256File(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

function run(cmd, args, cwd, opts = {}) {
  if (process.platform === 'win32' && /\.(cmd|bat)$/i.test(cmd)) {
    const q = (s) => (/[\s"&|<>^()]/.test(s) ? `"${String(s).replace(/"/g, '\\"')}"` : String(s));
    const cmdLine = [cmd, ...args.map(q)].join(' ');
    return spawnSync('cmd.exe', ['/d', '/s', '/c', `"${cmdLine}"`], {
      cwd,
      encoding: 'utf8',
      windowsVerbatimArguments: true,
      stdio: opts.capture ? 'pipe' : 'inherit',
    });
  }
  return spawnSync(cmd, args, {
    cwd,
    encoding: 'utf8',
    stdio: opts.capture ? 'pipe' : 'inherit',
  });
}

function runCapture(cmd, args, cwd) {
  return execFileSync(cmd, args, { cwd, encoding: 'utf8' }).trim();
}

function resolveNpmCmd() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

function resolveNpxCmd() {
  return process.platform === 'win32' ? 'npx.cmd' : 'npx';
}

function findRepoRoot(explicitCwd) {
  const selfDir = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    explicitCwd,
    process.cwd(),
    path.resolve(selfDir, '..'),
    path.join(homedir(), 'Desktop', 'asosh-timer'),
  ].filter(Boolean);

  for (const dir of candidates) {
    if (existsSync(path.join(dir, '.git')) && existsSync(path.join(dir, 'package.json'))) {
      return dir;
    }
  }
  return null;
}

function cleanStuckGitStates(repoRoot) {
  const gitDir = path.join(repoRoot, '.git');
  if (existsSync(path.join(gitDir, 'rebase-merge')) || existsSync(path.join(gitDir, 'rebase-apply'))) {
    warn('Найден незавершённый git rebase — аккуратно откатываю...');
    run('git', ['rebase', '--abort'], repoRoot, { capture: true });
  }
  if (existsSync(path.join(gitDir, 'MERGE_HEAD'))) {
    warn('Найден незавершённый git merge — аккуратно откатываю...');
    run('git', ['merge', '--abort'], repoRoot, { capture: true });
  }
  if (existsSync(path.join(gitDir, 'CHERRY_PICK_HEAD'))) {
    warn('Найден незавершённый cherry-pick — аккуратно откатываю...');
    run('git', ['cherry-pick', '--abort'], repoRoot, { capture: true });
  }
}

function findRecentZips() {
  const dirs = [
    path.join(homedir(), 'Downloads'),
    path.join(homedir(), 'Desktop'),
  ].filter((d) => existsSync(d));

  const found = [];
  for (const d of dirs) {
    for (const name of readdirSync(d)) {
      if (!name.toLowerCase().endsWith('.zip')) continue;
      const full = path.join(d, name);
      try {
        const st = statSync(full);
        if (st.isFile()) found.push({ full, name, mtimeMs: st.mtimeMs, sizeMb: (st.size / (1024 * 1024)).toFixed(1) });
      } catch {
        // ignore
      }
    }
  }
  return found.sort((a, b) => b.mtimeMs - a.mtimeMs).slice(0, 5);
}

function extractZipToTemp(zipPath) {
  const tempRoot = mkdtempSync(path.join(tmpdir(), 'asosh-zip-'));
  let extractedOk = false;

  if (process.platform === 'win32') {
    const tarRes = spawnSync('tar.exe', ['-xf', zipPath, '-C', tempRoot], { encoding: 'utf8' });
    extractedOk = tarRes.status === 0;
    if (!extractedOk) {
      const psCmd = `Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${tempRoot.replace(/'/g, "''")}' -Force`;
      const psRes = spawnSync('powershell.exe', ['-NoProfile', '-Command', psCmd], { encoding: 'utf8' });
      extractedOk = psRes.status === 0;
    }
  } else {
    const unzipRes = spawnSync('unzip', ['-q', '-o', zipPath, '-d', tempRoot], { encoding: 'utf8' });
    extractedOk = unzipRes.status === 0;
  }

  if (!extractedOk) {
    rmSync(tempRoot, { recursive: true, force: true });
    throw new Error(`Не удалось распаковать архив: ${zipPath}`);
  }

  const entries = readdirSync(tempRoot).filter((x) => x !== '__MACOSX');
  let sourceDir = tempRoot;
  if (entries.length === 1) {
    const inner = path.join(tempRoot, entries[0]);
    if (statSync(inner).isDirectory() && existsSync(path.join(inner, 'package.json'))) {
      sourceDir = inner;
    }
  }
  return { tempRoot, sourceDir };
}

function walkFiles(dir, base = dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    const rel = path.relative(base, full).replace(/\\/g, '/');
    const topDir = rel.split('/')[0];
    if (PROTECTED_ROOT_DIRS.has(topDir)) continue;
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...walkFiles(full, base));
    } else if (st.isFile()) {
      out.push({ full, rel });
    }
  }
  return out;
}

function stripAppVersionLine(text) {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/export const APP_VERSION = '[^']*';\n?/, '');
}

async function applyZipOverlay(rl, repoRoot, sourceDir) {
  const files = walkFiles(sourceDir);
  const copied = [];
  let depsChanged = false;
  let constantsAsk = false;

  for (const f of files) {
    if (f.rel.startsWith('.github/')) continue;
    if (f.rel.startsWith('public/assets/aistudio/')) continue;
    if (f.rel.endsWith('.log')) continue;

    const dst = path.join(repoRoot, f.rel);

    if (f.rel === 'package.json' && existsSync(dst)) {
      const merged = mergePackageJsonSafe(readFileSync(dst, 'utf8'), readFileSync(f.full, 'utf8'));
      if (merged.changed) {
        writeFileSync(dst, merged.nextJson, 'utf8');
        copied.push('package.json (добавлены новые пакеты)');
        depsChanged = true;
      }
      continue;
    }

    if (f.rel === 'vite.config.ts' && existsSync(dst)) {
      const stripKeyLine = (s) =>
        s.replace(/\r\n/g, '\n').replace(/\s*\/\/ Ключ Асошика:[^\n]*\n\s*'import\.meta\.env\.VITE_GEMINI_API_KEY':[^\n]*\n/, '\n');
      if (stripKeyLine(readFileSync(dst, 'utf8')) === stripKeyLine(readFileSync(f.full, 'utf8'))) {
        continue;
      }
    }

    if (f.rel === 'src/data/constants.ts' && existsSync(dst)) {
      const curBody = stripAppVersionLine(readFileSync(dst, 'utf8'));
      const incBody = stripAppVersionLine(readFileSync(f.full, 'utf8'));
      if (curBody !== incBody) constantsAsk = true;
      continue;
    }

    if (PROTECTED_FILES.has(f.rel)) continue;

    const same = existsSync(dst) && sha256File(dst) === sha256File(f.full);
    if (!same) {
      mkdirSync(path.dirname(dst), { recursive: true });
      cpSync(f.full, dst);
      copied.push(f.rel);
    }
  }

  if (constantsAsk) {
    const ans = (await rl.question(`${C.yellow}[?]${C.reset} В ZIP изменились данные в src/data/constants.ts (расписание/справочник). Обновить их, сохранив номер версии? [Y/n]: `)).trim().toLowerCase();
    if (!ans || ans === 'y' || ans === 'yes' || ans === 'д' || ans === 'да') {
      const dst = path.join(repoRoot, 'src/data/constants.ts');
      const curVerMatch = readFileSync(dst, 'utf8').match(/export const APP_VERSION = '([^']+)';/);
      let incText = readFileSync(path.join(sourceDir, 'src/data/constants.ts'), 'utf8');
      if (curVerMatch) {
        incText = incText.replace(/export const APP_VERSION = '[^']+';/, `export const APP_VERSION = '${curVerMatch[1]}';`);
      }
      writeFileSync(dst, incText, 'utf8');
      copied.push('src/data/constants.ts (данные обновлены)');
    }
  }

  return { copied, depsChanged };
}

function autoDraftItems(changedFiles) {
  const joined = changedFiles.join('\n').toLowerCase();
  const items = [];
  if (/assistant|voicegemini|server\.ts/.test(joined)) {
    items.push({
      icon: '🫧',
      title: 'Обновление Асошика',
      text: 'Улучшены стабильность, скорость ответа, голосовой режим и новые возможности ИИ-помощника.',
    });
  }
  if (/homework|diary|journal/.test(joined)) {
    items.push({
      icon: '📘',
      title: 'Дневник и домашка',
      text: 'Доработаны домашние задания, отображение оценок и удобство работы с дневником.',
    });
  }
  if (/schedule|lessonstatus|bells|backpack|map/.test(joined)) {
    items.push({
      icon: '📅',
      title: 'Расписание и таймер',
      text: 'Уточнена работа расписания уроков, звонков и подсказок на главном экране.',
    });
  }
  if (/games|theme|index\.css|mainscreen/.test(joined)) {
    items.push({
      icon: '🎨',
      title: 'Интерфейс и оформление',
      text: 'Улучшен внешний вид экранов, анимации и отзывчивость на телефоне и компьютере.',
    });
  }
  if (!items.length) {
    items.push({
      icon: '✨',
      title: 'Улучшения и исправления',
      text: 'Исправлены найденные ошибки и повышена стабильность работы приложения.',
    });
  }
  return items;
}

async function composeChangelogItems(rl, version, changedFiles) {
  const draft = autoDraftItems(changedFiles);
  log('');
  log(`${C.bold}Подробное описание обновления для ${version}:${C.reset}`);
  log('  [1] Ввести несколько пунктов по очереди прямо здесь (рекомендуется)');
  log('  [2] Открыть удобный шаблон в Блокноте (UTF-8) для длинного текста');
  log('  [3] Использовать авто-черновик по изменённым файлам');
  const mode = (await rl.question('Выбор (Enter = 1): ')).trim() || '1';

  if (mode === '3') return draft;

  if (mode === '2') {
    const tmpFile = path.join(tmpdir(), `asosh-whatsnew-${Date.now()}.txt`);
    const template = [
      `# Подробное обновление ${version} (строки с # игнорируются)`,
      '# Формат каждой строки: Иконка | Короткий заголовок | Подробное описание для учеников и сайта',
      '# Можно написать сколько угодно строк:',
      '',
      ...draft.map((it) => `${it.icon} | ${it.title} | ${it.text}`),
      '',
    ].join('\n');
    writeFileSync(tmpFile, `\uFEFF${template}`, 'utf8');
    info('Открываю Блокнот. Отредактируй пункты, нажми Ctrl+S и закрой окно Блокнота...');
    if (process.platform === 'win32') {
      spawnSync('notepad.exe', [tmpFile], { stdio: 'inherit' });
    } else {
      await rl.question(`Отредактируй файл ${tmpFile} и нажми Enter...`);
    }
    const content = readFileSync(tmpFile, 'utf8').replace(/^\uFEFF/, '');
    rmSync(tmpFile, { force: true });
    const parsed = parseChangelogText(content);
    if (parsed.length > 0) return parsed;
    warn('Файл остался пустым — использую авто-черновик.');
    return draft;
  }

  log('');
  info('Вводи пункты по одному (пустой заголовок или Enter на новом пункте — закончить ввод):');
  const items = [];
  for (let idx = 1; idx <= 8; idx++) {
    const title = (await rl.question(`  Пункт ${idx} — Заголовок (Enter = закончить): `)).trim();
    if (!title) break;
    const text = (await rl.question(`  Пункт ${idx} — Подробный текст: `)).trim() || title;
    const icon = (await rl.question(`  Пункт ${idx} — Эмодзи-иконка (Enter = ✨): `)).trim() || '✨';
    items.push({ icon, title, text });
  }
  return items.length ? items : draft;
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function syncPromoSite(siteDir, release, opts = {}) {
  const useGit = opts.useGit !== false;
  if (useGit && !existsSync(path.join(siteDir, '.git'))) {
    return { updated: false, reason: 'Не найдена папка .git в директории сайта' };
  }
  if (useGit) {
    cleanStuckGitStates(siteDir);
    run('git', ['pull', '--ff-only', 'origin', 'main'], siteDir, { capture: true });
  }

  const touched = [];

  // 1) JSON-формат (updates.json / changelog.json / releases.json)
  for (const jsonName of [
    'updates.json',
    'changelog.json',
    'releases.json',
    'data/updates.json',
    'public/updates.json',
    'docs/updates.json',
  ]) {
    const p = path.join(siteDir, jsonName);
    if (!existsSync(p)) continue;
    try {
      const data = JSON.parse(readFileSync(p, 'utf8'));
      const list = Array.isArray(data) ? data : Array.isArray(data.releases) ? data.releases : null;
      if (list) {
        const filtered = list.filter((r) => r?.version !== release.version);
        filtered.unshift(release);
        const out = Array.isArray(data) ? filtered : { ...data, latest: release.version, releases: filtered };
        writeFileSync(p, `${JSON.stringify(out, null, 2)}\n`, 'utf8');
        touched.push(jsonName);
      }
    } catch {
      // skip invalid json
    }
  }

  // 2) Нативная страница обновлений сайта (updates/index.html) с <section class="rel" id="v...">
  const updatesIndexRel = ['updates/index.html', 'docs/updates/index.html'].find((rel) =>
    existsSync(path.join(siteDir, rel))
  );
  if (updatesIndexRel) {
    const p = path.join(siteDir, updatesIndexRel);
    let html = readFileSync(p, 'utf8');
    const anchorId = release.version.replace('.', '-');
    const escapedAnchor = anchorId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const featureBlocks = release.items
      .map(
        (it) =>
          `        <div class="feature">\n          <h3>${escapeHtml(it.icon ? `${it.icon} ${it.title}` : it.title)}</h3>\n          <p>${escapeHtml(it.text)}</p>\n        </div>`
      )
      .join('\n');

    const sectionBlock =
      `<section class="rel" id="${escapeHtml(anchorId)}">\n` +
      `        <div class="rel-head"><h2>${escapeHtml(release.version)}</h2><span class="date">${escapeHtml(release.date)}</span><span class="badge">НОВОЕ</span></div>\n` +
      `${featureBlocks}\n` +
      `      </section>`;

    if (html.includes('<section class="rel"')) {
      // Удаляем существующую секцию той же версии (идемпотентность)
      const dupSecRegex = new RegExp(`<section class="rel" id="${escapedAnchor}"[\\s\\S]*?<\\/section>\\s*`, 'g');
      html = html.replace(dupSecRegex, '');
      // Снимаем бейдж "НОВОЕ" со старых релизов
      html = html.replace(/<span class="badge">НОВОЕ<\/span>/g, '');
      // Вставляем новую секцию перед первым <section class="rel"
      html = html.replace(/(<section class="rel")/, `${sectionBlock}\n\n      $1`);

      // Обновляем оглавление строго внутри <nav class="toc" ...>...</nav>, не трогая верхнюю ссылку "Последнее"
      const tocDupRegex = new RegExp(`<a href="#${escapedAnchor}">[^<]*<\\/a>`, 'g');
      html = html.replace(
        /(<nav class="toc"[^>]*>)([\s\S]*?)(<\/nav>)/,
        (_m, open, inner, close) =>
          `${open}<a href="#${escapeHtml(anchorId)}">${escapeHtml(release.version)}</a>${inner.replace(tocDupRegex, '')}${close}`
      );

      // Обновляем верхнюю ссылку "Последнее"
      html = html.replace(/<a href="#[^"]*">Последнее<\/a>/, `<a href="#${escapeHtml(anchorId)}">Последнее</a>`);

      writeFileSync(p, html, 'utf8');
      touched.push(updatesIndexRel);
    }
  }

  // 3) Прочий HTML-сайт (updates.html / index.html с маркерами <!-- ASOSH_UPDATES_START -->)
  const htmlCards = release.items
    .map(
      (it) =>
        `          <li><span class="upd-ico">${escapeHtml(it.icon)}</span> <strong>${escapeHtml(it.title)}</strong> — ${escapeHtml(it.text)}</li>`
    )
    .join('\n');
  const htmlBlock =
    `      <article class="release-card" data-version="${escapeHtml(release.version)}">\n` +
    `        <header><h3>${escapeHtml(release.version)}</h3> <time>${escapeHtml(release.date)}</time></header>\n` +
    `        <ul>\n${htmlCards}\n        </ul>\n` +
    `      </article>`;

  const escapedVer = release.version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  for (const htmlName of ['updates.html', 'index.html', 'docs/updates.html', 'docs/index.html']) {
    const p = path.join(siteDir, htmlName);
    if (!existsSync(p)) continue;
    let html = readFileSync(p, 'utf8');
    const marker = '<!-- ASOSH_UPDATES_START -->';
    if (html.includes(marker)) {
      const cardRegex = new RegExp(`\\s*<article class="release-card" data-version="${escapedVer}"[\\s\\S]*?<\\/article>`, 'g');
      html = html.replace(cardRegex, '');
      html = html.replace(marker, `${marker}\n${htmlBlock}`);
      writeFileSync(p, html, 'utf8');
      touched.push(htmlName);
    }
  }

  // 4) TypeScript/JS модуль обновлений
  for (const tsName of ['src/data/whatsNew.ts', 'whatsNew.ts']) {
    const p = path.join(siteDir, tsName);
    if (!existsSync(p)) continue;
    try {
      const updated = insertReleaseIntoWhatsNew(readFileSync(p, 'utf8'), release);
      writeFileSync(p, updated, 'utf8');
      touched.push(tsName);
    } catch {
      // skip
    }
  }

  return { updated: touched.length > 0, touched };
}

function parseOriginRepo(remoteUrl) {
  const m = String(remoteUrl || '').match(/github\.com[:/]([^/]+)\/([^/.]+)(?:\.git)?$/i);
  return m ? { owner: m[1], repo: m[2] } : null;
}

async function pollDeployAndVersion(remoteInfo, expectedVersion, expectedSha = '') {
  const { owner, repo } = remoteInfo;
  const pagesVersionUrl = `https://${owner}.github.io/${repo}/version.json`;
  const actionsUrl = `https://api.github.com/repos/${owner}/${repo}/actions/runs?branch=main&per_page=8`;

  info(`Жду деплой на GitHub Actions (${owner}/${repo}) и появление ${expectedVersion} в ${pagesVersionUrl}...`);
  const deadline = Date.now() + 5 * 60_000;
  let deployDone = false;

  while (Date.now() < deadline) {
    if (!deployDone) {
      try {
        const res = await fetch(actionsUrl, {
          headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'asosh-publisher' },
        });
        if (res.ok) {
          const data = await res.json();
          const runs = (data.workflow_runs || []).filter((r) => !expectedSha || r.head_sha === expectedSha);
          const deployRun = runs.find((r) => /deploy|pages/i.test(r.name || ''));
          if (deployRun) {
            if (deployRun.status === 'completed') {
              if (deployRun.conclusion === 'success') {
                ok('Сборка GitHub Pages успешно завершилась!');
                deployDone = true;
              } else {
                errLog(`Сборка GitHub Actions завершилась со статусом: ${deployRun.conclusion}`);
                if (deployRun.html_url) info(`Подробности: ${deployRun.html_url}`);
                return false;
              }
            } else {
              const statusLine = `  [Actions] ${deployRun.name}: ${deployRun.status}...`.slice(0, 74);
              output.write(`${statusLine.padEnd(74, ' ')}\r`);
            }
          }
        }
      } catch {
        // GitHub API может ограничивать частоту — проверяем напрямую version.json
      }
    }

    try {
      const vRes = await fetch(`${pagesVersionUrl}?t=${Date.now()}`, { cache: 'no-store' });
      if (vRes.ok) {
        const vJson = await vRes.json();
        if (vJson?.version === expectedVersion) {
          log('');
          ok(`Промпт обновления подтверждён! ${pagesVersionUrl} уже отдаёт ${expectedVersion}.`);
          return true;
        }
      }
    } catch {
      // retry
    }

    await new Promise((r) => setTimeout(r, 6000));
  }

  log('');
  warn('Таймаут ожидания 5 минут — проверь вкладку Actions на GitHub.');
  return false;
}

async function runVerificationChecks(rl, repoRoot) {
  const pkg = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
  const scripts = pkg.scripts || {};
  const npmCmd = resolveNpmCmd();
  const npxCmd = resolveNpxCmd();

  const steps = [];
  if (scripts.lint) steps.push({ name: 'Проверка типов (lint)', cmd: npmCmd, args: ['run', 'lint'] });
  if (scripts.test) {
    steps.push({ name: 'Юнит-тесты', cmd: npmCmd, args: ['test'] });
  } else {
    const unitFiles = ['tests/hwReminder.test.mjs', 'tests/lessonStatus.test.mjs', 'tests/quarterGrades.test.mjs'].filter((f) =>
      existsSync(path.join(repoRoot, f))
    );
    if (unitFiles.length) steps.push({ name: 'Юнит-тесты', cmd: 'node', args: ['--test', ...unitFiles] });
  }
  if (scripts['test:stress']) {
    steps.push({ name: 'Стресс-тесты', cmd: npmCmd, args: ['run', 'test:stress'] });
  } else if (existsSync(path.join(repoRoot, 'tests/stress.test.mjs'))) {
    steps.push({ name: 'Стресс-тесты', cmd: npxCmd, args: ['tsx', 'tests/stress.test.mjs'] });
  }
  if (scripts.build) steps.push({ name: 'Сборка (vite build)', cmd: npmCmd, args: ['run', 'build'] });

  for (const step of steps) {
    while (true) {
      info(`${step.name}...`);
      const res = run(step.cmd, step.args, repoRoot);
      if (res.status === 0) {
        ok(`${step.name} пройдено`);
        break;
      }
      errLog(`Этап «${step.name}» завершился с ошибкой!`);
      const act = (await rl.question('Что сделать? [R] Повторить, [S] Пропустить, [Q] Отменить публикацию: ')).trim().toLowerCase();
      if (act === 's' || act === 'skip') break;
      if (act === 'q' || act === 'quit' || act === 'exit') return false;
    }
  }
  return true;
}

// Надёжное чтение строк без raw-режима и ANSI-сдвигов курсора:
// исключает скачки/перемешивание текста в Windows 10 conhost.exe после вызовов git/cmd.
function createPromptReader() {
  const rl = readline.createInterface({ input, crlfDelay: Infinity, terminal: false });
  const queue = [];
  let waiter = null;
  let closed = false;

  rl.on('line', (line) => {
    if (waiter) {
      const resolve = waiter;
      waiter = null;
      rl.pause();
      resolve(line);
    } else {
      queue.push(line);
    }
  });
  rl.on('close', () => {
    closed = true;
    if (waiter) {
      const resolve = waiter;
      waiter = null;
      resolve('');
    }
  });

  return {
    async question(promptText) {
      output.write(promptText);
      if (queue.length > 0) return queue.shift();
      if (closed) return '';
      rl.resume();
      return new Promise((resolve) => {
        waiter = resolve;
      });
    },
    close() {
      rl.close();
    },
  };
}

async function main() {
  const cwdFlagIdx = process.argv.indexOf('--cwd');
  const explicitCwd = cwdFlagIdx !== -1 ? process.argv[cwdFlagIdx + 1] : undefined;
  const repoRoot = findRepoRoot(explicitCwd);
  if (!repoRoot) {
    errLog('Не найдена папка проекта asosh-timer с .git и package.json.');
    process.exit(1);
  }

  const rl = createPromptReader();
  try {
    log(`${C.bold}${C.cyan}============================================${C.reset}`);
    log(`${C.bold}   АСОШ Таймер — Надёжная публикация v2.0   ${C.reset}`);
    log(`${C.bold}${C.cyan}============================================${C.reset}`);
    info(`Папка проекта: ${repoRoot}`);

    // 1. Очистка зависших состояний Git
    cleanStuckGitStates(repoRoot);

    // 2. Сначала синхронизация с GitHub ДО распаковки ZIP (исключает конфликты)
    info('Синхронизирую текущую ветку с GitHub...');
    const fetchRes = run('git', ['fetch', 'origin', 'main'], repoRoot, { capture: true });
    if (fetchRes.status !== 0) {
      warn('Не удалось выполнить git fetch origin main — проверь интернет или авторизацию.');
    } else {
      try {
        const countsRaw = runCapture('git', ['rev-list', '--left-right', '--count', 'HEAD...origin/main'], repoRoot);
        const [ahead, behind] = countsRaw.split(/\s+/).map(Number);
        if (behind > 0 && ahead === 0) {
          const pullRes = run('git', ['pull', '--ff-only', 'origin', 'main'], repoRoot);
          if (pullRes.status === 0) ok(`Подтянуто ${behind} коммит(ов) с GitHub без конфликтов.`);
        } else if (behind > 0 && ahead > 0) {
          warn(`Ветка разошлась с GitHub (локально +${ahead}, на сервере +${behind}). Объединяю без конфликтов...`);
          run('git', ['pull', '--no-rebase', '-X', 'ours', '--no-edit', 'origin', 'main'], repoRoot);
        } else {
          ok('Локальный репозиторий актуален с GitHub.');
        }
      } catch {
        warn('Не удалось сравнить ветку с origin/main — продолжаю работу.');
      }
    }

    // 3. Поиск и наложение свежего ZIP из AI Studio
    const zips = findRecentZips();
    let tempCleanup = null;
    log('');
    if (zips.length > 0) {
      log(`${C.bold}Найдены недавние архивы:${C.reset}`);
      zips.forEach((z, idx) => {
        const dt = new Date(z.mtimeMs).toLocaleString('ru-RU');
        log(`  [${idx + 1}] ${z.name} (${z.sizeMb} МБ · ${dt})`);
      });
    } else {
      info('В Загрузках и на Рабочем столе ZIP-архивы не найдены.');
    }
    log('  [0] Не брать ZIP — опубликовать текущие файлы из папки проекта');
    log('  [P] Указать путь к ZIP вручную');
    const defaultPick = zips.length > 0 ? '1' : '0';
    const pick = (await rl.question(`Выбери архив (Enter = ${defaultPick}): `)).trim() || defaultPick;

    let chosenZipPath = '';
    if (pick.toLowerCase() === 'p') {
      const manual = (await rl.question('Вставь путь к .zip файлу (можно перетащить файл в окно): ')).trim().replace(/^"(.*)"$/, '$1');
      if (manual && existsSync(manual)) {
        chosenZipPath = manual;
      } else if (manual) {
        warn(`Файл не найден: ${manual} — работаю с текущей папкой проекта.`);
      }
    } else {
      const num = Number(pick);
      if (num >= 1 && num <= zips.length) {
        chosenZipPath = zips[num - 1].full;
      }
    }

    if (chosenZipPath) {
      info(`Распаковываю ${path.basename(chosenZipPath)}...`);
      const { tempRoot, sourceDir } = extractZipToTemp(chosenZipPath);
      tempCleanup = tempRoot;
      const { copied, depsChanged } = await applyZipOverlay(rl, repoRoot, sourceDir);
      if (copied.length > 0) {
        ok(`Перенесено файлов из ZIP: ${copied.length}`);
        copied.slice(0, 10).forEach((f) => log(`    + ${f}`));
        if (copied.length > 10) log(`    ... и ещё ${copied.length - 10}`);
      } else {
        info('Все файлы из ZIP уже совпадают с проектом.');
      }
      if (depsChanged) {
        info('Изменились зависимости — запускаю npm install...');
        run(resolveNpmCmd(), ['install', '--no-audit', '--no-fund'], repoRoot);
      }
    }

    if (tempCleanup) rmSync(tempCleanup, { recursive: true, force: true });

    // 4. Определение текущей версии и вопрос про обновление
    const constantsPath = path.join(repoRoot, 'src/data/constants.ts');
    const whatsNewPath = path.join(repoRoot, 'src/data/whatsNew.ts');
    const constantsSrc = readFileSync(constantsPath, 'utf8');
    const currentVer = (constantsSrc.match(/export const APP_VERSION = '([^']+)';/) || [])[1] || 'v16.28';
    const suggestedNext = bumpPatchVersion(currentVer);

    log('');
    log(`Текущая версия: ${C.bold}${currentVer}${C.reset}`);
    log(`  [1] Поднять версию до ${C.green}${suggestedNext}${C.reset} + подробное «Что нового» + проверка обновления на сайте`);
    log('  [2] Не поднимать версию — просто запушить правки без промпта обновления');
    const bumpChoice = (await rl.question('Выбор (Enter = 1): ')).trim() || '1';

    let targetVer = currentVer;
    let releaseObj = null;
    const isBump = bumpChoice !== '2';

    const statusOut = runCapture('git', ['status', '--short'], repoRoot);
    const changedFiles = statusOut
      .split('\n')
      .map((l) => l.slice(3).trim())
      .filter(Boolean);

    if (isBump) {
      const customVerRaw = (await rl.question(`Номер новой версии (Enter = ${suggestedNext}): `)).trim();
      if (customVerRaw) {
        const norm = normalizeVersion(customVerRaw);
        if (!norm) throw new Error(`Неверный формат версии: ${customVerRaw}`);
        targetVer = norm;
      } else {
        targetVer = suggestedNext;
      }

      const items = await composeChangelogItems(rl, targetVer, changedFiles);
      releaseObj = {
        version: targetVer,
        date: formatRussianDate(),
        items,
      };

      writeFileSync(
        constantsPath,
        constantsSrc.replace(/export const APP_VERSION = '[^']+';/, `export const APP_VERSION = '${targetVer}';`),
        'utf8'
      );
      writeFileSync(whatsNewPath, insertReleaseIntoWhatsNew(readFileSync(whatsNewPath, 'utf8'), releaseObj), 'utf8');

      const pubVerJson = path.join(repoRoot, 'public/version.json');
      if (existsSync(pubVerJson)) {
        writeFileSync(pubVerJson, `${JSON.stringify({ version: targetVer })}\n`, 'utf8');
      }

      ok(`Версия обновлена: ${currentVer} -> ${targetVer} (карточек в «Что нового»: ${items.length})`);
    }

    // 5. Проверки (lint, test, stress, build)
    log('');
    const checksOk = await runVerificationChecks(rl, repoRoot);
    if (!checksOk) {
      warn('Публикация отменена. Локальные изменения не отправлены.');
      return;
    }

    // 6. Коммит и надёжный push
    const postStatus = runCapture('git', ['status', '--short'], repoRoot);
    if (!postStatus) {
      ok('Нет новых изменений для коммита.');
    } else {
      const defaultMsg = isBump
        ? `${targetVer}: ${releaseObj?.items[0]?.title || 'обновление'}`
        : 'Обновление кода без смены версии';
      const commitMsg = (await rl.question(`Сообщение коммита (Enter = ${defaultMsg}): `)).trim() || defaultMsg;

      run('git', ['add', '-A'], repoRoot);
      const commitRes = run('git', ['commit', '-m', commitMsg], repoRoot);
      if (commitRes.status !== 0) {
        throw new Error('Не удалось создать git commit');
      }
    }

    info('Отправляю на GitHub (origin main)...');
    let pushRes = run('git', ['push', 'origin', 'main'], repoRoot);
    if (pushRes.status !== 0) {
      warn('Push отклонён — досинхронизирую с origin/main и повторяю push...');
      run('git', ['pull', '--no-rebase', '-X', 'ours', '--no-edit', 'origin', 'main'], repoRoot);
      pushRes = run('git', ['push', 'origin', 'main'], repoRoot);
      if (pushRes.status !== 0) {
        throw new Error('git push origin main не удался даже после досинхронизации');
      }
    }
    ok('Основной репозиторий успешно опубликован на GitHub!');

    // 7. Синхронизация подробного обновления в репозиторий сайта (asosh-timer-site)
    if (isBump && releaseObj) {
      const cfg = loadUserConfig();
      const autoSiteCandidates = [
        cfg.siteDir,
        path.resolve(repoRoot, '..', 'asosh-timer-site'),
        path.join(homedir(), 'Desktop', 'asosh-timer-site'),
      ].filter((p) => p && existsSync(p));

      let siteDir = autoSiteCandidates[0] || '';
      if (!siteDir) {
        const askSite = (await rl.question('Путь к папке сайта asosh-timer-site для подробных обновлений (Enter = пропустить): ')).trim();
        if (askSite && existsSync(askSite)) {
          siteDir = askSite;
          saveUserConfig({ siteDir });
        }
      } else {
        saveUserConfig({ siteDir });
      }

      if (siteDir) {
        info(`Обновляю подробную ленту на сайте (${siteDir})...`);
        const siteRes = syncPromoSite(siteDir, releaseObj);
        if (siteRes.updated) {
          ok(`Обновлены файлы сайта: ${siteRes.touched.join(', ')}`);
          run('git', ['add', '-A'], siteDir);
          const siteCommit = run('git', ['commit', '-m', `${targetVer}: подробное обновление`], siteDir);
          if (siteCommit.status === 0) {
            let sitePush = run('git', ['push', 'origin', 'main'], siteDir);
            if (sitePush.status !== 0) {
              warn('Push сайта отклонён — досинхронизирую и повторяю...');
              run('git', ['pull', '--no-rebase', '-X', 'ours', '--no-edit', 'origin', 'main'], siteDir);
              sitePush = run('git', ['push', 'origin', 'main'], siteDir);
            }
            if (sitePush.status === 0) {
              ok('Сайт обновлений успешно отправлен на GitHub!');
            } else {
              warn('Не удалось запушить сайт asosh-timer-site (основной репозиторий уже опубликован).');
            }
          } else {
            info('В репозитории сайта нечего коммитить.');
          }
        } else {
          warn(`Сайт не обновлён автоматически: ${siteRes.reason || 'не найдены маркеры/файлы обновлений'}`);
        }
      }
    }

    // 8. Контроль выхода обновления и промпта (только если версия поднята)
    if (isBump) {
      const remoteUrl = runCapture('git', ['remote', 'get-url', 'origin'], repoRoot);
      const remoteInfo = parseOriginRepo(remoteUrl);
      const headSha = runCapture('git', ['rev-parse', 'HEAD'], repoRoot);
      if (remoteInfo) {
        await pollDeployAndVersion(remoteInfo, targetVer, headSha);
      }
    }

    log('');
    ok('Готово! Публикация полностью завершена.');
  } finally {
    rl.close();
  }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  main().catch((err) => {
    errLog(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}

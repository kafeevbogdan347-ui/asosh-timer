import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  bumpPatchVersion,
  formatRussianDate,
  insertReleaseIntoWhatsNew,
  mergePackageJsonSafe,
  normalizeVersion,
  parseChangelogText,
  syncPromoSite,
} from '../scripts/publish.mjs';

test('bumpPatchVersion increments minor or patch versions reliably', () => {
  assert.equal(bumpPatchVersion('v16.28'), 'v16.29');
  assert.equal(bumpPatchVersion('16.28'), 'v16.29');
  assert.equal(bumpPatchVersion('v16.28.3'), 'v16.28.4');
  assert.equal(bumpPatchVersion('invalid'), 'v16.29');
});

test('normalizeVersion normalizes with leading v and rejects invalid', () => {
  assert.equal(normalizeVersion('16.30'), 'v16.30');
  assert.equal(normalizeVersion('V16.30.1'), 'v16.30.1');
  assert.equal(normalizeVersion('abc'), null);
  assert.equal(normalizeVersion(''), null);
});

test('formatRussianDate formats day month year in Russian', () => {
  const sample = new Date(2026, 10, 14); // 14 ноября 2026
  assert.equal(formatRussianDate(sample), '14 ноября 2026');
});

test('parseChangelogText supports pipes, colons, bullets, comments, and plain lines', () => {
  const raw = [
    '# комментарий',
    '---',
    '🎙️ | Голос Асошика | Добавлен режим живого разговора и выбор голоса.',
    '- 📘 Дневник: Исправлен подсчёт среднего балла за четверть.',
    '• 🚀 Ускорена загрузка расписания на слабых телефонах',
    'Мелкие исправления интерфейса',
  ].join('\n');

  const items = parseChangelogText(raw);
  assert.equal(items.length, 4);
  assert.deepEqual(items[0], {
    icon: '🎙️',
    title: 'Голос Асошика',
    text: 'Добавлен режим живого разговора и выбор голоса.',
  });
  assert.deepEqual(items[1], {
    icon: '📘',
    title: 'Дневник',
    text: 'Исправлен подсчёт среднего балла за четверть.',
  });
  assert.equal(items[2].icon, '🚀');
  assert.equal(items[2].text, 'Ускорена загрузка расписания на слабых телефонах');
  assert.equal(items[3].icon, '✨');
  assert.equal(items[3].text, 'Мелкие исправления интерфейса');
});

test('insertReleaseIntoWhatsNew prepends new release, escapes quotes/newlines, and replaces top same-version release', () => {
  const base = `export const WHATS_NEW: WhatsNewRelease[] = [\n  {\n    version: 'v16.27',\n    date: '13 ноября 2026',\n    items: [\n      { icon: '✨', title: 'Старое', text: 'Описание' },\n    ],\n  },\n];\n`;

  const added = insertReleaseIntoWhatsNew(base, {
    version: 'v16.28',
    date: '14 ноября 2026',
    items: [
      { icon: '🫧', title: "Новый 'Асошик'", text: "Текст с 'кавычками'\nи переносом строки" },
    ],
  });

  assert.match(added, /version: 'v16\.28'/);
  assert.match(added, /Новый \\'Асошик\\'/);
  assert.match(added, /Текст с \\'кавычками\\' и переносом строки/);
  assert.ok(added.indexOf("version: 'v16.28'") < added.indexOf("version: 'v16.27'"));

  const replaced = insertReleaseIntoWhatsNew(added, {
    version: 'v16.28',
    date: '14 ноября 2026',
    items: [
      { icon: '🎨', title: 'Обновлённая запись', text: 'Новое описание без дубля' },
    ],
  });

  const matches = replaced.match(/version: 'v16\.28'/g) || [];
  assert.equal(matches.length, 1);
  assert.match(replaced, /Обновлённая запись/);
  assert.doesNotMatch(replaced, /Новый \\'Асошик\\'/);
});

test('mergePackageJsonSafe merges dependencies without removing existing scripts', () => {
  const current = JSON.stringify({
    name: 'asosh-timer',
    scripts: {
      lint: 'tsc --noEmit',
      test: 'node --test tests/*.mjs',
      'test:stress': 'npx tsx tests/stress.test.mjs',
      build: 'vite build',
    },
    dependencies: {
      react: '^19.0.0',
    },
    devDependencies: {
      typescript: '^5.8.0',
    },
  });

  const incoming = JSON.stringify({
    name: 'zip-export',
    scripts: {
      build: 'vite build',
    },
    dependencies: {
      react: '^19.0.0',
      ws: '^8.18.0',
    },
    devDependencies: {
      '@types/ws': '^8.18.1',
    },
  });

  const { changed, nextJson } = mergePackageJsonSafe(current, incoming);
  assert.equal(changed, true);
  const parsed = JSON.parse(nextJson);
  assert.equal(parsed.dependencies.ws, '^8.18.0');
  assert.equal(parsed.devDependencies['@types/ws'], '^8.18.1');
  assert.equal(parsed.scripts.test, 'node --test tests/*.mjs');
  assert.equal(parsed.scripts['test:stress'], 'npx tsx tests/stress.test.mjs');
});

test('syncPromoSite updates updates.json and HTML marker idempotently without duplicating versions', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'asosh-site-test-'));
  try {
    mkdirSync(path.join(dir, 'docs'), { recursive: true });
    writeFileSync(
      path.join(dir, 'updates.json'),
      JSON.stringify({ latest: 'v16.27', releases: [{ version: 'v16.27', date: '13 ноября 2026', items: [] }] }, null, 2),
      'utf8'
    );
    writeFileSync(
      path.join(dir, 'index.html'),
      `<section>\n<!-- ASOSH_UPDATES_START -->\n<article class="release-card" data-version="v16.27"><header><h3>v16.27</h3></header></article>\n</section>\n`,
      'utf8'
    );

    const release = {
      version: 'v16.28.1',
      date: '14 ноября 2026',
      items: [
        { icon: '🎙️', title: 'Голос & Живой чат', text: 'Подробное описание <script>test</script>' },
      ],
    };

    const first = syncPromoSite(dir, release, { useGit: false });
    assert.equal(first.updated, true);
    assert.deepEqual(first.touched.sort(), ['index.html', 'updates.json']);

    // Повторный прогон той же версии не должен плодить дубли в JSON или HTML
    syncPromoSite(dir, release, { useGit: false });

    const json = JSON.parse(readFileSync(path.join(dir, 'updates.json'), 'utf8'));
    assert.equal(json.latest, 'v16.28.1');
    assert.equal(json.releases.filter((r) => r.version === 'v16.28.1').length, 1);

    const html = readFileSync(path.join(dir, 'index.html'), 'utf8');
    const cardMatches = html.match(/data-version="v16\.28\.1"/g) || [];
    assert.equal(cardMatches.length, 1);
    assert.match(html, /&lt;script&gt;test&lt;\/script&gt;/);
    assert.match(html, /Голос &amp; Живой чат/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('syncPromoSite updates native asosh-timer-site updates/index.html sections, toc, and НОВОЕ badge', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'asosh-site-native-'));
  try {
    mkdirSync(path.join(dir, 'updates'), { recursive: true });
    writeFileSync(
      path.join(dir, 'updates/index.html'),
      [
        '<nav class="nav-links"><a href="#v17-0">Последнее</a></nav>',
        '<nav class="toc" aria-label="Версии"><a href="#v17-0">v17.0</a></nav>',
        '<section class="rel" id="v17-0">',
        '  <div class="rel-head"><h2>v17.0</h2><span class="date">15 ноября 2026</span><span class="badge">НОВОЕ</span></div>',
        '  <div class="feature"><h3>🔔 Больше уведомлений</h3><p>Старое описание</p></div>',
        '</section>',
      ].join('\n'),
      'utf8'
    );

    const release = {
      version: 'v17.1',
      date: '16 ноября 2026',
      items: [
        { icon: '🎙️', title: 'Живой голос', text: 'Обновление Асошика' },
      ],
    };

    const res1 = syncPromoSite(dir, release, { useGit: false });
    assert.equal(res1.updated, true);
    assert.deepEqual(res1.touched, ['updates/index.html']);

    // Повторный вызов не должен дублировать v17.1
    syncPromoSite(dir, release, { useGit: false });

    const out = readFileSync(path.join(dir, 'updates/index.html'), 'utf8');
    assert.match(out, /<a href="#v17-1">Последнее<\/a>/);
    assert.match(out, /<nav class="toc"[^>]*><a href="#v17-1">v17\.1<\/a><a href="#v17-0">v17\.0<\/a>/);
    assert.equal((out.match(/id="v17-1"/g) || []).length, 1);
    assert.equal((out.match(/<span class="badge">НОВОЕ<\/span>/g) || []).length, 1);
    assert.ok(out.indexOf('id="v17-1"') < out.indexOf('id="v17-0"'));
    assert.match(out, /<h3>🎙️ Живой голос<\/h3>/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

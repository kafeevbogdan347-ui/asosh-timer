// Ежедневная проверка безопасности: три ИИ-агента (Gemini) и npm audit.
// Запускается из .github/workflows/security.yml. Отчёт пишется в базу (asosh_security),
// читать его могут только администраторы — в дев-панели, вкладка «🛡 ИИ-охрана».
// Репозиторий публичный, поэтому в лог сборки находки НЕ печатаем — только их количество.
//
// Env: GEMINI_API_KEY, FIREBASE_SERVICE_ACCOUNT (JSON), DB_URL (необязательно), AUDIT_JSON (путь),
//      DRY=1 — ничего не отправлять, отчёт положить в security-report.json (для проверки на компьютере),
//      FAKE_AI=<файл> — вместо Gemini взять готовые ответы агентов из файла (для проверки без ключа).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';

const DRY = process.env.DRY === '1';
const DB_URL = (process.env.DB_URL || 'https://asosh-timer-default-rtdb.europe-west1.firebasedatabase.app').replace(/\/$/, '');
const MODELS = ['gemini-4-hydrogen', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'];
const SEVERITIES = ['critical', 'high', 'medium', 'low'];

const read = (p) => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '');
const list = (dir, re) => (fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => re.test(f)).map((f) => path.join(dir, f)) : []);

// Что смотрит каждый агент
const AGENTS = [
  {
    id: 'rules',
    name: 'Сторож базы',
    task:
      'Ты проверяешь правила Firebase Realtime Database и код, который пишет в базу. Ищи: кто может читать чужие данные (личные сообщения, оценки, коды, профили), ' +
      'кто может записать то, что не должен (выдать себе права учителя или администратора, изменить чужой рейтинг или оценки, засорить базу), ' +
      'отсутствие проверок длины и типа данных, обход ограничений частоты.',
    files: ['database.rules.json', ...list('src/services', /\.ts$/)],
  },
  {
    id: 'code',
    name: 'Ревизор кода',
    task:
      'Ты проверяешь сервер, клиентский код и сборку. Ищи: секреты и ключи, которые попадают в публичный код сайта или APK, XSS (вставка HTML из чужих данных), ' +
      'небезопасные ссылки и переходы, отсутствие проверок на сервере, утечки личных данных в логи, опасные шаги в GitHub Actions.',
    files: [
      'server.ts',
      'vite.config.ts',
      'index.html',
      'public/sw.js',
      'capacitor.config.ts',
      ...list('src/utils', /\.ts$/),
      ...list('.github/workflows', /\.ya?ml$/),
    ],
  },
  {
    id: 'fresh',
    name: 'Свежие изменения',
    task:
      'Ты проверяешь только изменения в коде за последние сутки (git diff). Ищи, не появилось ли в них новых уязвимостей: ослабленные правила базы, ' +
      'новые места, где чужие данные вставляются как HTML, ключи в коде, выключенные проверки.',
    diff: true,
  },
];

const MAX_CHARS = 400_000; // ~100 тыс. токенов на агента

function gatherFiles(files) {
  let total = 0;
  const parts = [];
  for (const f of files) {
    const text = read(f);
    if (!text) continue;
    if (total + text.length > MAX_CHARS) break;
    total += text.length;
    parts.push({ file: f, text });
  }
  return parts;
}

function freshDiff() {
  try {
    const out = execSync('git log --since="26 hours ago" -p --no-color --format="commit %h %s" -- . ":(exclude)package-lock.json" ":(exclude)src/i18n/auto"', {
      encoding: 'utf8',
      maxBuffer: 50 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return out.slice(0, MAX_CHARS);
  } catch {
    return '';
  }
}

const RESPONSE_RULES =
  'Отвечай строго JSON без пояснений вокруг: {"summary": "1-2 предложения по-русски", "findings": [{"severity": "critical|high|medium|low", ' +
  '"title": "коротко по-русски", "file": "путь к файлу", "quote": "точная строка из этого файла, дословно, 1 строка", ' +
  '"why": "чем опасно, простыми словами", "fix": "как исправить, 1-2 предложения"}]}. ' +
  'Пиши только то, что видно в присланном коде; если не уверен — не пиши. Не больше 10 находок, сначала самые опасные. ' +
  'Если ничего опасного нет — пустой список findings. Пиши для школьника-разработчика, без жаргона.';

function promptFor(agent, parts, diff) {
  const body = agent.diff
    ? `Изменения за сутки:\n\`\`\`diff\n${diff}\n\`\`\``
    : parts.map((p) => `===== ФАЙЛ: ${p.file} =====\n${p.text}`).join('\n\n');
  return (
    'Ты — агент безопасности школьного приложения «АСОШ Таймер» (React + Firebase Realtime Database, сайт на GitHub Pages и APK). ' +
    'Пользователи — школьники, учителя и родители. ' +
    agent.task +
    '\n\n' +
    RESPONSE_RULES +
    '\n\n' +
    body
  );
}

async function askGemini(prompt) {
  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  let lastErr = '';
  for (const model of MODELS) {
    try {
      const res = await ai.models.generateContent({
        model,
        contents: prompt,
        config: { responseMimeType: 'application/json', temperature: 0.2 },
      });
      return { model, text: res.text || '' };
    } catch (e) {
      lastErr = String(e?.message || e).slice(0, 120);
    }
  }
  throw new Error(`Gemini не ответил: ${lastErr}`);
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {
        // ниже вернём пустой ответ
      }
    }
  }
  return null;
}

const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const clip = (s, n) => String(s || '').slice(0, n);

// Проверка находок: цитата должна дословно быть в указанном файле (или в diff).
// Так отсеиваются находки, которые ИИ придумал.
function verify(findings, parts, diff) {
  const byFile = new Map(parts.map((p) => [p.file, norm(p.text)]));
  const everything = norm(parts.map((p) => p.text).join('\n') + '\n' + diff);
  const kept = [];
  let dropped = 0;
  for (const f of Array.isArray(findings) ? findings : []) {
    const quote = norm(f?.quote);
    const sev = SEVERITIES.includes(f?.severity) ? f.severity : 'low';
    const inFile = byFile.get(String(f?.file || '').replace(/^\.\//, ''));
    const ok = quote.length >= 8 && (inFile ? inFile.includes(quote) : everything.includes(quote));
    if (!ok) {
      dropped++;
      continue;
    }
    kept.push({
      severity: sev,
      title: clip(f.title, 160),
      file: clip(f.file, 120),
      quote: clip(f.quote, 300),
      why: clip(f.why, 600),
      fix: clip(f.fix, 600),
    });
  }
  kept.sort((a, b) => SEVERITIES.indexOf(a.severity) - SEVERITIES.indexOf(b.severity));
  return { kept: kept.slice(0, 10), dropped };
}

function auditSummary() {
  const p = process.env.AUDIT_JSON;
  const raw = p ? read(p) : '';
  const v = parseJson(raw || '{}')?.metadata?.vulnerabilities;
  if (!v) return null;
  const vulns = parseJson(raw)?.vulnerabilities || {};
  const top = Object.values(vulns)
    .filter((x) => x && ['critical', 'high'].includes(x.severity))
    .slice(0, 10)
    .map((x) => ({ name: clip(x.name, 80), severity: x.severity, fix: x.fixAvailable ? 'есть обновление' : 'обновления пока нет' }));
  return { critical: v.critical || 0, high: v.high || 0, moderate: v.moderate || 0, low: v.low || 0, top };
}

// Вход в базу от имени сервисного аккаунта (тот же секрет, что публикует правила)
async function serviceToken() {
  const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  const now = Math.floor(Date.now() / 1000);
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const data = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })}`;
  const sig = crypto.createSign('RSA-SHA256').update(data).sign(sa.private_key).toString('base64url');
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${data}.${sig}` }),
  });
  const j = await res.json();
  if (!j.access_token) throw new Error(`Не получилось войти в базу: ${res.status}`);
  return j.access_token;
}

async function main() {
  const fake = process.env.FAKE_AI ? JSON.parse(read(process.env.FAKE_AI)) : null;
  if (!fake && !process.env.GEMINI_API_KEY) throw new Error('Нет секрета GEMINI_API_KEY');
  const diff = freshDiff();
  const report = { t: Date.now(), commit: (process.env.GITHUB_SHA || '').slice(0, 7), agents: [], audit: auditSummary() };

  for (const agent of AGENTS) {
    const parts = agent.diff ? [] : gatherFiles(agent.files);
    if (agent.diff && !diff.trim()) {
      report.agents.push({ id: agent.id, name: agent.name, summary: 'За сутки изменений в коде не было.', findings: [], dropped: 0 });
      console.log(`${agent.name}: изменений нет`);
      continue;
    }
    try {
      const { model, text } = fake ? { model: 'fake', text: JSON.stringify(fake[agent.id] || {}) } : await askGemini(promptFor(agent, parts, diff));
      const ans = parseJson(text) || {};
      const { kept, dropped } = verify(ans.findings, parts, agent.diff ? diff : '');
      report.agents.push({ id: agent.id, name: agent.name, model, summary: clip(ans.summary, 400), findings: kept, dropped });
      console.log(`${agent.name}: находок ${kept.length}, отсеяно непроверенных ${dropped} (${model})`);
    } catch (e) {
      report.agents.push({ id: agent.id, name: agent.name, summary: 'Агент не смог выполнить проверку.', error: clip(e?.message || e, 160), findings: [], dropped: 0 });
      console.log(`${agent.name}: ошибка`);
    }
  }

  const count = (sev) => report.agents.reduce((n, a) => n + a.findings.filter((f) => f.severity === sev).length, 0);
  report.totals = Object.fromEntries(SEVERITIES.map((s) => [s, count(s)]));
  const day = new Date(report.t + 5 * 3600 * 1000).toISOString().slice(0, 10); // день по Челябинску

  if (DRY) {
    fs.writeFileSync('security-report.json', JSON.stringify(report, null, 2));
    console.log('DRY: отчёт в security-report.json');
    return;
  }
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) throw new Error('Нет секрета FIREBASE_SERVICE_ACCOUNT');
  const token = await serviceToken();
  const res = await fetch(`${DB_URL}/asosh_security.json`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ latest: report, [`history/${day}`]: { t: report.t, ...report.totals } }),
  });
  if (!res.ok) throw new Error(`База не приняла отчёт: ${res.status}`);
  console.log(`Отчёт за ${day} записан: ${JSON.stringify(report.totals)}`);
}

main().catch((e) => {
  console.error(`::error::${String(e?.message || e).slice(0, 200)}`);
  process.exit(1);
});

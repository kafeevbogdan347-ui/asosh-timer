const fs = require('fs'), path = require('path');
const ts = require('typescript');
// Ищет в src русские фразы, которых нет в словарях src/i18n/auto/*.json.
// Запуск: node scripts/i18n-extract.cjs  → список новых фраз для перевода
const ROOT = path.resolve(__dirname, '../src');
const SKIP = [/i18n\//, /DeveloperModal/, /ApkSupportModal/, /RetroFirstScreen/, /DevPasswordModal/, /StatsPanel/, /presentationContent/, /schoolSchedule/, /services\/assistant/, /cordovaService/, /apkSupport/, /classCodes/, /realName/, /moderation/, /presentationData/, /MaintenanceScreen/];
const files = [];
(function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (/\.tsx?$/.test(p) && !SKIP.some((r) => r.test(p))) files.push(p); } })(ROOT);
const CYR = /[А-Яа-яЁё]/;
const out = new Map(); // key -> files
const core = (s) => s.replace(/\s+/g, ' ').replace(/^[^A-Za-zА-Яа-яЁё0-9{«"(№]+/, '').replace(/[^A-Za-zА-Яа-яЁё0-9}»")%!?.…]+$/, '');
const add = (s, f) => { if (!CYR.test(s)) return; const k = core(s); if (!k || !CYR.test(k)) return; if (!out.has(k)) out.set(k, new Set()); out.get(k).add(path.relative(ROOT, f)); };
for (const f of files) {
  const sf = ts.createSourceFile(f, fs.readFileSync(f, 'utf8'), ts.ScriptTarget.Latest, true, f.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const isConst = f.endsWith('data/constants.ts');
  const lineOf = (n) => sf.getLineAndCharacterOfPosition(n.getStart()).line + 1;
  const skipLine = (l) => isConst && ((l >= 8 && l <= 15) || (l >= 252 && l <= 266) || (l >= 278 && l <= 288) || (l >= 498 && l <= 1040));
  (function visit(n) {
    if (skipLine(lineOf(n))) return;
    if (ts.isCallExpression(n) && /^console\./.test(n.expression.getText())) return;
    if (ts.isJsxText(n)) add(n.text, f);
    else if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) add(n.text, f);
    else if (ts.isTemplateExpression(n)) { let s = n.head.text; for (const sp of n.templateSpans) s += '{}' + sp.literal.text; add(s, f); }
    ts.forEachChild(n, visit);
  })(sf);
}
for (const x of ['Биология','География','ДикР','ИЗО','Индивидуальный проект','Иностранный язык','Информатика','История','Литература','Математика','Музыка','ОБЗР','Обществознание','Предмет','Разговор о важном','Россия — мои горизонты','Русский язык','Технология','Физика','Физкультура','Химия','Акт. зал','Алгебра','Геометрия','Английский язык']) add(x, ROOT + '/data/schoolSchedule.ts');
const dict = JSON.parse(fs.readFileSync(path.join(ROOT, 'i18n/auto/ba.json'), 'utf8'));
const missing = [...out.keys()].filter((k) => !(k in dict)).sort();
console.log(`Фраз в коде: ${out.size}, без перевода: ${missing.length} (часть из них — служебные слова, их переводить не нужно)`);
for (const k of missing) console.log('  ' + k);

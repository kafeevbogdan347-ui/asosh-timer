// Автоперевод интерфейса: русский текст на экране заменяется переводом из словаря.
// Словари лежат в src/i18n/auto/<язык>.json: { "русская фраза": "перевод" }.
// Фразы с подстановками записаны через {}: «Собрано: {} из {}».
// Чего нет в словаре (имена, сообщения чата, домашка) — остаётся как есть.
// Список фраз для перевода собирает scripts/i18n-extract.cjs.

const CYR = /[А-Яа-яЁё]/;
// Значки, пробелы и знаки по краям в словарь не входят: «🎒 Портфель:» ищется как «Портфель»
const LEAD = /^[^A-Za-zА-Яа-яЁё0-9{«"(№]+/;
const TRAIL = /[^A-Za-zА-Яа-яЁё0-9}»")%!?.…]+$/;

const loaders: Record<string, () => Promise<{ default: Record<string, string> }>> = {
  ba: () => import('./auto/ba.json'),
  tj: () => import('./auto/tj.json'),
  kk: () => import('./auto/kk.json'),
  uz: () => import('./auto/uz.json'),
  ky: () => import('./auto/ky.json'),
  be: () => import('./auto/be.json'),
  hy: () => import('./auto/hy.json'),
  az: () => import('./auto/az.json'),
};

interface Pattern {
  re: RegExp;
  out: string;
}

let exact: Map<string, string> | null = null; // null — русский, переводить не нужно
let patterns: Pattern[] = [];
let cache = new Map<string, string | null>();

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function build(dict: Record<string, string>) {
  exact = new Map();
  patterns = [];
  cache = new Map();
  const withVars: [string, string][] = [];
  for (const [ru, tr] of Object.entries(dict)) {
    if (!tr) continue;
    if (ru.includes('{}')) withVars.push([ru, tr]);
    else exact.set(ru, tr);
  }
  // Сначала самые длинные шаблоны: они точнее
  withVars.sort((a, b) => b[0].length - a[0].length);
  patterns = withVars.map(([ru, tr]) => ({
    re: new RegExp('^' + ru.split('{}').map(escapeRe).join('(.+?)') + '$', 's'),
    out: tr,
  }));
}

function lookup(core: string, depth: number): string | null {
  if (!exact) return null;
  const hit = exact.get(core);
  if (hit !== undefined) return hit;
  if (cache.has(core)) return cache.get(core)!;
  let res: string | null = null;
  for (const p of patterns) {
    const m = p.re.exec(core);
    if (!m) continue;
    let i = 1;
    // Подставленные куски тоже переводим, если они есть в словаре («Понедельник», «Математика»)
    res = p.out.replace(/\{\}/g, () => {
      const part = m[i++] ?? '';
      return depth < 2 ? translate(part, depth + 1) : part;
    });
    break;
  }
  if (cache.size > 3000) cache.clear();
  cache.set(core, res);
  return res;
}

function translate(text: string, depth = 0): string {
  if (!exact || !text || !CYR.test(text)) return text;
  const flat = text.replace(/\s+/g, ' ');
  const lead = LEAD.exec(flat)?.[0] ?? '';
  const rest = flat.slice(lead.length);
  const trail = TRAIL.exec(rest)?.[0] ?? '';
  const core = trail ? rest.slice(0, -trail.length) : rest;
  if (!core) return text;
  const tr = lookup(core, depth);
  if (tr === null) return text;
  // Пробелы по краям оставляем как в исходном тексте
  const startWs = /^\s*/.exec(text)![0];
  const endWs = /\s*$/.exec(text)![0];
  return startWs + lead.trimStart() + tr + trail.trimEnd() + endWs;
}

// Перевод строки вне экрана: уведомления, подтверждения
export const tr = (text: string) => translate(text);

// ---------- Подмена текста на странице ----------

const ATTRS = ['placeholder', 'title', 'aria-label'];
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'CODE']);

// Что было по-русски и что мы поставили: нужно, чтобы вернуть русский или сменить язык на лету
const original = new WeakMap<Node, string>();
const shown = new WeakMap<Node, string>();
const attrOriginal = new WeakMap<Element, Record<string, string>>();

function skipped(node: Node | null): boolean {
  for (let el = node instanceof Element ? node : node?.parentElement; el; el = el.parentElement) {
    if (SKIP_TAGS.has(el.tagName) || el.hasAttribute('data-no-tr')) return true;
  }
  return false;
}

function handleText(node: Text) {
  const now = node.nodeValue ?? '';
  // Текст поменял React — значит, это новый русский оригинал
  const ru = shown.get(node) === now ? (original.get(node) ?? now) : now;
  if (!CYR.test(ru) && !original.has(node)) return;
  if (skipped(node)) return;
  const out = translate(ru);
  original.set(node, ru);
  shown.set(node, out);
  if (out !== now) node.nodeValue = out;
}

function handleAttrs(el: Element) {
  for (const a of ATTRS) {
    const now = el.getAttribute(a);
    if (now === null) continue;
    const saved = attrOriginal.get(el) ?? {};
    const ru = saved[`${a}:shown`] === now ? (saved[a] ?? now) : now;
    if (!CYR.test(ru) && saved[a] === undefined) continue;
    const out = translate(ru);
    attrOriginal.set(el, { ...saved, [a]: ru, [`${a}:shown`]: out });
    if (out !== now) el.setAttribute(a, out);
  }
}

function walk(root: Node) {
  if (root.nodeType === Node.TEXT_NODE) {
    handleText(root as Text);
    return;
  }
  if (!(root instanceof Element)) return;
  if (skipped(root)) return;
  handleAttrs(root);
  const it = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  for (let n = it.nextNode(); n; n = it.nextNode()) {
    if (n.nodeType === Node.TEXT_NODE) handleText(n as Text);
    else handleAttrs(n as Element);
  }
}

let observer: MutationObserver | null = null;

function startObserver() {
  if (observer || typeof MutationObserver === 'undefined') return;
  observer = new MutationObserver((list) => {
    for (const m of list) {
      if (m.type === 'characterData') handleText(m.target as Text);
      else if (m.type === 'attributes') handleAttrs(m.target as Element);
      else m.addedNodes.forEach(walk);
    }
  });
  observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
}

// Подтверждения и сообщения браузера тоже переводим
let dialogsPatched = false;
function patchDialogs() {
  if (dialogsPatched) return;
  dialogsPatched = true;
  const { confirm, alert, prompt } = window;
  window.confirm = (msg?: string) => confirm.call(window, translateLines(msg));
  window.alert = (msg?: string) => alert.call(window, translateLines(msg));
  window.prompt = (msg?: string, def?: string) => prompt.call(window, translateLines(msg), def);
}
const translateLines = (msg?: string) => (msg ?? '').split('\n').map((l) => translate(l)).join('\n');

// Даты («вторник, 10 ноября») экраны пишут по-русски — подставляем язык интерфейса.
// Башкирского нет в браузерах, для него остаётся русский формат.
const DATE_LOCALE: Record<string, string> = { tj: 'tg', kk: 'kk', uz: 'uz-Latn', ky: 'ky', be: 'be', hy: 'hy', az: 'az-Latn' };
let dateLocale: string | null = null;
let datesPatched = false;
function patchDates() {
  if (datesPatched) return;
  datesPatched = true;
  const fix = (loc?: Intl.LocalesArgument) => (dateLocale && (loc === undefined || (typeof loc === 'string' && loc.startsWith('ru'))) ? dateLocale : loc);
  const proto = Date.prototype;
  const { toLocaleDateString, toLocaleString, toLocaleTimeString } = proto;
  proto.toLocaleDateString = function (loc?: Intl.LocalesArgument, opt?: Intl.DateTimeFormatOptions) {
    return toLocaleDateString.call(this, fix(loc), opt);
  };
  proto.toLocaleString = function (loc?: Intl.LocalesArgument, opt?: Intl.DateTimeFormatOptions) {
    return toLocaleString.call(this, fix(loc), opt);
  };
  proto.toLocaleTimeString = function (loc?: Intl.LocalesArgument, opt?: Intl.DateTimeFormatOptions) {
    return toLocaleTimeString.call(this, fix(loc), opt);
  };
}

let wanted = 'ru';

export async function setAutoLanguage(lang: string): Promise<void> {
  wanted = lang;
  if (lang === 'ru' || !loaders[lang]) {
    exact = null;
    patterns = [];
    cache = new Map();
  } else {
    try {
      const dict = (await loaders[lang]()).default;
      if (wanted !== lang) return; // пока грузили, язык сменили ещё раз
      build(dict);
    } catch {
      return; // словарь не загрузился (нет сети) — остаётся прежний язык
    }
  }
  dateLocale = DATE_LOCALE[lang] || null;
  patchDates();
  document.documentElement.lang = lang;
  patchDialogs();
  startObserver();
  walk(document.body);
}

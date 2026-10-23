// Единственный источник текста презентации и постов для чатов.
// Из него собираются: слайды presentation.html, текст presentation.md / PRESENTATION.md
// и готовые посты в панели разработчика. Меняйте текст только здесь.
// Файл без зависимостей от браузера: его импортирует и vite.config.ts.

export const APP_URL = 'https://kafeevbogdan347-ui.github.io/asosh-timer/';
export const SITE_URL = 'https://kafeevbogdan347-ui.github.io/asosh-timer-site/';

export interface SlideItem {
  icon: string;
  title: string;
  desc: string;
}

export interface Slide {
  tag: string;
  title: string;
  lead: string;
  items: SlideItem[];
  speech: string;
}

export const SLIDES: Slide[] = [
  {
    tag: 'Знакомство',
    title: 'АСОШ Таймер — вся школа в телефоне',
    lead: 'Бесплатный помощник для учеников Аргаяшской СОШ №2: расписание, звонки, домашка и чат класса в одном месте.',
    items: [
      { icon: '⏱', title: 'Сколько до звонка', desc: 'Таймер урока и перемены для обеих смен.' },
      { icon: '📅', title: 'Уроки на день и неделю', desc: 'Расписание всех классов с 5-го по 11-й.' },
      { icon: '📘', title: 'Домашка и оценки', desc: 'Записи ДЗ, средний балл, прогресс четверти.' },
      { icon: '💬', title: 'Чат своего класса', desc: 'Закрытый, вход по коду от классного руководителя.' },
    ],
    speech:
      'Здравствуйте! Меня зовут [имя], я учусь в [класс]. Мы сделали приложение «АСОШ Таймер» — помощника для учеников нашей школы. ' +
      'В нём собрано то, что каждый день нужно школьнику: расписание, звонки, домашние задания и чат класса.',
  },
  {
    tag: 'Проблема',
    title: 'Что мешает каждый день',
    lead: 'Простые вопросы отнимают время на каждой перемене:',
    items: [
      { icon: '❓', title: '«Какой следующий урок?»', desc: 'Расписание теряется в чатах и фотографиях.' },
      { icon: '⏰', title: '«Сколько до звонка?»', desc: 'Особенно когда меняются смены и бывают сокращённые уроки.' },
      { icon: '📝', title: '«Что задали?»', desc: 'Домашка записана где попало или не записана вовсе.' },
      { icon: '🎒', title: '«Что взять завтра?»', desc: 'Лишние учебники в рюкзаке или забытая форма.' },
    ],
    speech:
      'Каждый из нас хоть раз спрашивал в чате, какой следующий урок или что задали. Мы решили собрать ответы на эти вопросы в одном приложении.',
  },
  {
    tag: 'Решение',
    title: 'Одно приложение вместо десятка чатов',
    lead: 'Открывается по ссылке в браузере — ничего не нужно скачивать из магазина.',
    items: [
      { icon: '🆓', title: 'Бесплатно и без рекламы', desc: 'Никаких подписок и платных функций.' },
      { icon: '📱', title: 'Android, iPhone, компьютер', desc: 'Можно добавить на главный экран, как обычное приложение.' },
      { icon: '📶', title: 'Работает без интернета', desc: 'Расписание, таймер и игры открываются и при плохой связи.' },
      { icon: '⚡', title: 'Старт за минуту', desc: 'Только имя и код класса — без паролей и почты.' },
    ],
    speech:
      'Приложение работает прямо в браузере, его можно добавить на главный экран телефона. Регистрация — только имя и код класса.',
  },
  {
    tag: 'Каждый день',
    title: 'Звонки и расписание',
    lead: 'То, чем пользуются чаще всего:',
    items: [
      { icon: '⏱', title: 'Таймер урока', desc: 'Сколько осталось до конца урока или перемены, какой урок следующий.' },
      { icon: '🔔', title: 'Напоминания', desc: 'Сигнал за 5 минут до урока и за 2 минуты до звонка.' },
      { icon: '📅', title: 'Сегодня, завтра, неделя', desc: 'Для 1-й и 2-й смены и сокращённых дней.' },
      { icon: '✏️', title: 'Своё расписание', desc: 'Если урок заменили — можно поправить у себя.' },
    ],
    speech:
      'На главном экране сразу видно, сколько осталось до звонка. За пять минут до урока приложение напомнит, какой урок следующий.',
  },
  {
    tag: 'Учёба',
    title: 'Домашка, оценки и подготовка',
    lead: 'Инструменты, которые помогают учиться:',
    items: [
      { icon: '📘', title: 'Домашние задания', desc: 'Записывай ДЗ по предметам, прикрепляй фото доски, отмечай сделанное.' },
      { icon: '🎯', title: 'Средний балл', desc: 'Считает оценку за четверть и сколько пятёрок нужно до цели.' },
      { icon: '📊', title: 'Четверть', desc: 'Сколько пройдено и сколько дней до каникул.' },
      { icon: '📐', title: 'Формулы и портфель', desc: 'Шпаргалки по предметам и список вещей на завтра.' },
    ],
    speech:
      'Можно записывать домашку с фотографией доски, считать средний балл и смотреть, сколько осталось до каникул. Вечером приложение подскажет, что положить в портфель.',
  },
  {
    tag: 'Класс и отдых',
    title: 'Общение и перемены',
    lead: 'Немного для класса и для отдыха:',
    items: [
      { icon: '💬', title: 'Чат класса', desc: 'Попасть в него можно только с кодом своего класса.' },
      { icon: '🏅', title: 'Портфолио', desc: 'Грамоты, олимпиады и ГТО в одном месте.' },
      { icon: '🎮', title: 'Игры на перемену', desc: 'Мини-игры без интернета. Во время урока они сами закрываются.' },
      { icon: '🍅', title: 'Помодоро и фокус', desc: 'Таймер и фоновые звуки, чтобы делать уроки без отвлечений.' },
    ],
    speech:
      'Для отдыха есть мини-игры, но во время урока они автоматически закрываются — приложение не отвлекает от занятий.',
  },
  {
    tag: 'Безопасность',
    title: 'Данные под защитой',
    lead: 'Мы старались собирать как можно меньше данных:',
    items: [
      { icon: '📱', title: 'Всё хранится на телефоне', desc: 'Расписание, оценки и ДЗ не уходят в интернет.' },
      { icon: '🔑', title: 'Чат только по коду', desc: 'Коды классов выдают классные руководители.' },
      { icon: '🔒', title: 'PIN-код', desc: 'Можно поставить пароль на вход в приложение.' },
      { icon: '💾', title: 'Резервная копия', desc: 'Перенос данных на новый телефон одним файлом.' },
    ],
    speech:
      'Приложение не просит ни почту, ни телефон. Всё, кроме сообщений чата, хранится только на устройстве ученика.',
  },
  {
    tag: 'Для школы',
    title: 'Польза для всех',
    lead: 'Чем приложение помогает ученикам, родителям и учителям:',
    items: [
      { icon: '🎓', title: 'Ученикам', desc: 'Знают расписание, не опаздывают, не забывают ДЗ и учебники.' },
      { icon: '👨‍👩‍👧', title: 'Родителям', desc: 'Видят расписание ребёнка и когда заканчивается смена.' },
      { icon: '👩‍🏫', title: 'Классным руководителям', desc: 'Выдают классу код — и у класса есть закрытый чат.' },
      { icon: '🏫', title: 'Школе', desc: 'Меньше опозданий и вопросов «какой сейчас урок?».' },
    ],
    speech:
      'Классным руководителям нужно только передать ученикам код класса. Мы с радостью выдадим коды и поможем настроить приложение.',
  },
  {
    tag: 'Как начать',
    title: 'Попробуйте прямо сейчас',
    lead: APP_URL,
    items: [
      { icon: '1️⃣', title: 'Открой ссылку', desc: 'В браузере телефона или компьютера.' },
      { icon: '2️⃣', title: 'Добавь на экран', desc: 'Меню браузера → «Добавить на главный экран».' },
      { icon: '3️⃣', title: 'Введи имя и код', desc: 'Код класса — у классного руководителя.' },
      { icon: '🌐', title: 'Сайт с инструкцией', desc: SITE_URL },
    ],
    speech: 'Спасибо за внимание! Ссылка на экране. Будем рады вопросам и предложениям.',
  },
];

export interface ChatPost {
  id: string;
  title: string;
  text: string;
}

export const CHAT_POSTS: ChatPost[] = [
  {
    id: 'classmates',
    title: 'Для чата одноклассников',
    text: `Всем привет! 👋

Мы сделали для нашей школы бесплатное приложение «АСОШ Таймер» 🔔

⏱ сколько осталось до звонка
📅 уроки на сегодня и завтра
📘 домашка и средний балл
💬 закрытый чат нашего класса
🎮 мини-игры на перемену

Работает прямо в браузере, без рекламы. Можно добавить на главный экран телефона.
Для входа нужен код класса — спросите у классного руководителя.

👉 ${APP_URL}`,
  },
  {
    id: 'parents',
    title: 'Для родительского чата',
    text: `Уважаемые родители! 👋

Ученики Аргаяшской СОШ №2 сделали бесплатное приложение «АСОШ Таймер» — помощника для школьников:

✅ расписание уроков и звонков для 1-й и 2-й смены
✅ сколько осталось до конца урока
✅ записи домашних заданий и расчёт среднего балла
✅ список учебников и формы на завтра

Приложение без рекламы, не требует регистрации и почты. Расписание, оценки и ДЗ хранятся только на телефоне ребёнка.

Ссылка: ${APP_URL}
Инструкция по установке: ${SITE_URL}`,
  },
  {
    id: 'teachers',
    title: 'Для классных руководителей',
    text: `Здравствуйте!

Мы, ученики школы, сделали приложение «АСОШ Таймер»: расписание, звонки, домашние задания и закрытый чат класса.

Чтобы ученики вашего класса попали в свой чат, им нужен код класса. Мы можем передать вам код вашего класса — напишите нам, пожалуйста.

Приложение: ${APP_URL}
Описание и установка: ${SITE_URL}`,
  },
  {
    id: 'short',
    title: 'Коротко для статуса или сторис',
    text: `🔔 АСОШ Таймер — вся школа в телефоне: звонки, уроки, домашка и чат класса.
Бесплатно и без рекламы 👉 ${APP_URL}`,
  },
];

// ---------- Сборка Markdown ----------

export function buildPresentationMarkdown(): string {
  const lines: string[] = [];
  lines.push('# Презентация «АСОШ Таймер»');
  lines.push('');
  lines.push('Умный дневник для учеников Аргаяшской СОШ №2.');
  lines.push('');
  lines.push(`- Приложение: ${APP_URL}`);
  lines.push(`- Сайт с инструкцией: ${SITE_URL}`);
  lines.push(`- Слайды для показа на проекторе: ${APP_URL}presentation.html`);
  lines.push('');
  lines.push('> Текст презентации хранится в `src/data/presentationContent.ts`. После правки обновите этот файл командой `npm run presentation:md`. Слайды на сайте обновляются сами при каждой публикации.');
  lines.push('');
  lines.push('## Слайды и речь');
  SLIDES.forEach((slide, i) => {
    lines.push('');
    lines.push(`### Слайд ${i + 1}. ${slide.tag}: ${slide.title}`);
    lines.push('');
    lines.push(slide.lead);
    lines.push('');
    slide.items.forEach((item) => lines.push(`- ${item.icon} **${item.title}** — ${item.desc}`));
    lines.push('');
    lines.push(`🎙️ *Речь:* ${slide.speech}`);
  });
  lines.push('');
  lines.push('## Тексты для чатов');
  CHAT_POSTS.forEach((post) => {
    lines.push('');
    lines.push(`### ${post.title}`);
    lines.push('');
    lines.push('```text');
    lines.push(post.text);
    lines.push('```');
  });
  lines.push('');
  return lines.join('\n');
}

// ---------- Сборка слайдов (самостоятельный HTML) ----------

export function buildPresentationHtml(): string {
  const data = JSON.stringify(SLIDES).replace(/</g, '\\u003c');
  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>АСОШ Таймер — презентация</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  :root { --bg: #060d1f; --card: #0f1d3d; --line: rgba(148, 180, 255, 0.16); --text: #eef3ff; --muted: #9fb0d4; --accent: #22d3ee; --amber: #fbbf24; }
  html, body { height: 100%; }
  body { background: radial-gradient(900px 600px at 85% 10%, rgba(34, 211, 238, 0.12), transparent 70%), var(--bg); color: var(--text);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; display: flex; flex-direction: column; overflow: hidden; }
  header, footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 24px; }
  .brand { font-weight: 900; font-size: 17px; color: var(--accent); }
  .hint { font-size: 12px; color: var(--muted); }
  main { flex: 1; display: flex; align-items: center; justify-content: center; padding: 8px 24px; min-height: 0; }
  .slide { width: 100%; max-width: 1040px; animation: in 0.25s ease; }
  @keyframes in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
  .tag { color: var(--amber); font-weight: 900; font-size: 14px; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 10px; }
  h1 { font-size: clamp(28px, 4.4vw, 52px); line-height: 1.12; font-weight: 900; margin-bottom: 14px; }
  .lead { font-size: clamp(16px, 1.8vw, 22px); color: var(--muted); margin-bottom: 28px; line-height: 1.45; word-break: break-word; }
  .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
  .item { display: flex; gap: 14px; align-items: flex-start; padding: 18px 20px; background: var(--card); border: 1px solid var(--line); border-radius: 18px; }
  .icon { font-size: 30px; line-height: 1; }
  .item b { display: block; font-size: clamp(15px, 1.5vw, 19px); margin-bottom: 4px; }
  .item span { color: var(--muted); font-size: clamp(13px, 1.25vw, 16px); line-height: 1.4; word-break: break-word; }
  .notes { display: none; margin-top: 20px; padding: 14px 18px; border-left: 4px solid var(--accent); background: rgba(34, 211, 238, 0.1); border-radius: 10px; color: #bae6fd; font-size: 15px; line-height: 1.5; }
  body.show-notes .notes { display: block; }
  .btn { border: 1px solid var(--line); background: rgba(255, 255, 255, 0.06); color: var(--text); padding: 10px 18px; border-radius: 12px; font-weight: 800; font-size: 14px; cursor: pointer; }
  .btn:hover { background: rgba(255, 255, 255, 0.12); }
  .btn.primary { background: var(--accent); color: #04101f; border-color: transparent; }
  .center { display: flex; align-items: center; gap: 14px; }
  .dots { display: flex; gap: 6px; }
  .dot { width: 9px; height: 9px; border-radius: 9px; background: rgba(255, 255, 255, 0.25); cursor: pointer; border: 0; }
  .dot.active { width: 28px; background: var(--accent); }
  .tools { display: flex; gap: 8px; }
  @media (max-width: 700px) {
    .grid { grid-template-columns: 1fr; }
    .hint, .dots { display: none; }
    header, footer { padding: 10px 14px; }
    main { padding: 8px 14px; overflow-y: auto; align-items: flex-start; }
  }
</style>
</head>
<body>
<header>
  <div class="brand">🔔 АСОШ Таймер</div>
  <div class="tools">
    <span class="hint">← → — листать · N — речь · F — весь экран</span>
    <button class="btn" id="notesBtn" type="button">Речь</button>
    <button class="btn" id="fullBtn" type="button">⛶</button>
  </div>
</header>
<main><div class="slide" id="slide"></div></main>
<footer>
  <button class="btn" id="prev" type="button">← Назад</button>
  <div class="center"><div class="dots" id="dots"></div><span class="hint" id="counter"></span></div>
  <button class="btn primary" id="next" type="button">Вперёд →</button>
</footer>
<script>
  const slides = ${data};
  let current = 0;
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text) n.textContent = text; return n; };

  function render() {
    const s = slides[current];
    const root = document.getElementById('slide');
    root.replaceChildren();
    root.style.animation = 'none'; root.offsetHeight; root.style.animation = '';
    root.append(el('div', 'tag', 'Слайд ' + (current + 1) + ' · ' + s.tag), el('h1', '', s.title), el('p', 'lead', s.lead));
    const grid = el('div', 'grid');
    s.items.forEach((it) => {
      const item = el('div', 'item');
      const body = el('div');
      body.append(el('b', '', it.title), el('span', '', it.desc));
      item.append(el('div', 'icon', it.icon), body);
      grid.append(item);
    });
    root.append(grid, el('div', 'notes', '🎙️ ' + s.speech));
    document.getElementById('counter').textContent = (current + 1) + ' / ' + slides.length;
    const dots = document.getElementById('dots');
    dots.replaceChildren(...slides.map((_, i) => { const d = el('button', 'dot' + (i === current ? ' active' : '')); d.type = 'button'; d.setAttribute('aria-label', 'Слайд ' + (i + 1)); d.onclick = () => go(i); return d; }));
  }
  function go(i) { current = Math.max(0, Math.min(slides.length - 1, i)); render(); }
  function toggleNotes() { document.body.classList.toggle('show-notes'); }
  function toggleFull() { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.(); }

  document.getElementById('prev').onclick = () => go(current - 1);
  document.getElementById('next').onclick = () => go(current + 1);
  document.getElementById('notesBtn').onclick = toggleNotes;
  document.getElementById('fullBtn').onclick = toggleFull;
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') { e.preventDefault(); go(current + 1); }
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); go(current - 1); }
    if (e.key === 'n' || e.key === 'N' || e.key === 'т' || e.key === 'Т') toggleNotes();
    if (e.key === 'f' || e.key === 'F' || e.key === 'а' || e.key === 'А') toggleFull();
  });
  let touchX = null;
  window.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  window.addEventListener('touchend', (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) go(current + (dx < 0 ? 1 : -1));
    touchX = null;
  });
  render();
</script>
</body>
</html>
`;
}

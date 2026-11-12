# АСОШ №2 — Умный дневник

Электронный помощник для учеников МОУ АСОШ №2 (с. Аргаяш): расписание уроков и звонков, таймер до конца урока, домашние задания, чат класса, помодоро-таймер, мини-игры и другое.

Стек: React 19, Vite, Tailwind CSS, Firebase Realtime Database (чат). Сервер не нужен: приложение целиком работает в браузере и публикуется на GitHub Pages.

Приложение: https://kafeevbogdan347-ui.github.io/asosh-timer/

## Запуск на компьютере

Нужен Node.js 20 или новее.

```bash
npm install
cp .env.example .env   # заполните значения в .env
npm run dev            # http://localhost:3000
```

## Приложение для Windows, macOS и Linux

Папка `desktop/` — оболочка на Electron: то же приложение в отдельном окне, работает офлайн. Установщики собирает `.github/workflows/desktop.yml` при каждом коммите в `main` и кладёт в релиз `desktop-latest`:

- Windows: `asosh-timer-win-x64.exe`
- macOS: `asosh-timer-mac-arm64.dmg` (M1 и новее), `asosh-timer-mac-x64.dmg` (Intel)
- Linux: `asosh-timer-linux-x86_64.AppImage`, `asosh-timer-linux-amd64.deb`

Установщики не подписаны: Windows покажет «Защитник SmartScreen» (Подробнее → Выполнить в любом случае), а на macOS открывать через правый клик → «Открыть».

Локальный запуск: `npm run build && cd desktop && npm install && npm start`.

## Настройки (.env)

| Переменная | Зачем |
|---|---|
| `CLASS_CODES` | коды классов: `5А:код,5Б:код,...` |
| `DEV_PASSWORD` | пароль панели разработчика |
| `VITE_FIREBASE_*` | настройки Firebase для чата класса |

Коды классов и пароль разработчика при сборке превращаются в SHA-256-отпечатки: открытым текстом их нет ни в репозитории, ни в собранном приложении. Короткие коды всё равно можно подобрать перебором, поэтому делайте их длинными и случайными (например, `7А-K4P9XM`).

## Чат (Firebase)

Чат хранится в Firebase Realtime Database. Приложение входит в Firebase анонимно (без логина и пароля), а правила базы пускают в чат только вошедших.

Настройка в консоли Firebase (один раз):

1. **Authentication → Sign-in method → Anonymous → Enable.**
2. **Realtime Database → Rules:** вставьте содержимое `database.rules.json` и нажмите **Publish**.

Правила разрешают читать чат и добавлять сообщения до 400 символов. Менять и удалять чужие сообщения нельзя.

## Презентация

Слайды с речью: https://kafeevbogdan347-ui.github.io/asosh-timer/presentation.html (стрелки — листать, N — показать речь, F — во весь экран). Текст слайдов и готовые посты для чатов — в [PRESENTATION.md](PRESENTATION.md).

Всё это собирается из одного файла `src/data/presentationContent.ts`. После правки текста выполните `npm run presentation:md`, чтобы обновить `PRESENTATION.md`; слайды на сайте обновятся сами при публикации.

## Публикация

Сборка и публикация на GitHub Pages идут автоматически при каждом коммите в `main` (`.github/workflows/deploy.yml`).

Настройки берутся из секрета репозитория `APP_ENV`: **Settings → Secrets and variables → Actions → APP_ENV**. В него кладётся всё содержимое `.env`.

### Новые коды классов на учебный год

1. Откройте секрет `APP_ENV` и замените строку `CLASS_CODES=...` новыми кодами.
2. Запустите сборку заново: **Actions → Deploy to GitHub Pages → Run workflow**.

Старые коды перестанут работать сразу после публикации. Ученики, которые уже вошли в свой класс, останутся в нём.


## Аккаунты, журнал и родители (v16)

Логин и пароль — через Firebase Authentication (служебная почта `логин@asosh-timer.app`, настоящая почта не нужна).
Роли: ученик (код класса), учитель (одноразовый код учителя), родитель (код ребёнка из «Дневника»).

Включить один раз:
1. Firebase Console → **Authentication → Sign-in method → Email/Password → Enable**.
2. Опубликовать `database.rules.json` в **Realtime Database → Rules**.

Где что лежит в базе — в начале `src/services/accounts.ts` и `src/services/journal.ts`.
Проверка правил: `npm i -D firebase-tools @firebase/rules-unit-testing` (один раз), затем
`npx firebase emulators:exec --only database --project demo-asosh "node tests/accounts.rules.test.mjs"` (нужна Java).
Приложение против локальных эмуляторов: `VITE_FIREBASE_EMULATOR=1`.

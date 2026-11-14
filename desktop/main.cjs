// Оболочка для компьютера: открывает собранное приложение в окне.
// Приложение работает офлайн из встроенной папки dist, а при наличии интернета
// умеет подтягивать свежую веб-сборку с GitHub Pages в локальный кэш без переустановки .exe.
const { app, BrowserWindow, protocol, net, shell, session } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

// Берём собранный сайт: из resources при установке, из ../dist при `npm start`
const DIST = app.isPackaged
  ? path.join(process.resourcesPath, 'app-dist')
  : path.join(__dirname, '..', 'dist');

const REMOTE_BASE = 'https://kafeevbogdan347-ui.github.io/asosh-timer';

// Своя схема app://, чтобы пути вида /assets/... работали, как на сайте
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, allowServiceWorkers: true } },
]);

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 800,
    minWidth: 380,
    minHeight: 600,
    backgroundColor: '#060d1f',
    title: 'АСОШ Таймер',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  // Открываем сразу на весь экран (развёрнутым окном): F11 / Ctrl+Cmd+F — полноэкранный режим
  win.maximize();

  // На больших мониторах всё крупнее, как Ctrl+«+» в браузере: масштаб под размер окна
  const fitZoom = () => {
    const [w, h] = win.getContentSize();
    const z = Math.min(1.5, Math.max(1, Math.min(w / 1280, h / 800)));
    win.webContents.setZoomFactor(Math.round(z * 20) / 20);
  };
  win.on('resize', fitZoom);
  win.webContents.on('did-finish-load', fitZoom);

  win.loadURL('app://asosh/index.html');
  // Внешние ссылки открываем в обычном браузере
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('app://')) {
      e.preventDefault();
      if (/^https?:/.test(url)) shell.openExternal(url);
    }
  });
}

// Сравнение версий вида "v16.14" > "v16.10"
function isNewerVersion(remote, local) {
  const p = (v) => String(v || '').replace(/^v/i, '').split('.').map((n) => parseInt(n, 10) || 0);
  const a = p(remote);
  const b = p(local);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) > (b[i] || 0);
  }
  return false;
}

// Запрос с ограничением по времени: на медленном Wi-Fi окно не должно висеть белым
async function fetchWithTimeout(url, ms) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await net.fetch(url, { cache: 'no-store', signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

// Файлы, без которых новая версия не запустится: главный JS и CSS из index.html
function entryAssets(html) {
  const list = [];
  const re = /(?:src|href)="(\/assets\/[^"]+\.(?:js|css))"/g;
  let m;
  while ((m = re.exec(html))) list.push(m[1]);
  return [...new Set(list)];
}

function getLocalDistVersion() {
  try {
    const raw = fs.readFileSync(path.join(DIST, 'version.json'), 'utf8');
    return JSON.parse(raw).version || '';
  } catch {
    return '';
  }
}

app.whenReady().then(() => {
  const CACHE_DIR = path.join(app.getPath('userData'), 'web-cache');
  const distVersion = getLocalDistVersion();

  protocol.handle('app', async (request) => {
    const { pathname } = new URL(request.url);
    let rel = decodeURIComponent(pathname);
    if (rel.startsWith('/asosh-timer/')) rel = rel.slice('/asosh-timer'.length);
    if (rel === '/' || rel === '') rel = '/index.html';

    // При запросе index.html проверяем, нет ли на GitHub Pages более новой версии,
    // чтобы кнопка «Обновить» в Windows-приложении сразу обновляла интерфейс без переустановки .exe
    if (rel === '/index.html') {
      try {
        const vRes = await fetchWithTimeout(`${REMOTE_BASE}/version.json?t=${Date.now()}`, 3000);
        if (vRes.ok) {
          const { version: remoteVer } = await vRes.json();
          if (remoteVer && isNewerVersion(remoteVer, distVersion)) {
            const htmlRes = await fetchWithTimeout(`${REMOTE_BASE}/index.html?v=${remoteVer}`, 5000);
            if (htmlRes.ok) {
              let html = await htmlRes.text();
              html = html.replace(/\/asosh-timer\//g, '/');
              // Сначала докачиваем главный JS и CSS. Если не вышло — остаёмся на текущей версии:
              // иначе без интернета новая index.html ссылалась бы на файлы, которых нет, и окно было бы пустым
              fs.mkdirSync(CACHE_DIR, { recursive: true });
              for (const assetRel of entryAssets(html)) {
                const target = path.normalize(path.join(CACHE_DIR, assetRel));
                if (!target.startsWith(CACHE_DIR) || fs.existsSync(target)) continue;
                const res = await fetchWithTimeout(`${REMOTE_BASE}${assetRel}`, 15000);
                if (!res.ok) throw new Error('asset ' + assetRel);
                fs.mkdirSync(path.dirname(target), { recursive: true });
                fs.writeFileSync(target, Buffer.from(await res.arrayBuffer()));
              }
              fs.writeFileSync(path.join(CACHE_DIR, 'index.html'), html, 'utf8');
              fs.writeFileSync(path.join(CACHE_DIR, 'version.json'), JSON.stringify({ version: remoteVer }), 'utf8');
              return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
            }
          }
        }
      } catch {
        // Нет сети — используем сохранённый кэш или встроенный DIST
      }
    }

    // 1. Если в CACHE_DIR лежит более новая версия, чем в DIST — отдаём из CACHE_DIR
    try {
      const cachedVerRaw = fs.existsSync(path.join(CACHE_DIR, 'version.json'))
        ? JSON.parse(fs.readFileSync(path.join(CACHE_DIR, 'version.json'), 'utf8')).version
        : '';
      if (cachedVerRaw && isNewerVersion(cachedVerRaw, distVersion)) {
        const cachedFile = path.normalize(path.join(CACHE_DIR, rel));
        if (cachedFile.startsWith(CACHE_DIR) && fs.existsSync(cachedFile)) {
          return net.fetch(pathToFileURL(cachedFile).toString());
        }
        // Если файла (например нового JS/CSS ассета) ещё нет в кэше — докачиваем с GitHub Pages
        const remoteAsset = await net.fetch(`${REMOTE_BASE}${rel}`);
        if (remoteAsset.ok) {
          const buf = Buffer.from(await remoteAsset.arrayBuffer());
          fs.mkdirSync(path.dirname(cachedFile), { recursive: true });
          fs.writeFileSync(cachedFile, buf);
          return net.fetch(pathToFileURL(cachedFile).toString());
        }
      }
    } catch {}

    // 2. Встроенная сборка из папки DIST
    const file = path.normalize(path.join(DIST, rel));
    if (!file.startsWith(DIST)) return new Response('Forbidden', { status: 403 });
    return net.fetch(pathToFileURL(file).toString());
  });

  // Микрофон и камера нужны Асошику (голос и фото задания)
  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
    callback(['media', 'notifications', 'fullscreen'].includes(permission));
  });

  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

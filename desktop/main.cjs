// Оболочка для компьютера: открывает собранное приложение (папка dist) в окне.
// Приложение работает офлайн, как и в APK.
const { app, BrowserWindow, protocol, net, shell, session } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');

// Берём собранный сайт: из resources при установке, из ../dist при `npm start`
const DIST = app.isPackaged
  ? path.join(process.resourcesPath, 'app-dist')
  : path.join(__dirname, '..', 'dist');

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

app.whenReady().then(() => {
  protocol.handle('app', (request) => {
    const { pathname } = new URL(request.url);
    let rel = decodeURIComponent(pathname);
    if (rel === '/' || rel === '') rel = '/index.html';
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

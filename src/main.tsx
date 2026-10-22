import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { initCordovaPlugins } from './services/cordovaService';
import './index.css';

// Инициализация хуков Apache Cordova (deviceready, statusbar, splashscreen)
initCordovaPlugins();

// Регистрация Service Worker для оффлайн-доступа и сборки в APK (MConvertor & Cordova)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      // Игнорируем в средах без поддержки SW
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);


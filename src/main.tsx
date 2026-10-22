import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { Analytics } from '@vercel/analytics/react';
import { initCordovaPlugins } from './services/cordovaService';
import './index.css';

// Инициализация хуков Apache Cordova (deviceready, statusbar, splashscreen)
initCordovaPlugins();

// Регистрация Service Worker для оффлайн-доступа и сборки в APK (MConvertor & Cordova)
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Игнорируем в средах без поддержки SW
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Analytics />
  </StrictMode>,
);


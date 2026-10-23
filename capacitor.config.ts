import type { CapacitorConfig } from '@capacitor/cli';

// Сборка Android APK: приложение целиком лежит внутри APK и работает без интернета
// (интернет нужен только чату и общим заменам/ДЗ класса).
const config: CapacitorConfig = {
  appId: 'ru.asosh2.timer',
  appName: 'АСОШ Таймер',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
  },
  plugins: {
    LocalNotifications: {
      iconColor: '#22d3ee',
    },
  },
};

export default config;

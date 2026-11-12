// Общий сброс данных: один раз стирает с устройства всё, что приложение хранило раньше,
// и выходит из аккаунта. Нужен, когда базу очистили и все регистрируются заново.
// Чтобы сбросить ещё раз в будущем, поменяй RESET_EPOCH на новую строку.
//
// Этот файл подключается в main.tsx самым первым, до остального приложения.

const RESET_EPOCH = '2026-11-12';
const EPOCH_KEY = 'asosh_data_epoch';

try {
  if (localStorage.getItem(EPOCH_KEY) !== RESET_EPOCH) {
    const hadData = localStorage.length > 0;
    localStorage.clear();
    try {
      sessionStorage.clear();
    } catch {
      // нет sessionStorage — не страшно
    }
    // Вход Firebase хранится отдельно, в IndexedDB: удаляем его, иначе устройство осталось бы в старом аккаунте.
    // Удаление ставится в очередь раньше, чем приложение откроет эту базу снова
    if (hadData && 'indexedDB' in window) {
      try {
        indexedDB.deleteDatabase('firebaseLocalStorageDb');
      } catch {
        // не получилось — проверка входа при запуске всё равно попросит войти заново
      }
    }
    localStorage.setItem(EPOCH_KEY, RESET_EPOCH);
  }
} catch {
  // localStorage недоступен (приватный режим) — сбрасывать нечего
}

export {};

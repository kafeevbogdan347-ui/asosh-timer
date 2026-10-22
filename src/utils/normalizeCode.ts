// Нормализация кода класса: регистр, без дефисов и пробелов, латиница → кириллица.
// Используется и в приложении, и при сборке (vite.config.ts), поэтому без зависимостей.
export function normalizeCode(input: string): string {
  return (input || '')
    .trim()
    .toUpperCase()
    .replace(/[\s\-_–—]/g, '')
    // Латинские буквы похожие на русские
    .replace(/A/g, 'А')
    .replace(/B/g, 'Б')
    .replace(/V/g, 'В')
    .replace(/G/g, 'Г');
}

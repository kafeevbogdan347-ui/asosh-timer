// Проверка, что ученик указал настоящее имя, а не «Ктулху 228».
// Окончательно ученика подтверждает учитель; здесь — только отсев явной ерунды.
// В базу уходит лишь короткая форма «Иван П.»: полной фамилии на сервере нет.

import { hasProfanity } from './moderation';

// Короткая форма: «Иван П.», «Анна-Мария С.». Такой же шаблон проверяют правила базы
export const SHORT_NAME_RE = /^[А-ЯЁ][а-яё]+(-[А-ЯЁ][а-яё]+)? [А-ЯЁ]\.$/;

// Слова, которые не бывают именами (сравниваем без регистра и ё)
const NOT_NAMES = new Set([
  'админ', 'администратор', 'аноним', 'анонимус', 'бот', 'гость', 'никто', 'ноунейм', 'нуб', 'ученик', 'ученица',
  'школьник', 'школьница', 'тест', 'тестов', 'юзер', 'пользователь', 'человек', 'ктулху', 'пупкин', 'вася пупкин',
  'кто-то', 'никого', 'имя', 'фамилия', 'привет', 'чел', 'крутой', 'босс', 'король', 'королева', 'бог', 'дьявол',
  'сатана', 'шрек', 'путин', 'пушкин', 'ленин', 'сталин', 'гитлер', 'наруто', 'гоку', 'марио', 'соник',
]);

const VOWELS = /[аеёиоуыэюя]/;

const cap = (part: string) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
// «анна-мария» → «Анна-Мария»
const capitalize = (word: string) => word.split('-').map(cap).join('-');
const plain = (s: string) => s.toLowerCase().replace(/ё/g, 'е');

function checkWord(raw: string, label: 'Имя' | 'Фамилия'): string | null {
  const word = raw.trim();
  if (!word) return `${label}: напиши его полностью`;
  if (/[a-z]/i.test(word)) return `${label}: русскими буквами`;
  if (/\d/.test(word)) return `${label}: без цифр`;
  if (!/^[а-яё]+(-[а-яё]+)?$/i.test(word)) return `${label}: только буквы, без пробелов и знаков`;
  if (word.replace('-', '').length < 2) return `${label}: слишком короткое`;
  if (word.length > 20) return `${label}: слишком длинное`;
  if (word.split('-').some((part) => !VOWELS.test(part.toLowerCase()))) return `${label}: не похоже на настоящее`;
  if (/(.)\1\1/i.test(word)) return `${label}: не похоже на настоящее`;
  if (NOT_NAMES.has(plain(word))) return `${label}: укажи настоящее`;
  if (hasProfanity(word)) return `${label}: укажи настоящее`;
  return null;
}

export type RealNameCheck = { ok: true; shortName: string } | { ok: false; error: string };

export function checkRealName(firstName: string, lastName: string): RealNameCheck {
  const error = checkWord(firstName, 'Имя') || checkWord(lastName, 'Фамилия');
  if (error) return { ok: false, error };
  if (NOT_NAMES.has(plain(`${firstName.trim()} ${lastName.trim()}`))) return { ok: false, error: 'Укажи настоящие имя и фамилию' };
  const shortName = `${capitalize(firstName.trim())} ${lastName.trim().charAt(0).toUpperCase()}.`;
  return SHORT_NAME_RE.test(shortName) ? { ok: true, shortName } : { ok: false, error: 'Укажи настоящие имя и фамилию' };
}

// Фильтр нецензурных слов для всего, что видят другие: чат, общая домашка, замены, объявления.
// Проверяем при отправке (не даём отправить) и при показе (если мат попал в базу в обход приложения,
// у всех он будет звёздочками).

// Латинские и цифровые «двойники» русских букв: «xyй», «п1зда», «6ля»
const LOOKALIKE: Record<string, string> = {
  a: 'а', c: 'с', e: 'е', h: 'н', k: 'к', m: 'м', o: 'о', p: 'р', t: 'т', x: 'х', y: 'у',
  '0': 'о', '1': 'и', '3': 'з', '4': 'ч', '6': 'б', '@': 'а', $: 'с', ё: 'е',
};

// Приставки, после которых корень остаётся матерным: «на-», «за-», «от-»…
const PREFIX = '(?:по|на|за|от|о|об|объ|ни|до|при|раз|разъ|рас|вы|съ|въ|у|под|подъ|пере|про|недо|долбо)?';

const RU_PATTERNS: RegExp[] = [
  new RegExp(`^${PREFIX}ху[йеяюи]`),
  /пизд/,
  new RegExp(`^${PREFIX}еб`),
  /^бля(?!х)/, // «бляха» — не мат
  /^сук(а|и|е|у|ой|ам|ами|ах|ин[а-я]*)$/,
  /^сучк(а|и|е|у|ой)$/,
  /^муд(ак|ач|ил|оз|охат)/,
  /пид[оа]р|пидр/,
  /г[ао]нд[ао]н/,
  /залуп/,
  /^шлюх/,
  /^шалав/,
  new RegExp(`^${PREFIX}дроч`),
  /^манд(а|ы|у|ой|ец[а-я]*)$/,
  /^нах$/,
  /^жоп/,
  /^говн/,
];

// Транслит латиницей: «pizdec», «blyat», «huy»
const LATIN_PATTERNS: RegExp[] = [/pizd/, /^bly[ae]?[td]/, /^(?:na|po|za|ot)?hu[iyj]/, /^(?:na|za|ot|vy|pro)?eba[tln]/, /^suka$/, /fuck/, /shit/, /bitch/, /cunt/];

const WORD = /[\p{L}\d@$]+(?:[*._\-]+[\p{L}\d@$]+)*/gu;

function normalize(word: string): string {
  return word
    .toLowerCase()
    .split('')
    .map((ch) => LOOKALIKE[ch] || ch)
    .join('')
    .replace(/[^а-яa-z]/g, '')
    .replace(/(.)\1+/g, '$1'); // «бляяя» → «бля»
}

function isBadWord(word: string): boolean {
  const raw = word.toLowerCase().replace(/[^a-z]/g, '');
  if (raw && LATIN_PATTERNS.some((re) => re.test(raw))) return true;
  const w = normalize(word);
  return w.length > 1 && RU_PATTERNS.some((re) => re.test(w));
}

export function hasProfanity(...texts: (string | undefined)[]): boolean {
  return texts.some((t) => !!t && (t.match(WORD) || []).some(isBadWord));
}

// Матерное слово → первая буква и звёздочки: «б***»
export function censor(text: string): string {
  if (!text) return text;
  return text.replace(WORD, (w) => (isBadWord(w) ? w[0] + '*'.repeat(Math.max(2, w.length - 1)) : w));
}

// Все строковые поля записи — через фильтр (для данных, пришедших из базы)
export function censorFields<T extends object>(item: T): T {
  const out = { ...item } as Record<string, unknown>;
  Object.keys(out).forEach((k) => {
    if (typeof out[k] === 'string' && k !== 'id' && k !== 'uid' && k !== 'userId' && k !== 'date' && k !== 'avatar') {
      out[k] = censor(out[k] as string);
    }
  });
  return out as T;
}

export const PROFANITY_MESSAGE = 'Уберите нецензурные слова — такое не отправится классу';

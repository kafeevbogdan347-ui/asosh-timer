// Автономный стресс-тест АСОШ Таймер + сайта asosh-timer-site
// Запуск: npx tsx tests/stress.test.mjs
import { createHash, pbkdf2Sync } from 'crypto';
import { readFileSync } from 'fs';
import { computeLessonStatus, firstLessonStart, lessonNo, roomLabel } from '../src/utils/lessonStatus.ts';
import { evaluateSafe } from '../src/utils/calculator.ts';
import { normalizeCode } from '../src/utils/normalizeCode.ts';
import { sha256Hex } from '../src/utils/sha256.ts';
import { pbkdf2Hex } from '../src/utils/pbkdf2.ts';
import { B1, B2, B2F, shortenBells, SCHOOL_QUARTERS, isVacationDay, isHolidayDay, FORMULA_CARDS, CHEMICAL_ELEMENTS, DICT } from '../src/data/constants.ts';
import { OFFICIAL_SCHEDULE_2026, SECOND_SHIFT_CLASSES, getBaseLessonsForClass, hasOfficialSchedule, roomFloor } from '../src/data/schoolSchedule.ts';
import { hasProfanity, censor } from '../src/utils/moderation.ts';
import { checkRealName } from '../src/utils/realName.ts';

// Эмуляция localStorage и document для стресс-тестов privacy.ts в Node.js
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
  key: (i) => Array.from(store.keys())[i] ?? null,
  get length() {
    return store.size;
  },
};
globalThis.document = {
  documentElement: {
    classList: { add: () => {}, remove: () => {} },
  },
};
globalThis.__DEV_PASSWORD_HASH__ = pbkdf2Sync('test-dev-pass', Buffer.from('0123456789abcdef0123456789abcdef', 'hex'), 1000, 32, 'sha256').toString('hex');
globalThis.__KDF__ = { salt: '0123456789abcdef0123456789abcdef', iter: 1000 };

const privacy = await import('../src/utils/privacy.ts');

let totalChecks = 0;
let failed = 0;

function assert(cond, msg) {
  totalChecks++;
  if (!cond) {
    failed++;
    console.error(`✗ ОШИБКА: ${msg}`);
  }
}

console.log('🚀 Запуск автономных стресс-тестов АСОШ Таймер v16.11...\n');
const t0 = performance.now();

// ============================================================================
// 1. СТРЕСС-ТЕСТ ТАЙМЕРА ЗВОНКОВ (7 200 тиков по всем минутам суток и 5 режимам)
// ============================================================================
{
  const bellModes = [
    ['1 смена (40 мин)', B1],
    ['2 смена Пн–Чт (40 мин)', B2],
    ['2 смена Пт (40 мин)', B2F],
    ['1 смена сокр. (35 мин)', shortenBells(B1, 35)],
    ['2 смена сокр. (30 мин)', shortenBells(B2, 30)],
  ];
  const sampleLessons = [
    ['Алгебра', '324'],
    ['Русский язык', '211'],
    ['—', ''],
    ['Физика', '209'],
    ['История', '305'],
    ['Физкультура', 'Спортзал'],
    ['Английский язык', '104'],
  ];

  for (const [modeName, bells] of bellModes) {
    for (let min = 0; min < 1440; min++) {
      const sec = min * 60 + 15;
      const st = computeLessonStatus(sampleLessons, bells, sec);
      assert(['lesson', 'break', 'before', 'none'].includes(st.type), `${modeName} min=${min}: неверный type=${st.type}`);
      assert(Number.isFinite(st.remainSec) && st.remainSec >= 0, `${modeName} min=${min}: remainSec=${st.remainSec}`);
      assert(Number.isFinite(st.totalSec) && st.totalSec >= 0, `${modeName} min=${min}: totalSec=${st.totalSec}`);
      if (st.type !== 'none') {
        assert(st.remainSec <= st.totalSec, `${modeName} min=${min}: remainSec (${st.remainSec}) > totalSec (${st.totalSec})`);
      }
      assert(typeof st.nowText === 'string' && st.nowText.length > 0, `${modeName} min=${min}: пустой nowText`);
    }
  }
  console.log('✓ [1/6] Стресс-тест таймера звонков: 7 200 тиков (все минуты суток × 5 режимов звонков) — OK');
}

// ============================================================================
// 2. СТРЕСС-ТЕСТ РАСПИСАНИЯ ВСЕХ КЛАССОВ (5А–11Б, все дни и временные точки)
// ============================================================================
{
  const allClasses = Object.keys(OFFICIAL_SCHEDULE_2026);
  const days = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница'];
  const probeTimes = [7 * 3600 + 30 * 60, 8 * 3600 + 15 * 60, 10 * 3600 + 25 * 60, 13 * 3600 + 20 * 60, 15 * 3600 + 45 * 60, 19 * 3600];

  assert(allClasses.length >= 20, `Ожидалось >= 20 классов в OFFICIAL_SCHEDULE_2026, найдено ${allClasses.length}`);

  for (const cls of allClasses) {
    assert(hasOfficialSchedule(cls), `hasOfficialSchedule(${cls}) вернул false`);
    const shift = SECOND_SHIFT_CLASSES.includes(cls) ? '2' : '1';
    for (const day of days) {
      const bells = shift === '2' ? (day === 'Пятница' ? B2F : B2) : B1;
      const list = getBaseLessonsForClass(cls, day);
      assert(Array.isArray(list) && list.length > 0, `Пустое расписание у ${cls} в ${day}`);
      for (const item of list) {
        assert(Array.isArray(item) && typeof item[0] === 'string' && typeof item[1] === 'string', `Битый урок у ${cls} в ${day}`);
        if (item[1] && /^\d{3}$/.test(item[1])) {
          const fl = roomFloor(item[1]);
          assert(fl === 1 || fl === 2 || fl === 3, `Неверный этаж для кабинета ${item[1]}: ${fl}`);
        }
      }
      for (const sec of probeTimes) {
        const st = computeLessonStatus(list, bells, sec);
        assert(st && typeof st.nowText === 'string', `Сбой статуса у ${cls} в ${day} на sec=${sec}`);
      }
    }
  }
  console.log(`✓ [2/6] Стресс-тест расписания всех классов (${allClasses.length} классов × 5 дней × 6 временных точек) — OK`);
}

// ============================================================================
// 3. СТРЕСС-ТЕСТ И ФАЗЗИНГ КАЛЬКУЛЯТОРА (арифметика + защита от инъекций)
// ============================================================================
{
  const validCases = [
    ['2+2*2', '6'],
    ['(2+2)*2', '8'],
    ['√16', '4'],
    ['√(9+16)', '5'],
    ['2√9', '6'],
    ['50%', '0.5'],
    ['200*10%', '20'],
    ['2^10', '1024'],
    ['10÷4', '2.5'],
    ['3,5×2', '7'],
  ];
  for (const [expr, expected] of validCases) {
    const r = evaluateSafe(expr);
    assert(r.success && r.result === expected, `Calc "${expr}": получили ${JSON.stringify(r)}, ждали ${expected}`);
  }

  const divZero = evaluateSafe('10/0');
  assert(!divZero.success && divZero.result === '∞', `Деление на 0 должно возвращать ошибку ∞`);

  const maliciousInputs = [
    'window.location',
    'document.cookie',
    'process.exit(1)',
    'globalThis',
    'constructor.constructor("return process")()',
    '__proto__',
    'alert(1)',
    'eval("2+2")',
    'Math.random()',
    'function(){}',
    '(() => 1)()',
    '1; while(true){}',
    '/* comment */ 1',
    '// comment',
    '(((((1+2)))',
    '',
    '   ',
    '+++---***',
  ];
  for (const bad of maliciousInputs) {
    const r = evaluateSafe(bad);
    assert(!r.success, `Инъекция/мусор "${bad}" не должен выполняться!`);
  }

  // Случайный фаззинг 500 выражений
  const chars = '0123456789+-*/().,^%√πe×÷ ';
  for (let i = 0; i < 500; i++) {
    let s = '';
    for (let j = 0; j < 18; j++) s += chars[Math.floor(Math.random() * chars.length)];
    const r = evaluateSafe(s);
    assert(typeof r.success === 'boolean' && typeof r.result === 'string', `Фаззинг сбой на "${s}"`);
  }
  console.log('✓ [3/6] Стресс-тест и фаззинг калькулятора (500+ выражений и защита от инъекций) — OK');
}

// ============================================================================
// 4. СТРЕСС-ТЕСТ КРИПТОГРАФИИ, КОДОВ КЛАССОВ И БЛОКИРОВКИ ПЕРЕБОРА
// ============================================================================
{
  // normalizeCode: пробелы, дефисы и латинские буквы классов A/B/V/G → А/Б/В/Г
  assert(normalizeCode('  5a - bvg_2026  ') === '5АБВГ2026', 'normalizeCode: A/B/V/G и дефисы должны нормализоваться');

  // SHA-256 и PBKDF2
  const sample = 'АСОШ-2026-тест';
  const expectedSha = createHash('sha256').update(sample).digest('hex');
  const gotSha = await sha256Hex(sample);
  assert(gotSha === expectedSha, `sha256Hex не совпал с эталоном: ${gotSha} vs ${expectedSha}`);

  const gotPbkdf2 = await pbkdf2Hex('test-dev-pass', globalThis.__KDF__.salt, globalThis.__KDF__.iter);
  assert(gotPbkdf2 === globalThis.__DEV_PASSWORD_HASH__, 'pbkdf2Hex не совпал с pbkdf2Sync');
  assert(await privacy.verifyDevPassword('test-dev-pass'), 'verifyDevPassword должен принимать верный пароль');
  assert(!(await privacy.verifyDevPassword('wrong-pass')), 'verifyDevPassword должен отклонять неверный пароль');

  // PIN-код и блокировка
  store.clear();
  assert(await privacy.savePin('1234'), 'savePin должен сохранять 4 цифры');
  assert(!(await privacy.savePin('12a4')), 'savePin должен отклонять не-цифры');
  assert(privacy.getStoredPin().startsWith('h1:'), 'PIN должен храниться как хеш h1:');
  assert(await privacy.verifyPin('1234'), 'verifyPin должен принимать верный PIN');
  assert(!(await privacy.verifyPin('0000')), 'verifyPin должен отклонять неверный PIN');

  // Блокировка кодов класса после 3 ошибок
  privacy.resetFailedClassCodeAttempts();
  assert(!privacy.recordFailedClassCodeAttempt().locked, '1-я ошибка кода не должна блокировать');
  assert(!privacy.recordFailedClassCodeAttempt().locked, '2-я ошибка кода не должна блокировать');
  assert(privacy.recordFailedClassCodeAttempt().locked, '3-я ошибка кода должна включать блокировку на 30 сек');
  assert(privacy.checkClassCodeLockout().locked, 'checkClassCodeLockout должен сообщать о блокировке');

  // Блокировка Dev-пароля после 4 ошибок и сброс после истечения времени
  privacy.resetFailedDevAttempts();
  for (let i = 0; i < 3; i++) assert(!privacy.recordFailedDevAttempt().locked, `Попытка ${i + 1} dev не должна блокировать`);
  assert(privacy.recordFailedDevAttempt().locked, '4-я ошибка dev должна блокировать');
  // Симулируем истечение времени блокировки
  store.set('asosh_dev_lock_until_v1', String(Date.now() - 1000));
  assert(!privacy.checkDevLockout().locked, 'После истечения таймера блокировка dev должна сниматься');
  assert(!privacy.recordFailedDevAttempt().locked, 'После снятия блокировки первая ошибка снова должна быть 1-й из 4');

  console.log('✓ [4/6] Стресс-тест криптографии (PBKDF2, SHA-256), PIN и защиты от перебора — OK');
}

// ============================================================================
// 5. СТРЕСС-ТЕСТ МОДЕРАЦИИ, СЛОВАРЕЙ И ПРОВЕРКИ ИМЁН
// ============================================================================
{
  assert(!hasProfanity('Привет всем! Кто сделал №342 по алгебре?'), 'Обычное сообщение не должно считаться матом');
  assert(censor('Добрый день, 8А!') === 'Добрый день, 8А!', 'Цензор не должен портить обычный текст');
  assert(checkRealName('Иван', 'Петров').ok, 'Нормальное имя и фамилия должны проходить проверку');
  assert(!checkRealName('12345', '67890').ok, 'Цифры вместо имени должны отклоняться');
  assert(Object.keys(DICT).length >= 9, 'Все языковые словари должны быть загружены');
  assert(FORMULA_CARDS.length > 10 && CHEMICAL_ELEMENTS.length > 10, 'Справочники формул и элементов загружены');
  console.log('✓ [5/6] Стресс-тест модерации, словарей (9 языков) и валидации имён — OK');
}

// ============================================================================
// 6. ПРОВЕРКА SVG-ЛОГОТИПА АСОШИКА (отсутствие «битого» эмодзи 🫧 U+1FAE7 в UI)
// ============================================================================
{
  const navBarCode = readFileSync('src/components/NavBar.tsx', 'utf8');
  const askBtnCode = readFileSync('src/components/AskAsoshikButton.tsx', 'utf8');
  const whatsNewModalCode = readFileSync('src/components/WhatsNewModal.tsx', 'utf8');

  assert(navBarCode.includes('<AsoshikAvatar') && !navBarCode.includes('🫧'), 'NavBar.tsx должен рендерить <AsoshikAvatar />, а не 🫧');
  assert(askBtnCode.includes('<AsoshikAvatar') && !askBtnCode.includes('🫧'), 'AskAsoshikButton.tsx должен рендерить <AsoshikAvatar />, а не 🫧');
  assert(whatsNewModalCode.includes('<AsoshikAvatar'), 'WhatsNewModal.tsx должен заменять 🫧 на <AsoshikAvatar />');
  assert(SCHOOL_QUARTERS.length === 4 && isVacationDay('2026-07-15') && !isVacationDay('2026-09-15'), 'Календарь четвертей и каникул корректен');
  assert(isHolidayDay('2026-11-04') && isHolidayDay('2027-05-09'), 'Праздничные дни определяются корректно');

  console.log('✓ [6/6] Проверка SVG-логотипа Асошика в приложении — OK');
}

const elapsed = (performance.now() - t0).toFixed(1);
console.log(`\n🎉 ВСЕ СТРЕСС-ТЕСТЫ ПРОЙДЕНЫ: ${totalChecks} проверок за ${elapsed} мс (ошибок: ${failed})`);
if (failed > 0) process.exit(1);

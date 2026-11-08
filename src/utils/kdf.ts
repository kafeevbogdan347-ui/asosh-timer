// Медленные отпечатки (PBKDF2-SHA256, 100 000 повторов): по ним нельзя быстро подобрать
// код класса или пароль перебором. Работает и в приложении, и при сборке (Node 20+),
// поэтому без зависимостей — только Web Crypto.

export const KDF_ITERATIONS = 100_000;

export async function pbkdf2Hex(secret: string, salt: string, iterations = KDF_ITERATIONS): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations, hash: 'SHA-256' },
    key,
    256
  );
  return [...new Uint8Array(bits)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Отпечаток для проверки кода класса внутри приложения (лежит в собранном приложении)
export const classCheckHash = (normalizedCode: string) => pbkdf2Hex(normalizedCode, 'asosh-class-check-v1');

// Ключ участника класса: его знает только тот, кто ввёл верный код. База сверяет его
// с asosh_class_keys и только тогда пускает в чат класса и даёт добавлять замены и ДЗ.
// Из отпечатка в приложении этот ключ не получить — соль другая.
export const classMemberKey = (normalizedCode: string) => pbkdf2Hex(normalizedCode, 'asosh-class-member-v1');

// Отпечаток пароля разработчика
export const devPasswordHash = (password: string) => pbkdf2Hex(password, 'asosh-dev-v1');

// Ключ класса в базе: «8А» → «8%D0%B0». Так же устроены пути чата и общих данных класса.
export const classDbKey = (cls: string) => encodeURIComponent(cls.replace(/\s+/g, '_').toLowerCase());

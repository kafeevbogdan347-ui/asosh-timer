// Медленный отпечаток (PBKDF2-SHA256): одна проверка — доля секунды, а перебор всех кодов
// по отпечатку из приложения становится в сотни тысяч раз дороже, чем с обычным SHA-256.
// Соль и число повторов задаются при сборке (vite.config.ts).

export async function pbkdf2Hex(text: string, saltHex: string, iterations: number): Promise<string> {
  const enc = new TextEncoder();
  const salt = new Uint8Array((saltHex.match(/../g) || []).map((h) => parseInt(h, 16)));
  const key = await crypto.subtle.importKey('raw', enc.encode(text), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
  return Array.from(new Uint8Array(bits))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

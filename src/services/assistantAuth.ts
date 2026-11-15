// Вход для Асошика: сервер ИИ пускает только вошедших в приложение (анонимно или по логину).
// К каждому запросу прикладываем Firebase ID-токен; сервер проверяет его у Google.
import { getAuth } from 'firebase/auth';
import { ensureSignedIn, initFirebase } from './firebaseChat';

export async function assistantIdToken(): Promise<string> {
  try {
    if (!(await ensureSignedIn())) return '';
    const { app } = initFirebase();
    if (!app) return '';
    return (await getAuth(app).currentUser?.getIdToken()) || '';
  } catch {
    return '';
  }
}

export async function authJsonHeaders(): Promise<Record<string, string>> {
  const token = await assistantIdToken();
  return token ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } : { 'Content-Type': 'application/json' };
}

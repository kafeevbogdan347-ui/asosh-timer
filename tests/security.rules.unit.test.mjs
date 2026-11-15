import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const rules = JSON.parse(fs.readFileSync('database.rules.json', 'utf8')).rules;

test('database.rules.json: чат и записи класса запрещают лишние поля ($other: false)', () => {
  for (const node of [
    rules.asosh_timer.$msg,
    rules.asosh_rooms.$room.$msg,
    rules.asosh_class.$cls.replacements.$id,
    rules.asosh_class.$cls.homework.$id,
  ]) {
    assert.equal(node.$other['.validate'], false);
  }
  for (const field of [
    'username', 'userId', 'avatar', 'content', 'room', 'isIncognito',
    'isSelfDestruct', 'created_at', 'timestamp', 'handle', 'className',
    'fullName', 'registeredAt', 'isDev',
  ]) {
    assert.ok(rules.asosh_timer.$msg[field], `в asosh_timer отсутствует ${field}`);
    assert.ok(rules.asosh_rooms.$room.$msg[field], `в asosh_rooms отсутствует ${field}`);
  }
  assert.ok(rules.asosh_class.$cls.homework.$id.forDate, 'forDate должен быть разрешён в homework');
});

test('database.rules.json: ДЗ и замены класса требуют учителя или ученика из списка класса', () => {
  for (const section of ['replacements', 'homework']) {
    const w = rules.asosh_class.$cls[section].$id['.write'];
    assert.match(w, /asosh_teachers/);
    assert.match(w, /asosh_roster/);
    assert.match(w, /role'\)\.val\(\) === 'student'/);
  }
});

test('database.rules.json: онлайн ограничивает свой класс и шаг накрутки sec', () => {
  const entry = rules.asosh_online.$cls.$uid;
  assert.match(entry['.write'], /asosh_roster'\)\.child\(\$cls\)\.child\(\$uid\)\.exists\(\)/);
  assert.match(entry.sec['.validate'], /% 1 === 0/);
  assert.match(entry.sec['.validate'], /<= 3600/);
  assert.match(entry.sec['.validate'], /<= 600/);
});

test('database.rules.json: запись в asosh_roster только для роли student с совпадающим именем', () => {
  const sid = rules.asosh_roster.$cls.$sid;
  assert.match(sid['.write'], /role'\)\.val\(\) === 'student'/);
  assert.match(sid['.validate'], /name'\)\.val\(\)/);
});

test('database.rules.json: публичный профиль ограничивает hw, games, friends и сверяет имя', () => {
  const pub = rules.asosh_pubprof.$uid;
  assert.match(pub.name['.validate'], /asosh_users/);
  assert.match(pub.hw['.validate'], /<= 5000/);
  assert.match(pub.games['.validate'], /<= 100000/);
  assert.match(pub.friends['.validate'], /<= 200/);
});

test('accounts.ts: removeParent отключает родителя и сразу меняет код', () => {
  const src = fs.readFileSync('src/services/accounts.ts', 'utf8');
  const start = src.indexOf('export async function removeParent');
  assert.ok(start >= 0);
  const body = src.slice(start, src.indexOf('export async function moveStudentToClass'));
  assert.match(body, /asosh_family\/\$\{sid\}\/\$\{puid\}/);
  assert.match(body, /newParentCode\(\)/);
  assert.match(body, /asosh_parent_codes/);
  assert.match(body, /asosh_private\/\$\{sid\}/);
  assert.match(body, /collectExistingCodeNulls/);
});

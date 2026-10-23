import React, { useState } from 'react';
import { DAYS, DICT } from '../data/constants';
import { LessonUpdate, LanguageType, SoundProfileType } from '../types';
import { playSound, doVibro } from '../utils/audio';
import { Plus, Trash2, Smartphone, Terminal, Cpu, Database, Volume2, Sparkles, Download, CheckCircle, RefreshCw } from 'lucide-react';

interface AddUpdateScreenProps {
  cls: string;
  updates: LessonUpdate[];
  onAddUpdate: (update: LessonUpdate) => void;
  onDeleteUpdate: (id: string) => void;
  lang: LanguageType;
  soundProfile: SoundProfileType;
  vibro: boolean;
  onShowToast: (msg: string) => void;
}

export const AddUpdateScreen: React.FC<AddUpdateScreenProps> = ({
  cls,
  updates,
  onAddUpdate,
  onDeleteUpdate,
  lang,
  soundProfile,
  vibro,
  onShowToast,
}) => {
  const [day, setDay] = useState(DAYS[0]);
  const [num, setNum] = useState(1);
  const [sub, setSub] = useState('');
  const [room, setRoom] = useState('');

  // Dev tools state
  const [apkPkgName, setApkPkgName] = useState('ru.asosh2.diary');
  const [apkAppName, setApkAppName] = useState('АСОШ №2 Школьный Дневник');
  const [apkVersion, setApkVersion] = useState('10.9.0');

  const d = DICT[lang] || DICT.ru;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sub.trim()) return;

    onAddUpdate({
      id: `${cls}-${day}-${num}-${Date.now()}`,
      cls,
      day,
      num,
      sub: sub.trim(),
      room: room.trim(),
    });

    setSub('');
    setRoom('');
    playSound('coin', soundProfile);
    doVibro(vibro, 20);
    onShowToast('Урок успешно добавлен! ✨');
  };

  const handleSimulateBell = (type: 'ring' | 'urgent' | 'break') => {
    if (type === 'urgent') {
      playSound('warn', soundProfile);
      doVibro(vibro, 80);
      onShowToast('🔔 Симуляция: До звонка на урок осталось 2 минуты!');
    } else if (type === 'ring') {
      playSound('bell', soundProfile);
      doVibro(vibro, 100);
      onShowToast('🛎️ Симуляция: ЗВОНОК НА УРОК!');
    } else {
      playSound('victory', soundProfile);
      doVibro(vibro, 50);
      onShowToast('🏖️ Симуляция: Урок окончен! Перемена 15 минут.');
    }
  };

  const handleDownloadManifest = () => {
    const manifest = {
      name: apkAppName,
      short_name: 'АСОШ №2',
      start_url: '/',
      display: 'standalone',
      background_color: '#060d1f',
      theme_color: '#00f0ff',
      orientation: 'portrait',
      icons: [
        {
          src: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=192&auto=format&fit=crop&q=80',
          sizes: '192x192',
          type: 'image/png',
        },
        {
          src: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=512&auto=format&fit=crop&q=80',
          sizes: '512x512',
          type: 'image/png',
        },
      ],
      package_name: apkPkgName,
      version: apkVersion,
    };

    const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'manifest.webintoapp.json';
    a.click();
    URL.revokeObjectURL(url);
    playSound('coin', soundProfile);
    onShowToast('Конфигурация WebIntoApp APK скачана! 📦');
  };

  const handleFillTestData = () => {
    const subjects = ['Алгебра', 'Геометрия', 'Русский язык', 'Литература', 'Физика', 'Химия', 'История', 'Обществознание'];
    let count = 0;
    DAYS.forEach((dName) => {
      [1, 2, 3, 4, 5, 6].forEach((n) => {
        const randSub = subjects[Math.floor(Math.random() * subjects.length)];
        onAddUpdate({
          id: `${cls}-${dName}-${n}-${Date.now()}-${count++}`,
          cls,
          day: dName,
          num: n,
          sub: randSub,
          room: `${300 + Math.floor(Math.random() * 30)}`,
        });
      });
    });
    playSound('levelup', soundProfile);
    doVibro(vibro, 40);
    onShowToast('Сгенерировано полное тестовое расписание на всю неделю! 🚀');
  };

  const classUpdates = updates.filter((u) => u.cls === cls);

  return (
    <div className="card screen-enter space-y-4">
      <div>
        <h2 className="text-xl font-black text-cyan-300 flex items-center gap-2">
          <span>✏️</span>
          <span>Своё расписание — {cls}</span>
        </h2>
        <p className="text-xs text-white/70">
          Добавь урок, если расписание изменилось или его ещё нет в приложении. Изменения видны только тебе.
        </p>
      </div>

      {/* TAB 1: SCHEDULE EDITOR */}
      {(
        <div className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-bold text-white/70">День недели</label>
                <select
                  value={day}
                  onChange={(e) => setDay(e.target.value)}
                  className="cursor-pointer text-sm"
                >
                  {DAYS.map((dName) => (
                    <option key={dName} value={dName}>
                      {dName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-white/70">Номер урока</label>
                <select
                  value={num}
                  onChange={(e) => setNum(Number(e.target.value))}
                  className="cursor-pointer text-sm"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <option key={n} value={n}>
                      {n} урок
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-bold text-white/70">Предмет</label>
                <input
                  type="text"
                  value={sub}
                  onChange={(e) => setSub(e.target.value)}
                  placeholder="Например: Алгебра"
                  className="text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-white/70">Кабинет (или подгруппы 301/302)</label>
                <input
                  type="text"
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  placeholder="324"
                  className="text-sm"
                />
              </div>
            </div>

            <button type="submit" className="btn green justify-center text-sm py-3 mt-2 shadow-md">
              <Plus className="w-4 h-4" />
              <span>{d.save}</span>
            </button>
          </form>

          {/* Список добавленных уроков */}
          <div className="border-t border-white/10 pt-3">
            <h3 className="text-sm font-black text-white/80 mb-2">Сохранённые уроки ({classUpdates.length}):</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {classUpdates.length > 0 ? (
                classUpdates.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between p-3 bg-white/8 rounded-2xl border border-white/15"
                  >
                    <div>
                      <b className="text-sm text-cyan-200">
                        {u.day} • {u.num} урок
                      </b>
                      <div className="text-xs text-white/70">
                        {u.sub} {u.room ? `(каб. ${u.room})` : ''}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDeleteUpdate(u.id)}
                      className="p-1.5 text-red-400 hover:text-red-300 transition-colors"
                      title="Удалить"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-xs text-white/50">
                  Пока нет добавленных уроков
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

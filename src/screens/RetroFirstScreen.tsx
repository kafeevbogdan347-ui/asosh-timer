import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Sparkles, Bell, LogOut, Wrench, Plus, Trash2, CheckCircle2 } from 'lucide-react';

interface RetroFirstScreenProps {
  onBackToModern: () => void;
  onShowToast?: (msg: string) => void;
}

interface HomeworkItem {
  id: number;
  day: string;
  subject: string;
  text: string;
  author: string;
}

interface ReminderItem {
  id: number;
  title: string;
  when: number;
  done: boolean;
}

const CLASS_NAME = '5Б';
const CLASS_ACCESS_CODE = '5B2026';

// Anonymized student list as requested for privacy ("вместо имен в выборе там будет Null")
const STUDENTS = [
  'Null (1)',
  'Null (2)',
  'Null (3)',
  'Null (4)',
  'Null (5)',
  'Null (6)',
  'Null (7)',
  'Null (8)',
  'Null (9)',
  'Null (10)',
  'Null (11)',
  'Null (12)',
  'Null (13)',
  'Null (14)',
  'Null (15)',
  'Null (16)',
  'Null (17)'
];

// Базовое расписание 5Б по фото
const BASE_SCHEDULE: Record<string, string[]> = {
  'Понедельник': ['математика', 'русский', 'музыка', 'литература', 'ин.яз', 'ин.яз'],
  'Вторник': ['технология', 'технология', 'история', 'литература', 'русский', 'математика'],
  'Среда': ['математика', 'ФЗК', 'биология', 'русский', 'ин.яз'],
  'Четверг': ['информатика', 'русский', 'математика', 'история', 'география', 'ИЗО', 'проф.мин'],
  'Пятница': ['история', 'литература', 'математика', 'русский', 'ФЗК', 'ритмика / хор'],
  'Суббота': []
};

const STORAGE_KEYS = {
  user: 'school5b_current_user',
  schedule: 'school5b_schedule',
  homework: 'school5b_homework',
  reminders: 'school5b_reminders'
};

function readJson<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}

export const RetroFirstScreen: React.FC<RetroFirstScreenProps> = ({
  onBackToModern,
  onShowToast,
}) => {
  // Auth state
  const [currentUser, setCurrentUser] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEYS.user) || null;
  });

  const [selectedStudent, setSelectedStudent] = useState<string>(STUDENTS[0]);
  const [classCodeInput, setClassCodeInput] = useState<string>('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // App state
  const [currentDay, setCurrentDay] = useState<string>(() => {
    const days = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    const today = days[new Date().getDay()];
    return BASE_SCHEDULE[today] ? today : 'Понедельник';
  });

  const [schedule, setSchedule] = useState<Record<string, string[]>>(() =>
    readJson(STORAGE_KEYS.schedule, JSON.parse(JSON.stringify(BASE_SCHEDULE)))
  );

  const [homeworkList, setHomeworkList] = useState<HomeworkItem[]>(() => readJson(STORAGE_KEYS.homework, []));

  const [reminderList, setReminderList] = useState<ReminderItem[]>(() => readJson(STORAGE_KEYS.reminders, []));

  // UI state
  const [isEditPanelOpen, setIsEditPanelOpen] = useState(false);
  const [editDay, setEditDay] = useState<string>('Понедельник');
  const [editLessonNum, setEditLessonNum] = useState<number>(1);
  const [editSubject, setEditSubject] = useState<string>('');

  // HW inputs
  const [hwDay, setHwDay] = useState<string>('Понедельник');
  const [hwSubject, setHwSubject] = useState<string>('');
  const [hwText, setHwText] = useState<string>('');

  // Reminder inputs
  const [remTitle, setRemTitle] = useState<string>('');
  const [remDateTime, setRemDateTime] = useState<string>('');

  const reminderTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync state with storage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.schedule, JSON.stringify(schedule));
  }, [schedule]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.homework, JSON.stringify(homeworkList));
  }, [homeworkList]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.reminders, JSON.stringify(reminderList));
  }, [reminderList]);

  // Reminder interval
  useEffect(() => {
    const checkReminders = () => {
      const now = Date.now();
      setReminderList((prev) => {
        let changed = false;
        const next = prev.map((item) => {
          if (!item.done && item.when <= now) {
            changed = true;
            if (onShowToast) onShowToast(`🔔 Напоминание: ${item.title}`);
            return { ...item, done: true };
          }
          return item;
        });
        return changed ? next : prev;
      });
    };

    reminderTimerRef.current = setInterval(checkReminders, 15000);
    checkReminders();

    return () => {
      if (reminderTimerRef.current) clearInterval(reminderTimerRef.current);
    };
  }, [onShowToast]);

  const handleLogin = () => {
    setLoginError(null);
    if (!STUDENTS.includes(selectedStudent)) {
      setLoginError('Такого имени нет в списке класса.');
      return;
    }

    if (classCodeInput.trim() !== CLASS_ACCESS_CODE) {
      setLoginError('Неверный код класса. Нажми «Подсказка», чтобы узнать код.');
      return;
    }

    setCurrentUser(selectedStudent);
    localStorage.setItem(STORAGE_KEYS.user, selectedStudent);
    if (onShowToast) onShowToast(`👋 Привет, ${selectedStudent}! Класс: 5Б`);
  };

  const handleFillDemoCode = () => {
    setClassCodeInput(CLASS_ACCESS_CODE);
    if (onShowToast) {
      onShowToast(`Код доступа для 5Б: ${CLASS_ACCESS_CODE}`);
    } else {
      alert(`Код класса: ${CLASS_ACCESS_CODE}`);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem(STORAGE_KEYS.user);
    setClassCodeInput('');
    setLoginError(null);
  };

  const handleSaveScheduleChange = () => {
    if (!editSubject.trim()) {
      alert('Введи название предмета');
      return;
    }

    const updated = { ...schedule };
    if (!updated[editDay]) updated[editDay] = [];
    while (updated[editDay].length < editLessonNum) {
      updated[editDay].push('');
    }
    updated[editDay][editLessonNum - 1] = editSubject.trim();
    setSchedule(updated);
    setEditSubject('');
    setCurrentDay(editDay);
    if (onShowToast) onShowToast('Изменение расписания сохранено! 💾');
  };

  const handleResetSchedule = () => {
    if (!confirm('Сбросить все изменения расписания и вернуть базовую версию 5Б?')) return;
    setSchedule(JSON.parse(JSON.stringify(BASE_SCHEDULE)));
    if (onShowToast) onShowToast('Расписание сброшено до оригинала! 🔄');
  };

  const handleAddHomework = () => {
    if (!hwSubject.trim() || !hwText.trim()) {
      alert('Заполни предмет и текст домашнего задания.');
      return;
    }

    const newItem: HomeworkItem = {
      id: Date.now(),
      day: hwDay,
      subject: hwSubject.trim(),
      text: hwText.trim(),
      author: currentUser || 'Null',
    };

    setHomeworkList([newItem, ...homeworkList]);
    setHwSubject('');
    setHwText('');
    if (onShowToast) onShowToast('Домашнее задание добавлено! 📝');
  };

  const handleDeleteHomework = (id: number) => {
    setHomeworkList(homeworkList.filter((item) => item.id !== id));
    if (onShowToast) onShowToast('Запись ДЗ удалена!');
  };

  const handleAddReminder = () => {
    if (!remTitle.trim() || !remDateTime) {
      alert('Заполни название и дату/время напоминания.');
      return;
    }

    const when = new Date(remDateTime).getTime();
    if (isNaN(when) || when <= Date.now()) {
      alert('Поставь дату и время в будущем.');
      return;
    }

    const newItem: ReminderItem = {
      id: Date.now(),
      title: remTitle.trim(),
      when,
      done: false,
    };

    setReminderList([...reminderList, newItem].sort((a, b) => a.when - b.when));
    setRemTitle('');
    setRemDateTime('');
    if (onShowToast) onShowToast('Напоминание поставлено! ⏰');
  };

  const handleMarkReminderDone = (id: number) => {
    setReminderList(
      reminderList.map((item) => (item.id === id ? { ...item, done: true } : item))
    );
  };

  const handleDeleteReminder = (id: number) => {
    setReminderList(reminderList.filter((item) => item.id !== id));
  };

  const handleRequestNotification = () => {
    if (!('Notification' in window)) {
      alert('На этом устройстве уведомления не поддерживаются в браузере.');
      return;
    }
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        alert('Уведомления разрешены!');
      } else {
        alert('Уведомления не разрешены. Напоминания всё равно будут видны внутри страницы.');
      }
    });
  };

  const formatDateTime = (timestamp: number) => {
    const d = new Date(timestamp);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const currentLessons = schedule[currentDay] || [];

  return (
    <div className="min-h-screen text-slate-100 pb-12 transition-all font-sans">
      {/* EASTER EGG TOP NAVIGATION HEADER */}
      <div className="max-w-4xl mx-auto px-4 pt-3 pb-2 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 mb-4 bg-slate-900/60 backdrop-blur-md rounded-2xl">
        <button
          onClick={onBackToModern}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-black shadow-lg transition-all active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>⚡ Вернуться в АСОШ №2 v11.0</span>
        </button>

        <div className="flex items-center gap-2 text-xs text-amber-300 font-bold bg-amber-400/10 px-3 py-1.5 rounded-xl border border-amber-400/30">
          <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
          <span>Пасхалка: Самая первая версия (5Б Классика Koder)</span>
        </div>
      </div>

      {/* ==================================================== */}
      {/* SCREEN 1: LOGIN SCREEN                               */}
      {/* ==================================================== */}
      {!currentUser ? (
        <div className="max-w-3xl mx-auto px-4 space-y-4">
          {/* HERO CARD */}
          <div className="p-6 bg-white/[0.08] backdrop-blur-md border border-white/[0.12] rounded-[18px] text-center shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
            <h1 className="text-3xl font-black text-white mb-2 flex items-center justify-center gap-2">
              <span>📚</span>
              <span>Расписание 5Б</span>
            </h1>
            <p className="text-slate-300 text-sm leading-relaxed max-w-xl mx-auto">
              Вход по именам класса, расписание, запись домашки и напоминания в одном телефоне. Сделано под Koder в одном HTML-файле.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* LOGIN CARD */}
            <div className="p-5 bg-white/[0.08] backdrop-blur-md border border-white/[0.12] rounded-[18px] shadow-[0_12px_30px_rgba(0,0,0,0.35)] space-y-3">
              <h2 className="text-xl font-bold text-white">Вход</h2>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Выбери имя (Конфиденциально: Null)
                </label>
                <select
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  className="w-full bg-white text-slate-900 font-semibold rounded-xl px-3.5 py-3 text-sm border-none shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                >
                  {STUDENTS.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Код класса (5B2026)
                </label>
                <input
                  type="password"
                  value={classCodeInput}
                  onChange={(e) => setClassCodeInput(e.target.value)}
                  placeholder="Код доступа для 5Б"
                  className="w-full bg-white text-slate-900 font-semibold rounded-xl px-3.5 py-3 text-sm border-none shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
              </div>

              {loginError && (
                <div className="p-2.5 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 text-xs font-bold">
                  ⚠️ {loginError}
                </div>
              )}

              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleLogin}
                  className="flex-1 bg-gradient-to-r from-sky-400 to-blue-600 hover:from-sky-300 hover:to-blue-500 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all active:scale-95 text-sm cursor-pointer"
                >
                  Войти
                </button>
                <button
                  type="button"
                  onClick={handleFillDemoCode}
                  className="flex-1 bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all active:scale-95 text-sm cursor-pointer"
                >
                  Подсказка
                </button>
              </div>

              <p className="text-[12px] text-amber-200/90 leading-relaxed pt-1">
                Важно: это локальный школьный проект. Защита базовая, потому что файл работает без сервера. Чтобы усилить защиту, потом можно перенести всё на сайт с базой данных.
              </p>
            </div>

            {/* WHAT IT CAN DO CARD */}
            <div className="p-5 bg-white/[0.08] backdrop-blur-md border border-white/[0.12] rounded-[18px] shadow-[0_12px_30px_rgba(0,0,0,0.35)] space-y-3">
              <h2 className="text-xl font-bold text-white">Что умеет</h2>
              <div className="text-sm text-slate-200 space-y-1.5 leading-relaxed">
                <div>• Базовое расписание 5Б по фото</div>
                <div>• Кнопка <b>«Изменилось расписание?»</b></div>
                <div>• Сохранение изменений на телефоне</div>
                <div>• Запись домашнего задания</div>
                <div>• Напоминания по дате и времени</div>
                <div>• Вход по именам класса</div>
              </div>
              <p className="text-xs text-slate-400 pt-2 border-t border-white/10">
                Код класса по умолчанию: <b className="text-sky-300 font-mono">5B2026</b>.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* ==================================================== */
        /* SCREEN 2: MAIN APP SCREEN (5Б Школьный центр)       */
        /* ==================================================== */
        <div className="max-w-4xl mx-auto px-4 space-y-4">
          {/* HERO CARD */}
          <div className="p-6 bg-white/[0.08] backdrop-blur-md border border-white/[0.12] rounded-[18px] text-center shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
            <div className="inline-block px-3.5 py-1.5 rounded-full bg-sky-400/20 border border-sky-400/35 text-sky-200 text-xs font-bold mb-3 shadow-sm">
              👋 Привет, {currentUser}! Класс: {CLASS_NAME}
            </div>
            <h1 className="text-3xl font-black text-white mb-2 flex items-center justify-center gap-2">
              <span>🎒</span>
              <span>5Б | Школьный центр</span>
            </h1>
            <p className="text-slate-300 text-sm leading-relaxed max-w-xl mx-auto">
              Смотри уроки, меняй расписание, записывай домашку и не забывай про важное.
            </p>
          </div>

          {/* TOOLBAR */}
          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => setIsEditPanelOpen(!isEditPanelOpen)}
              className="flex-1 min-w-[170px] bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all active:scale-95 text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Wrench className="w-4 h-4" />
              <span>🛠 Изменилось расписание?</span>
            </button>
            <button
              type="button"
              onClick={handleRequestNotification}
              className="flex-1 min-w-[170px] bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all active:scale-95 text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              <span>🔔 Разрешить напоминания</span>
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="flex-1 min-w-[170px] bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all active:scale-95 text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>🚪 Выйти</span>
            </button>
          </div>

          {/* SCHEDULE & EDIT GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* SCHEDULE CARD */}
            <div className="p-5 bg-white/[0.08] backdrop-blur-md border border-white/[0.12] rounded-[18px] shadow-[0_12px_30px_rgba(0,0,0,0.35)] space-y-3">
              <h2 className="text-xl font-bold text-white">Расписание</h2>

              {/* DAY TABS */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {Object.keys(BASE_SCHEDULE).map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => {
                      setCurrentDay(day);
                      setEditDay(day);
                      setHwDay(day);
                    }}
                    className={`py-2 px-1 text-xs font-bold rounded-xl border transition-all text-center cursor-pointer ${
                      currentDay === day
                        ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white border-transparent shadow-md'
                        : 'bg-white/[0.08] text-slate-300 border-white/[0.12] hover:bg-white/[0.15]'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>

              {/* LESSON LIST */}
              <div className="space-y-2 pt-2">
                {currentLessons.length === 0 ? (
                  <div className="p-4 bg-white/[0.07] border border-white/[0.12] rounded-xl text-center">
                    <h4 className="font-bold text-white text-base">{currentDay}</h4>
                    <div className="text-xs text-slate-400 mt-1">Уроков нет</div>
                    <div className="text-xs text-slate-300 mt-0.5">Можно отдыхать или делать проекты.</div>
                  </div>
                ) : (
                  currentLessons.map((subject, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-3 bg-white/[0.07] border border-white/[0.12] rounded-xl"
                    >
                      <div className="w-9 h-9 rounded-full bg-sky-400/20 border border-sky-400/35 text-sky-300 font-bold grid place-items-center flex-shrink-0 text-sm">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-white text-sm truncate">
                          {subject || '—'}
                        </div>
                        <div className="text-xs text-slate-400">
                          {currentDay}, урок {idx + 1}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* EDIT SCHEDULE PANEL */}
            {isEditPanelOpen ? (
              <div className="p-5 bg-white/[0.08] backdrop-blur-md border border-white/[0.12] rounded-[18px] shadow-[0_12px_30px_rgba(0,0,0,0.35)] space-y-3">
                <h2 className="text-xl font-bold text-white">Изменение расписания</h2>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">День</label>
                  <select
                    value={editDay}
                    onChange={(e) => setEditDay(e.target.value)}
                    className="w-full bg-white text-slate-900 font-semibold rounded-xl px-3 py-2.5 text-xs border-none"
                  >
                    {Object.keys(BASE_SCHEDULE).map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Номер урока</label>
                  <select
                    value={editLessonNum}
                    onChange={(e) => setEditLessonNum(Number(e.target.value))}
                    className="w-full bg-white text-slate-900 font-semibold rounded-xl px-3 py-2.5 text-xs border-none"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Предмет</label>
                  <input
                    type="text"
                    value={editSubject}
                    onChange={(e) => setEditSubject(e.target.value)}
                    placeholder="Например: русский"
                    className="w-full bg-white text-slate-900 font-semibold rounded-xl px-3 py-2.5 text-xs border-none"
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleSaveScheduleChange}
                    className="flex-1 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold py-2.5 px-3 rounded-xl shadow-md text-xs cursor-pointer"
                  >
                    Сохранить изменение
                  </button>
                  <button
                    type="button"
                    onClick={handleResetSchedule}
                    className="flex-1 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white font-bold py-2.5 px-3 rounded-xl shadow-md text-xs cursor-pointer"
                  >
                    Сбросить всё
                  </button>
                </div>

                <p className="text-[11px] text-slate-400">
                  Изменения сохраняются только на этом телефоне в памяти браузера.
                </p>
              </div>
            ) : (
              <div className="p-5 bg-white/[0.05] border border-white/[0.1] rounded-[18px] flex flex-col items-center justify-center text-center p-8 space-y-2">
                <div className="text-3xl">🗓️</div>
                <div className="text-sm font-bold text-white">Редактор расписания</div>
                <p className="text-xs text-slate-400 max-w-xs">
                  Нажми на кнопку <b>«🛠 Изменилось расписание?»</b> выше, чтобы скорректировать уроки.
                </p>
              </div>
            )}
          </div>

          {/* HOMEWORK & REMINDERS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* HOMEWORK CARD */}
            <div className="p-5 bg-white/[0.08] backdrop-blur-md border border-white/[0.12] rounded-[18px] shadow-[0_12px_30px_rgba(0,0,0,0.35)] space-y-3">
              <h2 className="text-xl font-bold text-white flex items-center justify-between">
                <span>Домашнее задание</span>
                <span className="text-xs font-normal text-slate-400">5Б</span>
              </h2>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">День</label>
                <select
                  value={hwDay}
                  onChange={(e) => setHwDay(e.target.value)}
                  className="w-full bg-white text-slate-900 font-semibold rounded-xl px-3 py-2 text-xs border-none"
                >
                  {Object.keys(BASE_SCHEDULE).map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Предмет</label>
                <input
                  type="text"
                  value={hwSubject}
                  onChange={(e) => setHwSubject(e.target.value)}
                  placeholder="Например: математика"
                  className="w-full bg-white text-slate-900 font-semibold rounded-xl px-3 py-2 text-xs border-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Что задали</label>
                <textarea
                  value={hwText}
                  onChange={(e) => setHwText(e.target.value)}
                  placeholder="Например: № 241, 242 и правило"
                  rows={3}
                  className="w-full bg-white text-slate-900 font-semibold rounded-xl px-3 py-2 text-xs border-none resize-none"
                />
              </div>

              <button
                type="button"
                onClick={handleAddHomework}
                className="w-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold py-2.5 px-4 rounded-xl shadow-md text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Добавить ДЗ</span>
              </button>

              {/* HW LIST */}
              <div className="space-y-2 pt-2 max-h-72 overflow-y-auto pr-1">
                {homeworkList.length === 0 ? (
                  <div className="p-3 bg-white/[0.07] border border-white/[0.12] rounded-xl text-xs text-slate-400 text-center">
                    Домашних записей пока нет.
                  </div>
                ) : (
                  homeworkList.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 bg-white/[0.07] border border-white/[0.12] rounded-xl space-y-1.5"
                    >
                      <h4 className="font-bold text-white text-sm">{item.subject}</h4>
                      <div className="text-[11px] text-slate-400 font-medium">
                        {item.day} • добавил(а): {item.author}
                      </div>
                      <div className="text-xs text-slate-200 whitespace-pre-wrap">{item.text}</div>
                      <div className="pt-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleDeleteHomework(item.id)}
                          className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 text-white font-bold py-1.5 px-3 rounded-lg text-[11px] flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Удалить</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* REMINDERS CARD */}
            <div className="p-5 bg-white/[0.08] backdrop-blur-md border border-white/[0.12] rounded-[18px] shadow-[0_12px_30px_rgba(0,0,0,0.35)] space-y-3">
              <h2 className="text-xl font-bold text-white flex items-center justify-between">
                <span>Напоминания</span>
                <span className="text-xs font-normal text-slate-400">Будильник</span>
              </h2>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Название</label>
                <input
                  type="text"
                  value={remTitle}
                  onChange={(e) => setRemTitle(e.target.value)}
                  placeholder="Например: сделать математику"
                  className="w-full bg-white text-slate-900 font-semibold rounded-xl px-3 py-2 text-xs border-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Дата и время</label>
                <input
                  type="datetime-local"
                  value={remDateTime}
                  onChange={(e) => setRemDateTime(e.target.value)}
                  className="w-full bg-white text-slate-900 font-semibold rounded-xl px-3 py-2 text-xs border-none"
                />
              </div>

              <button
                type="button"
                onClick={handleAddReminder}
                className="w-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold py-2.5 px-4 rounded-xl shadow-md text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                <span>Поставить напоминание</span>
              </button>

              {/* REMINDER LIST */}
              <div className="space-y-2 pt-2 max-h-72 overflow-y-auto pr-1">
                {reminderList.length === 0 ? (
                  <div className="p-3 bg-white/[0.07] border border-white/[0.12] rounded-xl text-xs text-slate-400 text-center">
                    Напоминаний пока нет.
                  </div>
                ) : (
                  reminderList.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 bg-white/[0.07] border border-white/[0.12] rounded-xl space-y-1.5"
                    >
                      <h4 className="font-bold text-white text-sm">{item.title}</h4>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {formatDateTime(item.when)} {item.done ? '• выполнено' : '• ждёт времени'}
                      </div>
                      <div className="flex gap-2 pt-1">
                        {!item.done && (
                          <button
                            type="button"
                            onClick={() => handleMarkReminderDone(item.id)}
                            className="bg-gradient-to-r from-slate-700 to-slate-800 text-white font-bold py-1.5 px-2.5 rounded-lg text-[11px] flex items-center gap-1 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>Готово</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteReminder(item.id)}
                          className="bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold py-1.5 px-2.5 rounded-lg text-[11px] flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Удалить</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

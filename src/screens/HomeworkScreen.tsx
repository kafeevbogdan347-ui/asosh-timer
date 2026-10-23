import React, { useState, useRef } from 'react';
import { HomeworkItem, LanguageType, SoundProfileType } from '../types';
import { DICT } from '../data/constants';
import { playSound, doVibro } from '../utils/audio';
import { Star, CheckCircle, Trash2, Plus, Sparkles, Filter, Camera, Image, X, Eye } from 'lucide-react';

interface HomeworkScreenProps {
  cls: string;
  homeworkList: HomeworkItem[];
  onAddHomework: (item: Omit<HomeworkItem, 'id' | 'createdAt'>) => void;
  onToggleHomework: (id: number) => void;
  onTogglePin: (id: number) => void;
  onDeleteHomework: (id: number) => void;
  lang: LanguageType;
  soundProfile: SoundProfileType;
  vibro: boolean;
  onOpenAi?: () => void;
}

export const HomeworkScreen: React.FC<HomeworkScreenProps> = ({
  cls,
  homeworkList,
  onAddHomework,
  onToggleHomework,
  onTogglePin,
  onDeleteHomework,
  lang,
  soundProfile,
  vibro,
  onOpenAi,
}) => {
  const [sub, setSub] = useState('');
  const [text, setText] = useState('');
  const [pinned, setPinned] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pinned' | 'active' | 'done'>('all');
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [previewModalImg, setPreviewModalImg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Grade simulator state
  const [gradeInput, setGradeInput] = useState('');

  const d = DICT[lang] || DICT.ru;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setPhotoUrl(base64);
        playSound('click', soundProfile);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sub.trim() || !text.trim()) return;

    onAddHomework({
      cls,
      sub: sub.trim(),
      text: text.trim(),
      done: false,
      pinned,
      photoUrl: photoUrl || undefined,
    });

    setSub('');
    setText('');
    setPinned(false);
    setPhotoUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    playSound('coin', soundProfile);
    doVibro(vibro, 20);
  };

  // Filter and sort homework (pinned always on top)
  const currentClassHw = homeworkList.filter((h) => h.cls === cls);

  const filteredHw = currentClassHw
    .filter((h) => {
      if (filter === 'pinned') return h.pinned;
      if (filter === 'active') return !h.done;
      if (filter === 'done') return h.done;
      return true;
    })
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return b.createdAt - a.createdAt;
    });

  // Accurate Grade Simulator calculation without hardcoded limit bugs
  const numbers = (gradeInput.match(/[1-5]/g) || []).map(Number);
  let avgText = 'Средний балл: —';
  let need4Text = 'До 4.00 (хорошо): —';
  let need5Text = 'До 4.60 (отлично): —';

  if (numbers.length > 0) {
    const curSum = numbers.reduce((a, b) => a + b, 0);
    const curCount = numbers.length;
    const avg = curSum / curCount;
    avgText = `Средний балл: ${avg.toFixed(2)} (Оценок: ${curCount})`;

    // Formula to reach threshold T:
    // (curSum + add * grade) / (curCount + add) >= T
    // curSum + add * grade >= T * curCount + T * add
    // add * (grade - T) >= T * curCount - curSum
    // add >= (T * curCount - curSum) / (grade - T)

    // Target 4 (threshold >= 3.60)
    if (avg >= 3.60) {
      need4Text = '🎉 Уже выходит уверенная четвёрка!';
    } else {
      const neededFours = Math.ceil((3.60 * curCount - curSum) / (4 - 3.60));
      need4Text = `До 4-ки нужно ещё четвёрок (4): +${Math.max(1, neededFours)} шт.`;
    }

    // Target 5 (threshold >= 4.60)
    if (avg >= 4.60) {
      need5Text = '🏆 Уже выходит твёрдая пятёрка!';
    } else {
      const neededFives = Math.ceil((4.60 * curCount - curSum) / (5 - 4.60));
      need5Text = `До 5-ки нужно ещё пятёрок (5): +${Math.max(1, neededFives)} шт.`;
    }
  }

  return (
    <div className="space-y-4 screen-enter">
      {/* Карточка добавления ДЗ */}
      <div className="card">
        <h2 className="text-xl font-black text-cyan-300 mb-3 flex items-center gap-2">
          <span>📘</span>
          <span>{d.hw} — {cls}</span>
        </h2>

        <form onSubmit={handleSubmit} className="space-y-2.5">
          <div>
            <label className="text-xs font-bold text-white/70">Предмет</label>
            <input
              type="text"
              value={sub}
              onChange={(e) => setSub(e.target.value)}
              placeholder={d.phsub}
              className="text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-white/70">Задание</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={d.phtask}
              className="text-sm"
              rows={2}
            />
          </div>

          {/* Прикрепление фото доски / тетради */}
          <div className="pt-1">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />

            {!photoUrl ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-dashed border-white/25 text-xs text-white/80 font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Camera className="w-4 h-4 text-cyan-400" />
                <span>📸 Прикрепить фото доски или тетради</span>
              </button>
            ) : (
              <div className="p-2.5 rounded-2xl bg-cyan-950/40 border border-cyan-400/40 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={photoUrl}
                    alt="Фото доски"
                    className="w-12 h-12 rounded-xl object-cover border border-white/20 shrink-0 cursor-pointer"
                    onClick={() => setPreviewModalImg(photoUrl)}
                    title="Нажмите для просмотра"
                  />
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-white block truncate">
                      Фото прикреплено 📷
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setPhotoUrl('');
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-red-500/20 text-white/60 hover:text-red-300 transition-colors"
                  title="Удалить фото"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 py-1">
            <input
              type="checkbox"
              id="pinCheck"
              checked={pinned}
              onChange={(e) => setPinned(e.target.checked)}
              className="w-5 h-5 accent-amber-400 cursor-pointer !mb-0"
            />
            <label htmlFor="pinCheck" className="text-xs font-bold text-amber-300 cursor-pointer !m-0 flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-amber-300" />
              <span>Закрепить сверху (Срочное ДЗ) ⭐</span>
            </label>
          </div>

          <button type="submit" className="btn green justify-center text-sm py-3 mt-1">
            <Plus className="w-4 h-4" />
            <span>{d.addhw}</span>
          </button>
        </form>

        {/* Фильтры */}
        <div className="flex flex-wrap gap-1.5 mt-5 mb-2 border-t border-white/10 pt-3">
          <button
            type="button"
            className={`choice !py-1 !px-3 text-xs font-bold ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            Все ({currentClassHw.length})
          </button>
          <button
            type="button"
            className={`choice !py-1 !px-3 text-xs font-bold ${filter === 'pinned' ? 'active !bg-amber-400 !text-slate-950 border-amber-400' : ''}`}
            onClick={() => setFilter('pinned')}
          >
            ⭐ Закрепленные
          </button>
          <button
            type="button"
            className={`choice !py-1 !px-3 text-xs font-bold ${filter === 'active' ? 'active' : ''}`}
            onClick={() => setFilter('active')}
          >
            В процессе
          </button>
          <button
            type="button"
            className={`choice !py-1 !px-3 text-xs font-bold ${filter === 'done' ? 'active' : ''}`}
            onClick={() => setFilter('done')}
          >
            Выполненные
          </button>
        </div>

        {/* Список ДЗ */}
        <div className="space-y-2 mt-2">
          {filteredHw.length > 0 ? (
            filteredHw.map((item) => (
              <div
                key={item.id}
                className={`flex items-start justify-between p-3.5 rounded-2xl border transition-all ${
                  item.done
                    ? 'bg-white/5 border-white/10 opacity-60'
                    : item.pinned
                    ? 'bg-amber-500/15 border-amber-400/50 shadow-md'
                    : 'bg-white/10 border-white/15'
                }`}
              >
                <div className="flex items-start gap-3 flex-1 pr-2">
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={() => onToggleHomework(item.id)}
                    className="w-5 h-5 mt-0.5 accent-emerald-400 cursor-pointer flex-shrink-0"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <b className={`text-sm text-white ${item.done ? 'line-through' : ''}`}>
                        {item.sub}
                      </b>
                      {item.pinned && (
                        <span className="badge bg-amber-400/20 text-amber-300 border-amber-400/40 text-[9px] py-0.5 px-1.5">
                          ⭐ СРОЧНО
                        </span>
                      )}
                    </div>
                    <div className={`text-xs text-white/80 mt-0.5 whitespace-pre-line ${item.done ? 'line-through' : ''}`}>
                      {item.text}
                    </div>

                    {item.photoUrl && (
                      <div className="mt-2 flex items-center gap-2">
                        <img
                          src={item.photoUrl}
                          alt="Фото доски"
                          className="w-12 h-12 rounded-xl object-cover border border-white/25 cursor-pointer hover:scale-105 transition-transform shrink-0"
                          onClick={() => setPreviewModalImg(item.photoUrl!)}
                        />
                        <button
                          type="button"
                          onClick={() => setPreviewModalImg(item.photoUrl!)}
                          className="text-[11px] text-cyan-300 flex items-center gap-1 font-bold hover:underline cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Фото доски 📷</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => onTogglePin(item.id)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      item.pinned ? 'text-amber-300 hover:text-amber-400' : 'text-white/40 hover:text-white/80'
                    }`}
                    title={item.pinned ? 'Открепить' : 'Закрепить'}
                  >
                    <Star className={`w-4 h-4 ${item.pinned ? 'fill-amber-300' : ''}`} />
                  </button>

                  <button
                    type="button"
                    onClick={() => onDeleteHomework(item.id)}
                    className="p-1.5 text-red-400 hover:text-red-300"
                    title="Удалить"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-6 text-white/60 text-xs">
              Нет домашних заданий по выбранному фильтру 🎉
            </div>
          )}
        </div>
      </div>

      {/* Симулятор оценок */}
      <div className="card">
        <h2 className="text-lg font-black text-cyan-300 mb-2 flex items-center gap-2">
          <span>🎯</span>
          <span>{d.sim}</span>
        </h2>
        <label className="text-xs font-bold text-white/70">
          Введи текущие оценки (через пробел, например: 5 4 3 4 5)
        </label>
        <input
          type="text"
          value={gradeInput}
          onChange={(e) => setGradeInput(e.target.value)}
          placeholder={d.phgrades}
          className="text-sm font-mono"
        />

        <div className="space-y-1.5 mt-2">
          <div className="cleanNext text-cyan-300 font-black text-sm">{avgText}</div>
          <div className="cleanNext text-amber-200 text-xs font-semibold">{need4Text}</div>
          <div className="cleanNext text-emerald-200 text-xs font-semibold">{need5Text}</div>
        </div>
      </div>

      {/* Lightbox Modal for Photo */}
      {previewModalImg && (
        <div
          className="fixed inset-0 z-[10005] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3"
          onClick={() => setPreviewModalImg(null)}
        >
          <div className="relative max-w-xl w-full max-h-[90vh] flex flex-col items-center">
            <button
              type="button"
              onClick={() => setPreviewModalImg(null)}
              className="absolute -top-10 right-0 p-2 text-white/80 hover:text-white bg-white/10 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={previewModalImg}
              alt="Фото доски"
              className="max-h-[85vh] w-auto max-w-full rounded-2xl border border-white/20 shadow-2xl object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
};

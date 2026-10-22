import React, { useState } from 'react';
import { PortfolioItem, LanguageType, SoundProfileType } from '../types';
import { playSound, doVibro } from '../utils/audio';
import { 
  Trophy, 
  Award, 
  Medal, 
  Plus, 
  Trash2, 
  GraduationCap, 
  CheckCircle, 
  Sparkles, 
  Download, 
  Star,
  FileCheck2
} from 'lucide-react';

interface PortfolioScreenProps {
  lang: LanguageType;
  soundProfile: SoundProfileType;
  vibro: boolean;
  onShowToast: (msg: string) => void;
  onUnlockAchievement?: (id: string) => void;
}

export const PortfolioScreen: React.FC<PortfolioScreenProps> = ({
  lang,
  soundProfile,
  vibro,
  onShowToast,
  onUnlockAchievement,
}) => {
  const [items, setItems] = useState<PortfolioItem[]>(() => {
    const saved = localStorage.getItem('asosh_portfolio_items');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return [
      {
        id: '1',
        title: 'Всероссийская олимпиада школьников по математике (Школьный этап)',
        level: 'school',
        category: 'olympiad',
        year: '2025–2026',
        place: '1',
        subject: 'Математика',
        extraScoreBonus: 2,
      },
      {
        id: '2',
        title: 'Нормативы ВФСК «ГТО» IV ступень (Золотой знак отличия)',
        level: 'district',
        category: 'gto',
        year: '2025',
        place: 'gold',
        extraScoreBonus: 3,
      },
      {
        id: '3',
        title: 'Школьный научно-практический проект «Экология родного края»',
        level: 'school',
        category: 'science',
        year: '2025',
        place: '2',
        extraScoreBonus: 1,
      },
    ];
  });

  const [title, setTitle] = useState('');
  const [level, setLevel] = useState<'school' | 'district' | 'regional' | 'all-russian'>('school');
  const [category, setCategory] = useState<'olympiad' | 'sport' | 'science' | 'art' | 'gto'>('olympiad');
  const [year, setYear] = useState('2025–2026');
  const [place, setPlace] = useState<'1' | '2' | '3' | 'participant' | 'gold' | 'silver'>('1');
  const [bonus, setBonus] = useState('2');

  const saveItems = (newItems: PortfolioItem[]) => {
    setItems(newItems);
    localStorage.setItem('asosh_portfolio_items', JSON.stringify(newItems));
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    playSound('bell', soundProfile);
    doVibro(vibro, 30);

    const newItem: PortfolioItem = {
      id: Date.now().toString(),
      title: title.trim(),
      level,
      category,
      year,
      place,
      extraScoreBonus: Number(bonus) || 1,
    };

    saveItems([newItem, ...items]);
    setTitle('');
    onShowToast('🏆 Достижение успешно добавлено в портфолио!');
    onUnlockAchievement?.('dev_unlocked');
  };

  const handleDelete = (id: string) => {
    playSound('warn', soundProfile);
    doVibro(vibro, 20);
    saveItems(items.filter((it) => it.id !== id));
    onShowToast('Удалено из портфолио');
  };

  const totalBonusPoints = items.reduce((acc, curr) => acc + (curr.extraScoreBonus || 0), 0);

  const getPlaceBadge = (p: string) => {
    if (p === '1' || p === 'gold') return { label: '🥇 1 Место / Золото', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' };
    if (p === '2' || p === 'silver') return { label: '🥈 2 Место / Серебро', color: 'bg-slate-300/20 text-slate-200 border-slate-400/40' };
    if (p === '3') return { label: '🥉 3 Место', color: 'bg-amber-600/20 text-amber-300 border-amber-600/40' };
    return { label: '🎖️ Участник / Призёр', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' };
  };

  return (
    <div className="card screen-enter space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 text-slate-950 shadow-lg">
              <Trophy className="w-5 h-5 font-black" />
            </span>
            <h2 className="text-xl font-black text-yellow-300">
              Школьное Портфолио & ВсОШ / ГТО
            </h2>
          </div>
          <p className="text-xs text-white/70 mt-1">
            Учёт олимпиад, спортивных достижений, ГТО и калькулятор дополнительных баллов к поступлению
          </p>
        </div>
        <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/40 px-3 py-1.5 rounded-2xl">
          <GraduationCap className="w-4 h-4 text-yellow-400" />
          <div className="text-xs">
            <span className="text-white/70">Бонус к поступлению: </span>
            <strong className="text-yellow-300 text-sm font-black">+{totalBonusPoints} баллов</strong>
          </div>
        </div>
      </div>

      {/* Add Achievement Form */}
      <div className="p-4 bg-white/6 rounded-2xl border border-white/12 space-y-3">
        <b className="text-sm text-cyan-300 flex items-center gap-2">
          <Plus className="w-4 h-4 text-cyan-400" />
          <span>Добавить новую грамоту или олимпиаду</span>
        </b>

        <form onSubmit={handleAddItem} className="space-y-3 text-sm">
          <div>
            <label className="text-xs text-white/70 block mb-1 font-semibold">Название мероприятия / Олимпиады</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: Победитель Муниципального этапа ВсОШ по физике"
              className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-xl text-white outline-none focus:border-cyan-400"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="text-xs text-white/70 block mb-1 font-semibold">Уровень</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as any)}
                className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-xl text-white outline-none focus:border-cyan-400"
              >
                <option value="school">🏫 Школьный</option>
                <option value="district">🏛️ Муниципальный / Районный</option>
                <option value="regional">🌐 Региональный / Республиканский</option>
                <option value="all-russian">🇷🇺 Всероссийский / Международный</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-white/70 block mb-1 font-semibold">Категория</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-xl text-white outline-none focus:border-cyan-400"
              >
                <option value="olympiad">🧠 Олимпиада / Конкурс</option>
                <option value="gto">🏅 Знак отличия ГТО</option>
                <option value="sport">⚽ Спортивный турнир</option>
                <option value="science">🔬 Научный проект</option>
                <option value="art">🎨 Творчество / Музыка</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-white/70 block mb-1 font-semibold">Результат / Место</label>
              <select
                value={place}
                onChange={(e) => setPlace(e.target.value as any)}
                className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-xl text-white outline-none focus:border-cyan-400"
              >
                <option value="1">🥇 1 место (Победитель)</option>
                <option value="2">🥈 2 место (Призёр)</option>
                <option value="3">🥉 3 место (Призёр)</option>
                <option value="gold">🏆 Золотой знак (ГТО)</option>
                <option value="silver">🥈 Серебряный знак (ГТО)</option>
                <option value="participant">📜 Сертификат участника</option>
              </select>
            </div>
          </div>

          <button type="submit" className="btn green flex items-center justify-center gap-2 py-3 shadow-lg">
            <Plus className="w-4 h-4" />
            <span>Сохранить в личное портфолио</span>
          </button>
        </form>
      </div>

      {/* List of Portfolio Items */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold text-white/80 uppercase tracking-wider">
          Список наград и грамот ({items.length})
        </h4>

        {items.length === 0 ? (
          <div className="p-8 text-center bg-white/5 rounded-2xl border border-white/10 text-white/60 text-xs">
            Портфолио пока пусто. Добавьте свои первые олимпиады и достижения выше!
          </div>
        ) : (
          items.map((item) => {
            const badge = getPlaceBadge(item.place);
            return (
              <div
                key={item.id}
                className="p-3.5 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-yellow-500/20 text-yellow-300 shrink-0 mt-0.5">
                    <Award className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs sm:text-sm font-black text-white leading-tight">
                      {item.title}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/70">
                      <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold ${badge.color}`}>
                        {badge.label}
                      </span>
                      <span>•</span>
                      <span>{item.year}</span>
                      {item.extraScoreBonus ? (
                        <>
                          <span>•</span>
                          <span className="text-emerald-300 font-bold">+{item.extraScoreBonus} балла к поступлению</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors"
                    title="Удалить"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

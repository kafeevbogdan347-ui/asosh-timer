import React, { useState, useEffect } from 'react';
import { BackpackItem, LanguageType, SoundProfileType } from '../types';
import { DEFAULT_MANUAL_BACKPACK } from '../data/constants';
import { playSound, doVibro } from '../utils/audio';
import { CheckCircle2, Circle, Plus, Trash2, RotateCcw } from 'lucide-react';

interface BackpackScreenProps {
  tomorrowLessons: [string, string][];
  lang: LanguageType;
  soundProfile: SoundProfileType;
  vibro: boolean;
}

export const BackpackScreen: React.FC<BackpackScreenProps> = ({
  tomorrowLessons,
  soundProfile,
  vibro,
}) => {
  const [items, setItems] = useState<BackpackItem[]>([]);
  const [customText, setCustomText] = useState('');

  // Load and sync backpack items based on tomorrow's lessons
  useEffect(() => {
    const saved = localStorage.getItem('asosh_backpack_items_v11') || localStorage.getItem('asosh_backpack_items_v105');
    const checkedMap: Record<string, boolean> = {};

    if (saved) {
      try {
        const parsed: BackpackItem[] = JSON.parse(saved);
        parsed.forEach((it) => {
          checkedMap[it.name] = it.checked;
        });
      } catch {
        // ignore
      }
    }

    const newItems: BackpackItem[] = [];

    // 1. Auto items from tomorrow's lessons
    const uniqueSubs: string[] = Array.from(new Set(tomorrowLessons.map((l) => l[0].trim()))).filter((s): s is string => Boolean(s) && s !== '—');
    uniqueSubs.forEach((sub: string) => {
      let itemName = `Учебник и тетрадь: ${sub}`;
      const lower = sub.toLowerCase();
      if (lower.includes('физ')) {
        itemName = `👟 Спортивная форма и кроссовки (${sub})`;
      } else if (lower.includes('геом') || lower.includes('черч')) {
        itemName = `📐 Линейка, циркуль, тетрадь: ${sub}`;
      } else if (lower.includes('информ')) {
        itemName = `💻 Тетрадь/флешка: ${sub}`;
      } else if (lower.includes('англ') || lower.includes('нем') || lower.includes('башк') || lower.includes('яз')) {
        itemName = `📖 Учебник и словарь: ${sub}`;
      } else if (lower.includes('хим') || lower.includes('физ')) {
        itemName = `🧪 Учебник, тетрадь и калькулятор: ${sub}`;
      }

      newItems.push({
        id: `auto-${sub}`,
        name: itemName,
        category: 'auto',
        checked: !!checkedMap[itemName],
      });
    });

    // 2. Default manual essentials
    DEFAULT_MANUAL_BACKPACK.forEach((name, idx) => {
      newItems.push({
        id: `manual-${idx}`,
        name,
        category: 'manual',
        checked: !!checkedMap[name],
      });
    });

    // 3. Custom user items
    if (saved) {
      try {
        const parsed: BackpackItem[] = JSON.parse(saved);
        parsed
          .filter((it) => it.isCustom)
          .forEach((it) => {
            newItems.push(it);
          });
      } catch {
        // ignore
      }
    }

    setItems(newItems);
  }, [tomorrowLessons]);

  const saveBackpack = (updated: BackpackItem[]) => {
    setItems(updated);
    localStorage.setItem('asosh_backpack_items_v11', JSON.stringify(updated));
  };

  const toggleItem = (id: string) => {
    const updated = items.map((it) => {
      if (it.id === id) {
        const nextState = !it.checked;
        if (nextState) {
          playSound('coin', soundProfile);
        } else {
          playSound('click', soundProfile);
        }
        doVibro(vibro, 15);
        return { ...it, checked: nextState };
      }
      return it;
    });
    saveBackpack(updated);
  };

  const addCustomItem = () => {
    if (!customText.trim()) return;
    const newItem: BackpackItem = {
      id: `custom-${Date.now()}`,
      name: customText.trim(),
      category: 'manual',
      checked: false,
      isCustom: true,
    };
    const updated = [...items, newItem];
    saveBackpack(updated);
    setCustomText('');
    playSound('star', soundProfile);
    doVibro(vibro, 20);
  };

  const deleteCustomItem = (id: string) => {
    const updated = items.filter((it) => it.id !== id);
    saveBackpack(updated);
    playSound('settings', soundProfile);
  };

  const resetAll = () => {
    const updated = items.map((it) => ({ ...it, checked: false }));
    saveBackpack(updated);
    playSound('settings', soundProfile);
  };

  const checkAll = () => {
    const updated = items.map((it) => ({ ...it, checked: true }));
    saveBackpack(updated);
    playSound('pomodoro', soundProfile);
  };

  const totalCount = items.length;
  const checkedCount = items.filter((it) => it.checked).length;
  const percent = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  return (
    <div className="card screen-enter space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black text-cyan-300 flex items-center gap-2">
            <span>🎒</span>
            <span>Чек-лист портфеля на завтра</span>
          </h2>
          <p className="text-xs text-white/70">
            Автоматический список учебников по расписанию и нужные вещи
          </p>
        </div>
      </div>

      {/* Прогресс-бар сборки */}
      <div className="bg-white/10 p-3.5 rounded-2xl border border-white/15">
        <div className="flex justify-between items-center text-xs font-bold mb-1.5">
          <span>Собрано: {checkedCount} из {totalCount} ({percent}%)</span>
          {percent === 100 ? (
            <span className="text-green-400 font-black">Портфель собран! 🌟</span>
          ) : (
            <span className="text-cyan-300">Собираем...</span>
          )}
        </div>
        <div className="w-full bg-black/40 h-3 rounded-full overflow-hidden border border-white/10">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              percent === 100 ? 'bg-gradient-to-r from-emerald-400 to-green-500' : 'bg-gradient-to-r from-cyan-400 to-blue-500'
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          className="btn green text-xs py-2 justify-center flex-1"
          onClick={checkAll}
        >
          ✓ Отметить всё
        </button>
        <button
          type="button"
          className="btn darkBtn text-xs py-2 justify-center flex-1"
          onClick={resetAll}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Сбросить</span>
        </button>
      </div>

      {/* Добавление своего предмета */}
      <div className="flex gap-2 items-center">
        <input
          type="text"
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addCustomItem()}
          placeholder="Добавить свою вещь (напр. доклад, циркуль)..."
          className="!mb-0 text-sm"
        />
        <button
          type="button"
          className="p-3 bg-cyan-500/20 border border-cyan-400 text-cyan-300 rounded-2xl hover:bg-cyan-500/30 active:scale-95"
          onClick={addCustomItem}
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Список предметов */}
      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            onClick={() => toggleItem(item.id)}
            className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer select-none ${
              item.checked
                ? 'bg-emerald-500/15 border-emerald-500/40 text-white/60 line-through'
                : 'bg-white/8 border-white/15 text-white hover:bg-white/12'
            }`}
          >
            <div className="flex items-center gap-3 pr-2">
              {item.checked ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              ) : (
                <Circle className="w-5 h-5 text-white/50 flex-shrink-0" />
              )}
              <span className="text-sm font-semibold">{item.name}</span>
            </div>

            {item.isCustom && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteCustomItem(item.id);
                }}
                className="p-1 text-red-400 hover:text-red-300"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

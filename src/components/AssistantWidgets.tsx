import React, { useEffect, useRef, useState } from 'react';
import {
  Backpack,
  BookOpen,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flame,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react';
import type { AssistantWidget } from '../services/assistant';
import type { BackpackItem, ScreenId, SoundProfileType } from '../types';
import { playSound, doVibro } from '../utils/audio';

interface WidgetProps {
  widget: AssistantWidget;
  soundProfile: SoundProfileType;
  vibro: boolean;
  onUpdateWidget: (updated: AssistantWidget) => void;
  onOpenScreen?: (screen: ScreenId) => void;
  onAskFollowup?: (prompt: string) => void;
  onHappy?: () => void;
}

export const AssistantWidgetCard: React.FC<WidgetProps> = (props) => {
  const { widget } = props;
  if (widget.kind === 'day_plan') return <DayPlanWidget {...props} widget={widget} />;
  if (widget.kind === 'backpack') return <BackpackWidget {...props} widget={widget} />;
  if (widget.kind === 'pomodoro') return <PomodoroWidget {...props} widget={widget} />;
  if (widget.kind === 'formulas') return <FormulasWidget {...props} widget={widget} />;
  if (widget.kind === 'quiz') return <StudyQuizWidget {...props} widget={widget} />;
  if (widget.kind === 'flashcards') return <FlashcardsWidget {...props} widget={widget} />;
  return null;
};

const DayPlanWidget: React.FC<WidgetProps & { widget: Extract<AssistantWidget, { kind: 'day_plan' }> }> = ({
  widget,
  onOpenScreen,
  onAskFollowup,
}) => (
  <div className="asoshik-widget">
    <div className="flex items-start justify-between gap-2">
      <div>
        <div className="text-sm font-black text-white">{widget.greeting}</div>
        <div className="text-[11px] font-semibold text-white/65 mt-0.5 tabular-nums">
          {widget.nowText}
          {widget.nextBellText ? ` · ${widget.nextBellText}` : ''}
        </div>
      </div>
      <Calendar className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" />
    </div>

    {widget.lessons.length > 0 && (
      <div className="mt-2.5 divide-y divide-white/10 border-t border-white/10 pt-1">
        {widget.lessons.slice(0, 7).map((l) => (
          <div
            key={`${l.num}-${l.time}`}
            className={`py-1.5 flex items-center justify-between gap-2 text-xs ${
              l.isCurrent || l.isNext ? 'text-[var(--accent)] font-bold' : 'text-white/85'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="tabular-nums text-white/50 w-5 shrink-0">{l.num}.</span>
              <span className="truncate">
                {l.isCurrent ? '▶ ' : l.isNext ? '→ ' : ''}
                {l.sub}
              </span>
            </div>
            <div className="tabular-nums text-[11px] text-white/60 shrink-0">
              {l.room ? `каб. ${l.room} · ` : ''}
              {l.time}
            </div>
          </div>
        ))}
      </div>
    )}

    {(widget.urgentHw.length > 0 || widget.tests.length > 0 || widget.weakSubjects.length > 0) && (
      <div className="mt-2.5 pt-2 border-t border-white/10 space-y-1.5 text-xs">
        {widget.tests.length > 0 && (
          <div className="text-amber-300 font-semibold">Контрольные: {widget.tests.join(' · ')}</div>
        )}
        {widget.urgentHw.length > 0 && (
          <div className="text-white/80">ДЗ на очереди: {widget.urgentHw.slice(0, 4).join(' · ')}</div>
        )}
        {widget.weakSubjects.length > 0 && (
          <div className="text-cyan-200">Подтянуть оценки: {widget.weakSubjects.join(' · ')}</div>
        )}
      </div>
    )}

    {widget.quarterNote && (
      <div className="mt-2 text-[11px] text-white/55 tabular-nums">{widget.quarterNote}</div>
    )}

    <div className="mt-2.5 flex flex-wrap gap-2">
      {onOpenScreen && (
        <>
          <button type="button" className="asoshik-wbtn" onClick={() => onOpenScreen('schedule')}>
            Расписание
          </button>
          <button type="button" className="asoshik-wbtn" onClick={() => onOpenScreen('homework')}>
            ДЗ
          </button>
        </>
      )}
      {onAskFollowup && (
        <button
          type="button"
          className="asoshik-wbtn accent"
          onClick={() => onAskFollowup('Собери портфель на завтра и проверь, что повторить к урокам')}
        >
          Собрать портфель
        </button>
      )}
    </div>
  </div>
);

const BackpackWidget: React.FC<WidgetProps & { widget: Extract<AssistantWidget, { kind: 'backpack' }> }> = ({
  widget,
  soundProfile,
  vibro,
  onUpdateWidget,
  onOpenScreen,
}) => {
  const doneCount = widget.items.filter((i) => i.checked).length;
  const total = widget.items.length;

  const toggle = (id: string) => {
    let becameChecked = false;
    const nextItems = widget.items.map((it) => {
      if (it.id !== id) return it;
      becameChecked = !it.checked;
      return { ...it, checked: !it.checked };
    });

    if (becameChecked) {
      playSound('coin', soundProfile);
      doVibro(vibro, 15);
    } else {
      playSound('click', soundProfile);
    }

    onUpdateWidget({ ...widget, items: nextItems });

    try {
      const saved = localStorage.getItem('asosh_backpack_items_v11');
      localStorage.setItem('asosh_backpack_date', widget.forDate);
      if (saved) {
        const parsed = JSON.parse(saved) as BackpackItem[];
        const map = new Map(nextItems.map((x) => [x.name, x.checked]));
        const synced = parsed.map((x) => (map.has(x.name) ? { ...x, checked: Boolean(map.get(x.name)) } : x));
        localStorage.setItem('asosh_backpack_items_v11', JSON.stringify(synced));
      } else {
        const fresh: BackpackItem[] = nextItems.map((x) => ({
          id: x.id,
          name: x.name,
          category: x.category === 'manual' ? 'manual' : 'auto',
          checked: x.checked,
        }));
        localStorage.setItem('asosh_backpack_items_v11', JSON.stringify(fresh));
      }
    } catch {
      // ignore storage errors
    }
  };

  return (
    <div className="asoshik-widget">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-sm font-black text-white flex items-center gap-1.5">
            <Backpack className="w-4 h-4 text-[var(--accent)]" />
            <span>Портфель · {widget.dayLabel}</span>
          </div>
          <div className="text-[11px] text-white/60 tabular-nums mt-0.5">
            Собрано {doneCount} из {total}
          </div>
        </div>
        {onOpenScreen && (
          <button type="button" className="asoshik-wbtn" onClick={() => onOpenScreen('backpack')}>
            Открыть всё
          </button>
        )}
      </div>

      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mt-2">
        <div
          className="h-full bg-[var(--accent)] transition-all duration-200"
          style={{ width: `${total ? Math.round((doneCount / total) * 100) : 0}%` }}
        />
      </div>

      <div className="mt-2 divide-y divide-white/10">
        {widget.items.map((it) => (
          <button
            key={it.id}
            type="button"
            onClick={() => toggle(it.id)}
            className="w-full min-h-[44px] py-1.5 flex items-center gap-2.5 text-left text-xs cursor-pointer"
          >
            <span
              className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                it.checked
                  ? 'bg-[var(--accent)] border-[var(--accent)] text-slate-950'
                  : 'border-white/30 text-transparent'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
            </span>
            <span className={it.checked ? 'line-through text-white/45' : 'text-white/90'}>{it.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

const PomodoroWidget: React.FC<WidgetProps & { widget: Extract<AssistantWidget, { kind: 'pomodoro' }> }> = ({
  widget,
  soundProfile,
  vibro,
  onOpenScreen,
  onHappy,
}) => {
  const [phase, setPhase] = useState<'work' | 'break'>('work');
  const [minutes, setMinutes] = useState(widget.focusMin || 25);
  const [leftSec, setLeftSec] = useState((widget.focusMin || 25) * 60);
  const [running, setRunning] = useState(false);
  const endRef = useRef<number>(0);

  useEffect(() => {
    if (!running) return;
    endRef.current = Date.now() + leftSec * 1000;
    const id = setInterval(() => {
      const rem = Math.max(0, Math.ceil((endRef.current - Date.now()) / 1000));
      setLeftSec(rem);
      if (rem === 0) {
        clearInterval(id);
        setRunning(false);
        playSound('pomodoro', soundProfile);
        doVibro(vibro, 80);
        if (phase === 'work') {
          try {
            const cur = Number(localStorage.getItem('asosh_tomatoes_v11') || '0') || 0;
            localStorage.setItem('asosh_tomatoes_v11', String(cur + 1));
          } catch {
            // ignore
          }
          onHappy?.();
          setPhase('break');
          setMinutes(widget.breakMin || 5);
          setLeftSec((widget.breakMin || 5) * 60);
        } else {
          setPhase('work');
          setMinutes(widget.focusMin || 25);
          setLeftSec((widget.focusMin || 25) * 60);
        }
      }
    }, 500);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, phase]);

  const mm = String(Math.floor(leftSec / 60)).padStart(2, '0');
  const ss = String(leftSec % 60).padStart(2, '0');

  const pickPreset = (m: number, nextPhase: 'work' | 'break') => {
    setRunning(false);
    setPhase(nextPhase);
    setMinutes(m);
    setLeftSec(m * 60);
    playSound('click', soundProfile);
  };

  return (
    <div className="asoshik-widget">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Flame className="w-4 h-4 text-[var(--accent)] shrink-0" />
          <span className="text-sm font-black text-white truncate">
            {phase === 'work' ? `Фокус: ${widget.subject}` : 'Перерыв'}
          </span>
        </div>
        <span className="text-2xl font-black text-[var(--accent)] tabular-nums">
          {mm}:{ss}
        </span>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="asoshik-wbtn accent"
          onClick={() => {
            playSound('click', soundProfile);
            setRunning((r) => !r);
          }}
        >
          {running ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          <span>{running ? 'Пауза' : 'Старт'}</span>
        </button>
        <button
          type="button"
          className="asoshik-wbtn"
          onClick={() => pickPreset(minutes, phase)}
          aria-label="Сброс таймера"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Сброс</span>
        </button>
        {[15, 25, 45].map((m) => (
          <button
            key={m}
            type="button"
            className={`asoshik-wbtn tabular-nums ${phase === 'work' && minutes === m ? 'active' : ''}`}
            onClick={() => pickPreset(m, 'work')}
          >
            {m}м
          </button>
        ))}
        {onOpenScreen && (
          <button type="button" className="asoshik-wbtn ml-auto" onClick={() => onOpenScreen('pomodoro')}>
            <Clock className="w-3.5 h-3.5" />
            <span>Экран</span>
          </button>
        )}
      </div>
    </div>
  );
};

const FormulasWidget: React.FC<WidgetProps & { widget: Extract<AssistantWidget, { kind: 'formulas' }> }> = ({
  widget,
  onOpenScreen,
  onAskFollowup,
}) => (
  <div className="asoshik-widget space-y-2.5">
    <div className="flex items-center justify-between gap-2">
      <div className="text-sm font-black text-white flex items-center gap-1.5">
        <BookOpen className="w-4 h-4 text-[var(--accent)]" />
        <span>Справочник: {widget.query}</span>
      </div>
      {onOpenScreen && (
        <button type="button" className="asoshik-wbtn" onClick={() => onOpenScreen('formulas')}>
          Все формулы
        </button>
      )}
    </div>

    {widget.cards.map((c) => (
      <div key={c.id} className="pt-2 border-t border-white/10 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-bold text-white">{c.title}</div>
          {onAskFollowup && (
            <button
              type="button"
              className="asoshik-wbtn"
              onClick={() => onAskFollowup(`Разбери на простом примере формулу: ${c.title}`)}
            >
              Пример
            </button>
          )}
        </div>
        <pre className="text-xs font-mono text-[var(--accent)] whitespace-pre-wrap leading-relaxed bg-black/25 rounded-xl px-2.5 py-2 border border-white/10">
          {c.formula}
        </pre>
        <div className="text-xs text-white/75 leading-snug">{c.description}</div>
        {c.note && <div className="text-[11px] text-white/55">{c.note}</div>}
      </div>
    ))}

    {widget.elements && widget.elements.length > 0 && (
      <div className="pt-2 border-t border-white/10 space-y-1.5">
        {widget.elements.map((el) => (
          <div key={el.number} className="text-xs text-white/85 tabular-nums flex flex-wrap items-center justify-between gap-2">
            <b>
              {el.number}. {el.nameRu} ({el.symbol})
            </b>
            <span className="text-white/60">
              {el.mass} а.е.м. · период {el.period} · группа {el.group}
            </span>
          </div>
        ))}
      </div>
    )}
  </div>
);

const StudyQuizWidget: React.FC<WidgetProps & { widget: Extract<AssistantWidget, { kind: 'quiz' }> }> = ({
  widget,
  soundProfile,
  vibro,
  onUpdateWidget,
  onAskFollowup,
  onHappy,
}) => {
  const answered = widget.questions.filter((q) => typeof q.picked === 'number').length;
  const correctCount = widget.questions.filter((q) => q.picked === q.correct).length;
  const wrongQuestions = widget.questions.filter((q) => typeof q.picked === 'number' && q.picked !== q.correct);

  const pickAnswer = (qIdx: number, optIdx: number) => {
    const target = widget.questions[qIdx];
    if (!target || typeof target.picked === 'number') return;
    const isOk = optIdx === target.correct;
    playSound(isOk ? 'coin' : 'click', soundProfile);
    doVibro(vibro, isOk ? 15 : 30);

    const nextQuestions = widget.questions.map((q, i) => (i === qIdx ? { ...q, picked: optIdx } : q));
    onUpdateWidget({ ...widget, questions: nextQuestions });

    const nextAnswered = nextQuestions.filter((q) => typeof q.picked === 'number').length;
    const nextCorrect = nextQuestions.filter((q) => q.picked === q.correct).length;
    if (nextAnswered === nextQuestions.length && nextCorrect >= Math.ceil(nextQuestions.length / 2)) {
      onHappy?.();
    }
  };

  return (
    <div className="asoshik-widget space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-black text-white flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-[var(--accent)]" />
          <span>Мини-тест: {widget.topic}</span>
        </div>
        <span className="text-xs font-bold text-white/70 tabular-nums">
          {answered}/{widget.questions.length} · ✓ {correctCount}
        </span>
      </div>

      {widget.questions.map((item, qi) => {
        const isAnswered = typeof item.picked === 'number';
        const isRight = item.picked === item.correct;
        return (
          <div key={qi} className="pt-2.5 border-t border-white/10 space-y-2">
            <div className="text-xs font-bold text-white">
              {qi + 1}. {item.q}
            </div>
            <div className="grid gap-1.5">
              {item.options.map((opt, oi) => {
                const chosen = item.picked === oi;
                const rightOpt = item.correct === oi;
                let cls = 'asoshik-quiz-opt';
                if (isAnswered && rightOpt) cls += ' ok';
                else if (isAnswered && chosen && !rightOpt) cls += ' err';
                return (
                  <button
                    key={oi}
                    type="button"
                    disabled={isAnswered}
                    onClick={() => pickAnswer(qi, oi)}
                    className={cls}
                  >
                    <span className="flex-1 text-left">{opt}</span>
                    {isAnswered && rightOpt && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold shrink-0">
                        <Check className="w-3.5 h-3.5" /> Верно
                      </span>
                    )}
                    {isAnswered && chosen && !rightOpt && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold shrink-0">
                        <X className="w-3.5 h-3.5" /> Ошибка
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {isAnswered && (
              <div className={`text-[11px] leading-snug ${isRight ? 'text-emerald-300' : 'text-amber-200'}`}>
                {isRight ? '✓ ' : '✕ '}
                {item.explanation}
              </div>
            )}
          </div>
        );
      })}

      {answered === widget.questions.length && onAskFollowup && (
        <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold text-white tabular-nums">
            Итог: {correctCount} из {widget.questions.length}
          </span>
          {wrongQuestions.length > 0 ? (
            <button
              type="button"
              className="asoshik-wbtn accent"
              onClick={() =>
                onAskFollowup(
                  `Разбери подробно ошибки из теста по теме «${widget.topic}»: ${wrongQuestions
                    .map((w) => w.q)
                    .join('; ')}`
                )
              }
            >
              Разобрать ошибки
            </button>
          ) : (
            <button
              type="button"
              className="asoshik-wbtn accent"
              onClick={() => onAskFollowup(`Сделай ещё 3 вопроса посложнее по теме «${widget.topic}»`)}
            >
              Ещё сложнее
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const FlashcardsWidget: React.FC<WidgetProps & { widget: Extract<AssistantWidget, { kind: 'flashcards' }> }> = ({
  widget,
  soundProfile,
  onUpdateWidget,
  onHappy,
}) => {
  const [idx, setIdx] = useState(0);
  const total = widget.cards.length;
  const card = widget.cards[idx];
  if (!card) return null;
  const knownCount = widget.cards.filter((c) => c.known).length;

  const flip = () => {
    playSound('click', soundProfile);
    const next = widget.cards.map((c, i) => (i === idx ? { ...c, flipped: !c.flipped } : c));
    onUpdateWidget({ ...widget, cards: next });
  };

  const markKnown = (known: boolean) => {
    playSound(known ? 'coin' : 'click', soundProfile);
    const next = widget.cards.map((c, i) => (i === idx ? { ...c, known, flipped: false } : c));
    onUpdateWidget({ ...widget, cards: next });
    if (known && next.every((c) => c.known)) onHappy?.();
    if (idx < total - 1) setIdx(idx + 1);
  };

  return (
    <div className="asoshik-widget space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-black text-white">Карточки: {widget.topic}</div>
        <div className="text-xs text-white/65 tabular-nums">
          {idx + 1}/{total} · Знаю {knownCount}
        </div>
      </div>

      <button type="button" onClick={flip} className="asoshik-flashcard">
        <span className="text-[10px] font-bold text-[var(--accent)]">
          {card.flipped ? 'Ответ · нажми, чтобы скрыть' : 'Вопрос · нажми, чтобы перевернуть'}
        </span>
        <span className="text-sm font-bold text-white leading-snug">{card.flipped ? card.back : card.front}</span>
      </button>

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          className="asoshik-wbtn"
          disabled={idx === 0}
          onClick={() => setIdx((v) => Math.max(0, v - 1))}
          aria-label="Предыдущая карточка"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <button type="button" className="asoshik-wbtn" onClick={() => markKnown(false)}>
            Повторить
          </button>
          <button type="button" className="asoshik-wbtn accent" onClick={() => markKnown(true)}>
            <Check className="w-3.5 h-3.5" />
            <span>Знаю</span>
          </button>
        </div>
        <button
          type="button"
          className="asoshik-wbtn"
          disabled={idx >= total - 1}
          onClick={() => setIdx((v) => Math.min(total - 1, v + 1))}
          aria-label="Следующая карточка"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

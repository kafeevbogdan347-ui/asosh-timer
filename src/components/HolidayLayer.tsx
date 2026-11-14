import React, { useEffect, useMemo, useState } from 'react';
import { Holiday, HolidayEffect, activeHoliday, holidayById } from '../data/holidays';

interface Props {
  // Праздничная тема (Опции → Тема): какой праздник рисовать эффектами — снег, салют, лепестки
  themeHoliday?: string | null;
  quality: 'eco' | 'normal' | 'ultra';
  name: string; // для поздравления с днём рождения
  mode: 'effects' | 'banner'; // эффекты — от праздничной темы, баннер — поздравление в сам праздник
}

const PARTICLES: Record<HolidayEffect, string[]> = {
  snow: ['❄', '❅', '❆', '•'],
  petals: ['🌸', '🌷', '💮', '🌼'],
  stars: ['⭐', '✦', '★'],
  leaves: ['🍁', '🍂', '🍃'],
  confetti: ['🎉', '🎈', '✨', '🎊'],
  salute: ['🌹', '✦'],
};

const rand = (seed: number) => {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
};

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Падающие частицы: чистый CSS, без canvas — не грузит слабые телефоны
const Falling: React.FC<{ effect: HolidayEffect; count: number }> = ({ effect, count }) => {
  const items = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const set = PARTICLES[effect];
        return {
          ch: set[Math.floor(rand(i + 1) * set.length)],
          left: rand(i + 7) * 100,
          size: (effect === 'snow' ? 10 : 14) + rand(i + 3) * (effect === 'snow' ? 14 : 12),
          dur: (effect === 'snow' ? 9 : 11) + rand(i + 5) * 9,
          delay: -rand(i + 11) * 20,
          drift: (rand(i + 13) - 0.5) * 80,
          spin: effect === 'snow' ? 0 : (rand(i + 17) - 0.5) * 720,
          opacity: effect === 'snow' ? 0.55 + rand(i + 19) * 0.4 : 0.7 + rand(i + 19) * 0.3,
        };
      }),
    [effect, count]
  );
  return (
    <div className="holiday-fall" aria-hidden="true">
      {items.map((p, i) => (
        <span
          key={i}
          style={
            {
              left: `${p.left}%`,
              fontSize: `${p.size}px`,
              animationDuration: `${p.dur}s`,
              animationDelay: `${p.delay}s`,
              opacity: p.opacity,
              color: effect === 'snow' ? '#fff' : undefined,
              '--drift': `${p.drift}px`,
              '--spin': `${p.spin}deg`,
            } as React.CSSProperties
          }
        >
          {p.ch}
        </span>
      ))}
    </div>
  );
};

// Салют: вспышки из точек в разных местах экрана по очереди
const SALUTE_COLORS = ['#f43f5e', '#facc15', '#38bdf8', '#a3e635', '#f97316', '#e879f9'];
const Salute: React.FC<{ bursts: number }> = ({ bursts }) => (
  <div className="holiday-salute" aria-hidden="true">
    {Array.from({ length: bursts }, (_, b) => (
      <div
        key={b}
        className="burst"
        style={
          {
            left: `${10 + rand(b + 2) * 80}%`,
            top: `${8 + rand(b + 4) * 40}%`,
            animationDelay: `${b * 0.9}s`,
            animationDuration: `${bursts * 0.9}s`,
            '--c': SALUTE_COLORS[b % SALUTE_COLORS.length],
          } as React.CSSProperties
        }
      >
        {Array.from({ length: 14 }, (_, k) => (
          <i key={k} style={{ '--a': `${(360 / 14) * k}deg` } as React.CSSProperties} />
        ))}
      </div>
    ))}
  </div>
);

const Garland: React.FC = () => (
  <div className="holiday-garland" aria-hidden="true">
    {Array.from({ length: 18 }, (_, i) => (
      <i key={i} style={{ animationDelay: `${(i % 4) * 0.35}s` }} />
    ))}
  </div>
);

const dismissKey = (h: Holiday) => `asosh_holiday_seen_${h.id}_${new Date().getFullYear()}_${new Date().toDateString()}`;

export const HolidayLayer: React.FC<Props> = ({ themeHoliday, quality, name, mode }) => {
  const [now, setNow] = useState(() => new Date());
  const [closed, setClosed] = useState(false);

  // Праздник может начаться, пока приложение открыто (полночь)
  useEffect(() => {
    if (mode !== 'banner') return;
    const t = setInterval(() => setNow(new Date()), 10 * 60 * 1000);
    return () => clearInterval(t);
  }, [mode]);

  const holiday = mode === 'effects' ? (themeHoliday ? holidayById(themeHoliday, name) : null) : activeHoliday(now, name);

  useEffect(() => {
    if (!holiday || mode !== 'banner') return;
    try {
      setClosed(localStorage.getItem(dismissKey(holiday)) === '1');
    } catch {
      setClosed(false);
    }
  }, [holiday?.id, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!holiday) return null;
  const still = quality === 'eco' || reducedMotion();
  const count = quality === 'ultra' ? 46 : 26;

  if (mode === 'effects') {
    return (
      <>
        {!still &&
          (holiday.effect === 'salute' ? (
            <>
              <Salute bursts={quality === 'ultra' ? 7 : 5} />
              <Falling effect="salute" count={Math.round(count / 3)} />
            </>
          ) : (
            <Falling effect={holiday.effect} count={count} />
          ))}
        {holiday.garland && <Garland />}
      </>
    );
  }

  return (
    <>
      {!closed && (
        <div className={`holiday-banner hb-${holiday.effect}`} role="status">
          <span className="holiday-banner-icon">{holiday.icon}</span>
          <span className="min-w-0">
            <b>{holiday.title}</b>
            {holiday.sub && <small>{holiday.sub}</small>}
          </span>
          <button
            type="button"
            aria-label="Скрыть поздравление"
            onClick={() => {
              setClosed(true);
              try {
                localStorage.setItem(dismissKey(holiday), '1');
              } catch {
                // не запомнится до перезапуска
              }
            }}
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
};

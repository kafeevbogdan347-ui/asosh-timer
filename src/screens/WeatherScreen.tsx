import React, { useState, useEffect } from 'react';
import { Wind, Droplets, Gauge, Sparkles, RefreshCw, AlertCircle, CheckCircle2, ThermometerSnowflake, ShieldAlert, ArrowLeft, Globe, Search, ExternalLink } from 'lucide-react';
import { WeatherAktivkaData, LanguageType } from '../types';

interface WeatherScreenProps {
  onBack: () => void;
  onShowToast: (msg: string) => void;
  lang?: LanguageType;
}

export const WeatherScreen: React.FC<WeatherScreenProps> = ({
  onBack,
  onShowToast,
}) => {
  const [provider, setProvider] = useState<'yandex' | 'google'>('yandex');
  const [data, setData] = useState<WeatherAktivkaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWeather = async (targetProvider: 'yandex' | 'google' = provider, silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const url = targetProvider === 'yandex' ? '/api/yandex/weather' : '/api/ai/weather';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Ошибка связи с сервером погоды');
      const json = await res.json();
      setData(json);
      if (silent) {
        onShowToast(
          targetProvider === 'yandex'
            ? 'Погода в Аргаяше обновлена через Яндекс.Сервисы 🟡'
            : 'Погода в Аргаяше обновлена через Google Live Search 🌐'
        );
      }
    } catch (err: any) {
      console.error('Weather load error:', err);
      // If google failed, auto fallback to yandex
      if (targetProvider === 'google') {
        try {
          const fallbackRes = await fetch('/api/yandex/weather');
          if (fallbackRes.ok) {
            const fallbackJson = await fallbackRes.json();
            setData(fallbackJson);
            setProvider('yandex');
            onShowToast('Google недоступен. Переключено на Яндекс.Погоду 🟡');
            return;
          }
        } catch {}
      }
      setError('Не удалось загрузить онлайн-прогноз. Показываем локальную сводку.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather(provider);
  }, [provider]);

  const getStatusColor = (status?: 'normal' | 'partial' | 'full') => {
    if (status === 'full') return 'bg-rose-500/20 border-rose-500 text-rose-300';
    if (status === 'partial') return 'bg-amber-500/20 border-amber-500 text-amber-300';
    return 'bg-emerald-500/20 border-emerald-500 text-emerald-300';
  };

  return (
    <div className="card screen-enter space-y-4">
      {/* Шапка экрана */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm font-bold text-white/80 hover:text-white px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/10"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Назад</span>
        </button>

        <div className="text-center">
          <h2 className="text-lg font-black text-cyan-300 flex items-center justify-center gap-1.5">
            <Globe className="w-5 h-5 text-cyan-400" />
            <span>Погода & Актировки</span>
          </h2>
          <div className="text-[11px] text-white/60 font-semibold flex items-center justify-center gap-1">
            <span>с. Аргаяш</span>
            <span>•</span>
            <span className={provider === 'yandex' ? 'text-amber-300 font-bold' : 'text-cyan-300 font-bold'}>
              {provider === 'yandex' ? 'Яндекс.Сервисы (РФ)' : 'Google Live Search'}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => fetchWeather(provider, true)}
          disabled={loading}
          className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-400 hover:bg-cyan-500/30 transition-all disabled:opacity-50"
          title="Обновить прогноз"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Переключатель источника Яндекс vs Google */}
      <div className="grid grid-cols-2 gap-1.5 p-1 bg-black/40 rounded-2xl border border-white/10">
        <button
          type="button"
          className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
            provider === 'yandex'
              ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold border border-amber-300'
              : 'text-white/70 hover:text-white hover:bg-white/5'
          }`}
          onClick={() => {
            setProvider('yandex');
            fetchWeather('yandex', true);
          }}
        >
          <span>🟡</span>
          <span>Яндекс.Погода (Без VPN)</span>
        </button>
        <button
          type="button"
          className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
            provider === 'google'
              ? 'bg-cyan-500 text-slate-950 shadow-md font-extrabold border border-cyan-300'
              : 'text-white/70 hover:text-white hover:bg-white/5'
          }`}
          onClick={() => {
            setProvider('google');
            fetchWeather('google', true);
          }}
        >
          <span>🔵</span>
          <span>Google Live Search</span>
        </button>
      </div>

      {/* Бейдж источника данных */}
      <div
        className={`p-2.5 rounded-2xl border flex items-center justify-between text-xs ${
          provider === 'yandex'
            ? 'bg-gradient-to-r from-amber-950/70 via-slate-900/80 to-yellow-950/70 border-amber-400/40'
            : 'bg-gradient-to-r from-blue-950/70 via-slate-900/80 to-cyan-950/70 border-blue-400/40'
        }`}
      >
        <div className="flex items-center gap-2">
          <div
            className={`w-6 h-6 rounded-lg flex items-center justify-center ${
              provider === 'yandex'
                ? 'bg-amber-500/20 border border-amber-400/40 text-amber-300'
                : 'bg-blue-500/20 border border-blue-400/40 text-blue-300'
            }`}
          >
            {provider === 'yandex' ? <span>🟡</span> : <Search className="w-3.5 h-3.5" />}
          </div>
          <div>
            <div className={`font-bold ${provider === 'yandex' ? 'text-amber-200' : 'text-blue-200'}`}>
              {data?.source || (provider === 'yandex' ? 'Яндекс.Погода с. Аргаяш' : 'Google Live Search Grounding')}
            </div>
            <div className="text-[10px] text-white/60">
              {provider === 'yandex'
                ? 'Прямая интеграция с Яндекс.Сервисами в РФ (работает без блокировок)'
                : 'Прямой поиск метеосводок села Аргаяш и актировок'}
            </div>
          </div>
        </div>
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
            provider === 'yandex'
              ? 'bg-amber-400/20 text-amber-300 border-amber-400/30'
              : 'bg-blue-400/20 text-blue-300 border-blue-400/30'
          }`}
        >
          {provider === 'yandex' ? 'ЯНДЕКС 100%' : 'ONLINE'}
        </span>
      </div>

      {/* Быстрые ссылки на сервисы Яндекс */}
      <div className="flex flex-wrap gap-2">
        <a
          href="https://yandex.ru/pogoda/argayash"
          target="_blank"
          rel="noreferrer"
          className="flex-1 min-w-[140px] p-2 rounded-xl bg-amber-500/15 border border-amber-400/30 hover:bg-amber-500/25 transition-all text-xs font-bold text-amber-200 flex items-center justify-center gap-1.5"
        >
          <span>☀️</span>
          <span>Яндекс.Погода (Аргаяш)</span>
          <ExternalLink className="w-3 h-3 text-amber-300" />
        </a>

        <a
          href="https://yandex.ru/pogoda/argayash/maps/nowcast"
          target="_blank"
          rel="noreferrer"
          className="flex-1 min-w-[140px] p-2 rounded-xl bg-cyan-500/15 border border-cyan-400/30 hover:bg-cyan-500/25 transition-all text-xs font-bold text-cyan-200 flex items-center justify-center gap-1.5"
        >
          <span>🌧️</span>
          <span>Радар осадков Яндекс</span>
          <ExternalLink className="w-3 h-3 text-cyan-300" />
        </a>

        <a
          href="https://yandex.ru/maps/?text=АСОШ+2+Аргаяш"
          target="_blank"
          rel="noreferrer"
          className="p-2 px-3 rounded-xl bg-purple-500/15 border border-purple-400/30 hover:bg-purple-500/25 transition-all text-xs font-bold text-purple-200 flex items-center justify-center gap-1.5"
        >
          <span>📍</span>
          <span>АСОШ на Яндекс.Картах</span>
          <ExternalLink className="w-3 h-3 text-purple-300" />
        </a>
      </div>

      {loading && !data ? (
        <div className="py-12 flex flex-col items-center justify-center space-y-3">
          <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <div className="text-sm font-bold text-amber-200">
            {provider === 'yandex'
              ? 'Загрузка данных Яндекс.Погоды для села Аргаяш...'
              : 'Google Поиск ищет погоду в Аргаяше в реальном времени...'}
          </div>
          <div className="text-xs text-white/50">Загрузка данных температуры, скорости ветра и официальных актировок</div>
        </div>
      ) : data ? (
        <>
          {/* Поисковые запросы Google */}
          {data.searchQueries && data.searchQueries.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-white/50 font-bold">🔍 Запросы Google:</span>
              {data.searchQueries.map((q, idx) => (
                <span
                  key={idx}
                  className="text-[10px] px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-cyan-200/90 font-mono"
                >
                  "{q}"
                </span>
              ))}
            </div>
          )}

          {/* Главный блок текущей погоды */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-950/70 via-slate-900/80 to-blue-950/70 border border-cyan-500/30 shadow-lg relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider">Текущая погода в Аргаяше</span>
                <div className="text-4xl sm:text-5xl font-black font-mono text-white mt-1">
                  {data.temp > 0 ? `+${data.temp}` : data.temp}°C
                </div>
                <div className="text-xs text-white/70 mt-1">
                  Ощущается как <b className="text-cyan-200">{data.feelsLike > 0 ? `+${data.feelsLike}` : data.feelsLike}°C</b>
                </div>
              </div>

              <div className="text-right">
                <div className="text-4xl mb-1">
                  {data.temp <= -20 ? '🥶' : data.temp < 0 ? '❄️' : '⛅'}
                </div>
                <div className="text-xs font-bold text-white/90 max-w-[140px] leading-tight">
                  {data.condition}
                </div>
              </div>
            </div>

            {/* Дополнительные параметры */}
            <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-white/10 text-xs">
              <div className="flex items-center gap-1.5 text-white/80">
                <Wind className="w-4 h-4 text-cyan-300 shrink-0" />
                <div>
                  <div className="text-[10px] text-white/50 font-bold">Ветер</div>
                  <div className="font-bold">{data.windSpeed} м/с</div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-white/80">
                <Droplets className="w-4 h-4 text-blue-300 shrink-0" />
                <div>
                  <div className="text-[10px] text-white/50 font-bold">Влажность</div>
                  <div className="font-bold">{data.humidity}%</div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-white/80">
                <Gauge className="w-4 h-4 text-amber-300 shrink-0" />
                <div>
                  <div className="text-[10px] text-white/50 font-bold">Давление</div>
                  <div className="font-bold">{data.pressure} мм</div>
                </div>
              </div>
            </div>
          </div>

          {/* Блок школьной актировки (Отмена занятий из-за мороза) */}
          <div className={`p-4 rounded-2xl border ${getStatusColor(data.frostStatus?.status)}`}>
            <div className="flex items-center gap-2 mb-1.5">
              {data.frostStatus?.status === 'normal' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 animate-pulse" />
              )}
              <h3 className="text-base font-black tracking-wide">
                {data.frostStatus?.title}
              </h3>
            </div>
            
            <p className="text-xs text-white/90 leading-relaxed mb-2 font-medium">
              {data.frostStatus?.description}
            </p>

            <div className="inline-block px-2.5 py-1 rounded-lg bg-white/10 text-[11px] font-bold text-white border border-white/15">
              🎯 Коснулось: {data.frostStatus?.gradesAffected}
            </div>
          </div>

          {/* Найденные веб-источники Google */}
          {data.groundingSources && data.groundingSources.length > 0 && (
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-xs">
              <div className="font-bold text-cyan-300 mb-2 flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-cyan-400" />
                <span>Источники данных Google Поиска:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {data.groundingSources.map((src, idx) => (
                  <a
                    key={idx}
                    href={src.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-xl bg-cyan-950/40 text-cyan-300 border border-cyan-400/30 hover:bg-cyan-900/40 transition-colors"
                  >
                    <span>{src.title}</span>
                    <ExternalLink className="w-3 h-3 text-cyan-400" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Блок школьного совета для АСОШ №2 */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-950/60 to-indigo-950/60 border border-purple-400/30 text-xs text-purple-200">
            <div className="flex items-center gap-1.5 font-black text-purple-300 mb-1">
              <Sparkles className="w-4 h-4 text-purple-300" />
              <span>Совет школьного помощника АСОШ №2:</span>
            </div>
            <p className="leading-relaxed text-white/90">
              {data.aiNote}
            </p>
          </div>

          {/* Прогноз на 4 дня */}
          <div>
            <h4 className="text-xs font-bold text-white/70 uppercase tracking-wider mb-2">
              Прогноз на неделю в Аргаяше (Google Search)
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {data.forecast?.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-center hover:bg-white/10 transition-colors"
                >
                  <div className="text-xs font-bold text-cyan-300 mb-1">{item.day}</div>
                  <div className="text-2xl my-1">{item.icon || '⛅'}</div>
                  <div className="text-xs font-black text-white">
                    {item.tempDay > 0 ? `+${item.tempDay}` : item.tempDay}° / {item.tempNight > 0 ? `+${item.tempNight}` : item.tempNight}°
                  </div>
                  <div className="text-[10px] text-white/60 truncate mt-0.5">{item.condition}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Справочная таблица температурных норм отмены занятий Челябинской области */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-xs">
            <div className="font-bold text-cyan-300 mb-2 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-cyan-400" />
              <span>Официальные нормы актировок (Челябинская область):</span>
            </div>
            <div className="space-y-1.5 text-[11px] text-white/80">
              <div className="flex justify-between border-b border-white/5 pb-1">
                <span className="font-bold text-white">1–4 классы:</span>
                <span>от -25°C (или -23°C при ветре ≥5 м/с)</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1">
                <span className="font-bold text-white">1–7 классы:</span>
                <span>от -28°C (или -26°C при ветре ≥5 м/с)</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1">
                <span className="font-bold text-white">1–9 классы:</span>
                <span>от -30°C (или -28°C при ветре ≥5 м/с)</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-white">1–11 классы:</span>
                <span>от -31°C..-32°C (или -29°C..-30°C при ветре ≥5 м/с)</span>
              </div>
            </div>
          </div>

          <div className="text-center text-[10px] text-white/40 font-mono">
            Данные получены в {data.updatedAt} через Google Live Search Grounding
          </div>
        </>
      ) : null}

      {error && (
        <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-xs text-rose-200">
          {error}
        </div>
      )}
    </div>
  );
};

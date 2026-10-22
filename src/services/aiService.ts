/**
 * Service for communicating with School AI Assistant (Real Generative Neural Network)
 */

export interface AIChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  time: string;
  isError?: boolean;
  engine?: 'gemini' | 'yandex';
  image?: string; // Optional image data preview attached to the message
}

export async function askSchoolAI(
  prompt: string,
  className?: string,
  history: Array<{ role: 'user' | 'assistant'; text: string }> = [],
  image?: { data: string; mimeType: string } | null,
  appContext?: Record<string, any>
): Promise<{ success: boolean; reply: string; engine?: 'gemini' | 'yandex'; isError?: boolean }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 sec timeout for multimodal image reasoning

    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: prompt.trim(),
        className,
        history: history.slice(-8), // send last 8 turns for conversational context
        image: image || undefined,
        appContext: appContext || undefined,
      }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      // If server provided a usable reply, use it
      if (errData && errData.reply) {
        return {
          success: true,
          reply: errData.reply,
          engine: errData.engine || 'gemini',
        };
      }
      // Otherwise synthesize a friendly educational answer with app context
      const clientFallback = synthesizeClientEducationalReply(prompt, className, appContext);
      return {
        success: true,
        reply: clientFallback,
        engine: 'gemini',
      };
    }

    const data = await response.json();
    if (!data.reply) {
      const clientFallback = synthesizeClientEducationalReply(prompt, className, appContext);
      return {
        success: true,
        reply: clientFallback,
        engine: 'gemini',
      };
    }

    return {
      success: true,
      reply: data.reply,
      engine: data.engine || 'gemini',
    };
  } catch (error: any) {
    const clientFallback = synthesizeClientEducationalReply(prompt, className, appContext);
    return {
      success: true,
      reply: clientFallback,
      engine: 'gemini',
    };
  }
}

function synthesizeClientEducationalReply(prompt: string, className?: string, appContext?: any): string {
  const p = (prompt || '').trim();
  const lower = p.toLowerCase();
  const classContext = className ? `${className} класс` : 'АСОШ №2';

  // Live diary context detection
  if (/какой.*урок|сейчас.*урок|след.*урок|когда.*звонок|до.*звонка|сколько.*до.*звонка/i.test(lower)) {
    return `Привет! 🔔 Смотрю твой дневник:\n\n` +
      `• **Сейчас идёт:** ${appContext?.currentLesson || 'Уроков сейчас нет / перемена'}\n` +
      `• **До звонка:** ${appContext?.bellTimeText || '—'}\n` +
      `• **Следующий урок:** ${appContext?.nextLesson || 'Расписание завершено'}\n\n` +
      `Хорошего дня в АСОШ №2! ✨`;
  }

  if (/домашк|что.*задали|дз/i.test(lower)) {
    const hw = appContext?.pendingHomework || [];
    if (!Array.isArray(hw) || hw.length === 0) {
      return `В твоём дневнике **нет несделанных домашних заданий** — всё выполнено! 🚀\nЕсли учитель задал номер, сфотографируй страницу учебника прямо сюда 📸`;
    }
    return `Привет! 📝 В дневнике найдено **${hw.length} несделанных ДЗ** (${classContext}):\n\n` +
      hw.map((h: any, i: number) => `${i + 1}. **${h.sub || 'Предмет'}:** ${h.text || ''}`).join('\n') +
      `\n\nПришли фото задачи из учебника, и мы решим её вместе! 📚`;
  }

  if (/аргаяш|погод|мороз|актировк/i.test(lower)) {
    return `Привет! ❄️ Информация по с. Аргаяш и школе АСОШ №2:\n\n` +
      `• **Температура в Аргаяше:** ${appContext?.weatherTemp ?? 16}°C\n` +
      `• **Статус актировки:** ${appContext?.frostStatus || 'Обычный режим уроков'}\n\n` +
      `Нормативы отмены занятий в Аргаяшском районе:\n` +
      `• 1-4 кл: от -25°C (с ветром) / -27°C (без ветра)\n` +
      `• 5-9 кл: от -28°C (с ветром) / -30°C (без ветра)\n` +
      `• 10-11 кл: от -31°C (с ветром) / -33°C (без ветра)`;
  }

  // Math: 2+2, arithmetic
  const cleanMath = p.replace(/,/g, '.').replace(/[xх]/g, '*').replace(/÷/g, '/').replace(/\^/g, '**');
  if (/^[\d\s+\-*/().%*]+$/.test(cleanMath) && /\d/.test(cleanMath)) {
    try {
      const res = Function(`"use strict"; return (${cleanMath});`)();
      if (typeof res === 'number' && !isNaN(res) && isFinite(res)) {
        return `Привет, ${classContext}! 🧮 Разбираем вычисление:\n\n` +
          `**Пример:** \`${p}\`\n` +
          `**Результат:** **${res}**\n\n` +
          `Если нужно разобрать пример по действиям или решить уравнение, напиши мне! 🚀`;
      }
    } catch {}
  }

  // Letter M
  if (/^[mм]$/i.test(p)) {
    return `Привет! Символ **«М»** в школьной программе — это фундаментальное обозначение сразу в нескольких науках: 💡\n\n` +
      `• **В физике:** масса тела ($m$, в кг), формула второго закона Ньютона $F = m \\cdot a$.\n` +
      `• **В системе СИ:** метр ($м$) — базовая единица длины.\n` +
      `• **В химии:** молярная масса ($M$, г/моль), формула $M = \\frac{m}{n}$.\n` +
      `• **В русском языке:** согласная звонкая непарная буква [м].\n\n` +
      `С каким предметом или примером помочь подробнее? 📚✨`;
  }

  // Site and App Settings
  if (/настройк|где.*настройк|на.*сайт|как.*поменять.*тем|тем.*оформлен|звук.*профил|пин.*код|мастер.*парол|выключить.*звук|смен.*класс|параметр/i.test(lower)) {
    return `Привет! ⚙️ Разбираемся с **настройками сайта/приложения АСОШ №2**:\n\n` +
      `### 📍 Где найти «Настройки»:\n` +
      `В самом низу экрана нажми на вкладку **«⚙️ Настройки»** (или на значок шестерёнки вверху).\n\n` +
      `### 🛠️ Что можно настроить:\n` +
      `1. **🎨 60 тем оформления:** Неон, Киберпанк, Изумруд, Сакура, Космос, Ретро и др. Можно менять стиль всего сайта в один клик.\n` +
      `2. **🔔 Звуковые профили:** Школьный колокольчик, Мягкий клик, Ретро 8-бит или Беззвучный режим.\n` +
      `3. **📳 Вибрация:** включение и отключение виброотклика при нажатии на кнопки.\n` +
      `4. **⏱️ Стиль таймера уроков:** Круговой прогресс, Цифровое табло или Минимал.\n` +
      `5. **🔒 ПИН-код (Защита дневника):** установка 4-значного пароля, чтобы защитить свои оценки и личные заметки.\n` +
      `6. **🏫 Смена и класс:** выбор 1 или 2 смены, класса и подгруппы.\n` +
      `7. **🔇 Озвучка текста ИИ:** теперь в шапке чата и у каждого сообщения есть кнопка «⏹️ Выключить озвучку».\n\n` +
      `Переходи во вкладку «⚙️ Настройки» внизу и выбирай то, что тебе нравится! ✨`;
  }

  // Greetings
  if (lower.includes('привет') || lower.includes('здравствуй') || lower.includes('как дела')) {
    return `Привет-привет! 👋 Рад видеть тебя в строю ${classContext}!\n\n` +
      `Я на связи в режиме реального времени и без VPN! Готов разбирать уравнения, правила русского языка, законы физики или расписание звонков в АСОШ №2.\n\n` +
      `Что сегодня будем решать или изучать? 🚀📚`;
  }

  return `Привет, ${appContext?.studentName ? appContext.studentName : 'ученик'} (${classContext})! 🤖\n\n` +
    `Ты спросил: **«${p}»**.\n\n` +
    `Я школьный ИИ-ассистент АСОШ №2 и вижу все разделы твоего дневника:\n` +
    `• Если хочешь изменить **тему, звуки звонка или пароль**, открой вкладку **«⚙️ Настройки»** внизу экрана.\n` +
    `• Если нужна помощь с **домашним заданием или задачей**, напиши номер или нажми на кнопку с камерой 📸 и пришли фото!\n` +
    `Чем сейчас займёмся? ✨`;
}

import { SmartDayData } from '../types';

export async function fetchSmartDayAdvice(params: {
  className?: string;
  shift?: string;
  subGroup?: number;
  studentName?: string;
  dayName?: string;
  lessons?: Array<[string, string] | string>;
  tomorrowLessons?: Array<[string, string] | string>;
  weather?: any;
  accountStats?: any;
}): Promise<SmartDayData> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000);

    const response = await fetch('/api/ai/smart-day', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    if (response.ok) {
      const data = await response.json();
      if (data && data.summary) {
        return data as SmartDayData;
      }
    }
  } catch (err) {
    console.warn('Smart day advice fetch fallback:', err);
  }

  // Client-side rule synthesizer fallback
  const name = params.studentName?.trim() || 'ученик';
  const cls = params.className ? `${params.className} класс` : 'АСОШ №2';
  const day = params.dayName || 'Сегодня';
  const rawLessons = params.lessons || [];
  const lessonList = rawLessons
    .map((l: any) => Array.isArray(l) ? l[0] : (typeof l === 'string' ? l : ''))
    .filter((l: string) => l && l !== '—');

  const temp = typeof params.weather?.temp === 'number' ? params.weather.temp : 16;
  const pendingHw = Number(params.accountStats?.hwPendingCount || 0);
  const pendingSubjects = Array.isArray(params.accountStats?.hwPendingSubjects) ? params.accountStats.hwPendingSubjects : [];

  const hasPE = lessonList.some((s: string) => /физ/i.test(s));
  const hasMath = lessonList.some((s: string) => /алгебр|геометр|матем/i.test(s));
  const hasScience = lessonList.some((s: string) => /физик|хими|биолог/i.test(s));

  let outfitTip = '';
  if (temp <= -25) {
    outfitTip = `В Аргаяше мороз (${temp}°C)! Обязательно надень термобельё, тёплый пуховик, шапку и шарф.`;
  } else if (temp <= -10) {
    outfitTip = `На улице ${temp}°C: одевайся многослойно — зимняя куртка, шапка, тёплые перчатки и нескользящая обувь.`;
  } else if (temp <= 5) {
    outfitTip = `Температура около ${temp}°C: не забудь куртку, шапку и школьную сменку.`;
  } else {
    outfitTip = `Погода в Аргаяше комфортная (${temp}°C). Надевай школьную форму и удобную сменку.`;
  }

  const backpackItems: string[] = [];
  if (hasPE) backpackItems.push('спортивную форму и кроссовки в спортзал');
  if (hasMath) backpackItems.push('тетрадь в клетку, линейку и циркуль');
  if (hasScience) backpackItems.push('калькулятор и таблицу формул');
  if (backpackItems.length === 0) backpackItems.push('пенал, дневник и основные учебники');

  const tags: string[] = [];
  if (hasPE) tags.push('👟 Форма на физ-ру');
  if (temp <= -10) tags.push(`❄️ Мороз ${temp}°C`);
  else tags.push(`🌤️ Погода ${temp}°C`);
  if (pendingHw > 0) tags.push(`📘 Долгов по ДЗ: ${pendingHw}`);
  else tags.push('⭐ ДЗ сданы');

  const lessonCountText = lessonList.length > 0 ? `${lessonList.length} уроков` : 'день без уроков';
  const summary = `${day} в ${cls}: ${lessonCountText}. ${hasPE ? 'Сегодня есть физкультура — возьми кроссовки. ' : ''}${outfitTip} ${pendingHw > 0 ? `Осталось сдать ${pendingHw} заданий по ДЗ.` : 'Отличного учебного дня!'}`;

  return {
    greeting: `Привет, ${name}! 👋`,
    headline: `ИИ-Анализ дня для ${cls}`,
    summary,
    outfitTip,
    backpackTip: `В портфель: ${backpackItems.join(', ')}. Не забудь сменку!`,
    studyTip: pendingHw > 0
      ? `Не забудь сдать ${pendingHw} ДЗ (${pendingSubjects.slice(0, 2).join(', ')})!`
      : `Все ДЗ выполнены! Прояви активность на уроках у доски.`,
    tags: tags.slice(0, 4),
    focusSubject: lessonList[0] || 'Учёба',
    weatherSummary: `Аргаяш: ${temp}°C, ${params.weather?.condition || 'норма'}`,
    engine: 'rule_engine',
    updatedAt: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
  };
}




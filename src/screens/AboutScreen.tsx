import React, { useState } from 'react';
import {
  Sparkles,
  Shield,
  CheckCircle2,
  AlertTriangle,
  History,
  Zap,
  Flame,
  Bug,
  ListFilter,
  Download,
  Share2,
  ShieldCheck,
  Smartphone,
  Terminal,
  Lock,
  Server,
} from 'lucide-react';
import { downloadPresentationHtml, downloadPresentationMarkdown } from '../data/presentationData';

interface AboutScreenProps {
  onBack?: () => void;
}

export const AboutScreen: React.FC<AboutScreenProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'v148' | 'v147' | 'v146' | 'history' | 'allFeatures'>('v148');

  const v148NewFeatures = [
    {
      icon: '⚙️',
      title: 'Огромный Центр Управления и Супер-Настройки v14.8',
      desc: 'Настройки полностью переработаны в огромный центр управления с быстрым поиском и 8 разделами: 60 тем с фильтрами категорий, интерактивная «Звуковая лаборатория» (Sound Test Bench), настройка скорости и тона голоса ИИ, инспектор памяти LocalStorage в КБ, выбор звонков и смен, 152-ФЗ приватность и пинг-тест серверов.',
    },
    {
      icon: '📅',
      title: 'Синхронизация даты и времени (строго 2026 год, осень)',
      desc: 'ИИ-помощник подключён к системному календарю: всегда знает точный 2026 год, число (25 сентября 2026 года), текущий день недели и учебный год (2026/2027) для безошибочной записи в тетрадях и планирования уроков.',
    },
    {
      icon: '🧠',
      title: '«Всевидящий ИИ АСОШ №2» (Gemini 3.8 Flash Vision)',
      desc: 'ИИ-помощник теперь видит всё приложение в реальном времени: ваш класс, текущий урок, точные минуты до звонка, расписание на сегодня и завтра, все невыполненные домашние задания и погоду в селе Аргаяш.',
    },
    {
      icon: '📸',
      title: 'Мультимодальное зрение: отправка фото в ИИ',
      desc: 'Прямо в чат с ИИ добавлена кнопка камеры и скрепки: сфотографируйте страницу учебника, классную доску или сложную задачу в тетради (или вставьте скриншот по Ctrl+V) — нейросеть распознает условие и распишет подробное пошаговое решение с формулами!',
    },
    {
      icon: '🏛️',
      title: 'Глубокая база знаний о селе Аргаяш и школе АСОШ №2',
      desc: 'ИИ знает всё о родном крае и школе: история села с 1896 г., климат Южного Урала, официальная шкала актировок морозов (1-4, 5-9 и 10-11 классы), адрес ул. Ленина, 24, расписание звонков 1 и 2 смен, расположение кабинетов по этажам и традиции школы.',
    },
    {
      icon: '🛡️',
      title: 'Надёжная защита аккаунта от сброса (Account Vault)',
      desc: 'Многоуровневое хранилище данных и облачное автовосстановление гарантируют, что ваше имя, класс, смена, оценки и ДЗ никогда не слетят при обновлениях приложения, перезагрузке страницы или очистке кэша.',
    },
    {
      icon: '📂',
      title: 'Разгрузка главного экрана (3 понятные вкладки)',
      desc: 'Более 20 функций аккуратно разложены по 3 разделам: «📚 Учёба» (Расписание, Звонки, Домашка, Формулы, Оценки), «🛠️ Утилиты» (Погода, Сбор рюкзака, Заявления, Таймер) и «🎮 Перемена» (Игры, Достижения, Чат, Музыка).',
    },
    {
      icon: '🔇',
      title: 'Кнопка «Выключить озвучку» и управление голосом ИИ',
      desc: 'Добавлена возможность мгновенно остановить чтение ответа голосом: кнопка «Выключить озвучку» у каждого сообщения, пульсирующая кнопка «Стоп озвучки» в шапке чата и общий переключатель звука (🔊 / 🔇). Воспроизведение автоматически глушится при переходе между экранами.',
    },
    {
      icon: '⚙️',
      title: 'ИИ знает все настройки сайта и приложения АСОШ №2',
      desc: 'ИИ теперь подробно и понятно подсказывает, где найти настройки (вкладка «⚙️ Настройки» внизу экрана), как выбрать тему оформления из 60 вариантов, сменить звук колокольчика, настроить таймер уроков, смену или поставить ПИН-код.',
    },
    {
      icon: '🎒',
      title: 'Сбор рюкзака, трекер четверти и симулятор GPA',
      desc: 'Добавлены интерактивный вечерний чек-лист сбора портфеля по урокам завтрашнего дня и калькулятор исправления оценок до конца четверти.',
    },
  ];

  const v148BugFixes = [
    {
      title: 'Устранён однотипный шаблонный ответ («Суть и ключевые понятия»)',
      desc: 'Исправлен баг, когда при коротких или общих вопросах (например, про настройки на сайте) ИИ присылал один и тот же шаблонный текст по пунктам. Таймаут нейросети увеличен до 20 секунд, а шаблон заменён на живой диалог.',
    },
    {
      title: 'Устранена галлюцинация года у ИИ (исправлен 2025 год на 2026)',
      desc: 'Устранён баг, когда нейросеть могла по ошибке назвать 2025 год. В системный контекст сервера и клиента встроена динамическая синхронизация текущей даты (2026 год, 25 сентября) и дня недели.',
    },
    {
      title: 'Убран лишний вход через сторонние сервисы',
      desc: 'Удалены навязчивые модальные окна входа Google и Apple ID. Защита данных теперь работает абсолютно бесшовно и автономно без внешних авторизаций.',
    },
    {
      title: 'Увеличен лимит размера запросов Express (25 МБ)',
      desc: 'Ранее при отправке качественных фотографий с камеры смартфона сервер мог вернуть ошибку 413 Payload Too Large. Лимит расширен до 25 МБ для плавной работы фотоанализа.',
    },
    {
      title: 'Поддержка буфера обмена Ctrl+V и предпросмотр фото',
      desc: 'Добавлена возможность вставлять скриншоты прямо из буфера обмена комбинацией клавиш Ctrl+V, интерактивный предпросмотр перед отправкой и полноэкранный просмотр фото в истории чата.',
    },
  ];

  const v147NewFeatures = [
    {
      icon: '🟢',
      title: 'Школьные серверы запущены (100% ONLINE)',
      desc: 'Технические работы завершены: все серверы и службы электронного дневника МОУ АСОШ №2 переведены в штатный режим онлайн с минимальным пингом (14 мс). Синхронизация расписания, базы классов 5-11 и школьного чата работает без перебоев.',
    },
    {
      icon: '🔒',
      title: 'Строгая защита Панели разработчика паролем (Dev Master Lock)',
      desc: 'Запрещён несанкционированный вход в Dev Suite без пароля. Любая попытка открытия через верхнюю панель, меню настроек или скрытые триггеры требует ввод мастер-пароля разработчика.',
    },
    {
      icon: '🛡️',
      title: 'Защита от перебора паролей (Rate-Limiting Lockout)',
      desc: 'Если злоумышленник или одноклассник попытается угадать пароль разработчика и ошибётся 4 раза подряд, система автоматически блокирует ввод на 30 секунд с визуальным таймером.',
    },
    {
      icon: '🔑',
      title: 'Управление мастер-паролем в панели разработчика',
      desc: 'В панели разработчика добавлена вкладка безопасности: пароль проверяется на сервере, защита от перебора. Добавлена кнопка мгновенной блокировки.',
    },
    {
      icon: '🛠️',
      title: 'Индикатор статуса серверов и диагностика в Настройках',
      desc: 'В Настройках (раздел 5.1) размещён блок состояния серверов: индикатор «100% ONLINE», кнопка быстрой проверки пинга сервисов и переключатель для учебных тревог и регламентных работ.',
    },
    {
      icon: '📱',
      title: 'Сохранены все прежние функции и Apache Cordova',
      desc: 'Ни одна предыдущая функция не вырезана: поддержка Apache Cordova для сборки нативного APK (CLI, config.xml API, MConvertor), оффлайн-кэш Service Worker, расписание для всех классов 5-11, игры, калькулятор и 60 тем оформления сохранены в полном объёме.',
    },
  ];

  const v147BugFixes = [
    {
      title: 'Устранена брешь открытого доступа к Dev-панели',
      desc: 'Ранее панель разработчика открывалась без подтверждения личности. Теперь вход защищён стойкой аутентификацией с шифрованием в локальном хранилище.',
    },
    {
      title: 'Исправлена типизация системных звуков на экране обслуживания',
      desc: 'Устранены ошибки вызова аудиоэффектов при проверке пинга серверов, звуковой профиль синхронизирован с системными настройками приложения.',
    },
    {
      title: 'Оптимизирована сессия при переходе между режимами',
      desc: 'Устранена задержка обновления состояния между автономным и штатным сервером без необходимости сброса кэша браузера.',
    },
  ];

  const v146NewFeatures = [
    {
      icon: '📱',
      title: 'Интеграция сервиса Apache Cordova (CLI & Сборка APK)',
      desc: 'Добавлена полная поддержка Apache Cordova для компиляции приложения в автономный нативный APK: команды CLI (npm install -g cordova, cordova create, cordova platform add android, cordova run), готовый файл config.xml и автоматический экспорт скрипта сборки build-cordova-apk.sh.',
    },
    {
      icon: '🗑️',
      title: 'Удалён Supabase и облегчён вес приложения',
      desc: 'Полностью устранен неиспользуемый стек Supabase (@supabase/supabase-js) и устаревшие конфигурации. Школьный чат работает на автономном защищенном сервере без VPN и блокировок, снижен расход трафика и памяти.',
    },
    {
      icon: '⚙️',
      title: 'Полная спецификация Config.xml API (W3C & Apache Cordova)',
      desc: 'Файл config.xml обновлён в строгом соответствии с официальным API: widget (id="ru.asosh2.diary", version="14.6.0", android-versionCode="146", defaultlocale="ru", activityName="MainActivity"), name с атрибутом short, preferences (Orientation, DisallowOverscroll, BackgroundColor, AndroidEdgeToEdge, AndroidLaunchMode="singleTop", SplashScreens), allow-navigation, allow-intent, а в модальном окне добавлен встроенный XML-инспектор с мгновенным копированием.',
    },
    {
      icon: '🤖',
      title: 'Тройной центр сборки: Cordova CLI, Config.xml API & MConvertor',
      desc: 'В Настройках и модальном окне появились 3 вкладки: пошаговый CLI-терминал Cordova, полноценный просмотр и скачивание config.xml, и параметры для экспорта через MConvertor.',
    },
    {
      icon: '🛡️',
      title: 'Аппаратная кнопка «Назад» с защитой Double-Back',
      desc: 'На смартфонах Android кнопка и жест «Назад» сначала закрывают открытые модальные окна (калькулятор, анти-палево, PIN), затем возвращают на главный экран расписания, а для выхода требуют повторного нажатия в течение 2 секунд с виброоткликом.',
    },
    {
      icon: '⚡',
      title: 'Service Worker & Оффлайн-кэш (sw.js)',
      desc: 'Внедрен Service Worker с интеллектуальным кэшированием (Cache First): приложение, расписание и игры открываются в APK даже при полном отсутствии интернета или слабом школьном Wi-Fi.',
    },
    {
      icon: '📐',
      title: 'Safe-Area Insets (экранные чёлки и каплевидные вырезы)',
      desc: 'Интерфейс учитывает системные отступы статус-бара и навигационных кнопок Android (safe-area-inset-top, safe-area-inset-bottom), предотвращая наплыв кнопок на вырезы камер.',
    },
    {
      icon: '🛡️',
      title: 'Максимальная конфиденциальность данных (152-ФЗ РФ)',
      desc: 'Все персональные данные (ФИО, оценки, расписание, история) хранятся локально на устройстве (Local-First). Никакие внешние трекеры или иностранные сервера не имеют доступа к вашему дневнику.',
    },
    {
      icon: '🔢',
      title: 'Защита приложения 4-значным PIN-кодом',
      desc: 'Установите персональный цифровой код доступа в Настройках. При включении приложения появляется защитный экран с виброоткликом и блокировкой при неверном вводе.',
    },
    {
      icon: '👁️‍🗨️',
      title: 'Режим «Анти-Шпион» (Privacy Blur)',
      desc: 'Мгновенное размытие оценок, ФИО, текста заметок и сообщений чата от подглядывания соседей по парте или в автобусе. Активируется кнопкой с глазом в верхней панели или в настройках.',
    },
    {
      icon: '🎭',
      title: 'Инкогнито-режим в школьном чате',
      desc: 'Возможность отправлять сообщения от имени «🎭 Анонимный ученик» без раскрытия настоящего ФИО и профиля. Полная свобода задать школьный вопрос анонимно.',
    },
    {
      icon: '⏳',
      title: 'Самоуничтожающиеся сообщения',
      desc: 'Таймер самоуничтожения (30 сек, 1 мин, 5 мин). Сообщения удаляются из чата автоматически после истечения времени таймера.',
    },
    {
      icon: '📱',
      title: 'Авто-скрытие экрана при сворачивании',
      desc: 'При переключении между приложениями на телефоне или сворачивании вкладки экран автоматически затемняется и размывается.',
    },
    {
      icon: '🔒',
      title: 'Защита от перебора кодов классов (Rate-Limiting)',
      desc: 'Система защищена от брутфорса: после 5 неверных попыток ввода кода класса блокируется на 30 секунд с визуальным таймером.',
    },
    {
      icon: '🎮',
      title: 'Реклама игры друга «Detective AI Game»',
      desc: 'Интегрирован красивый рекламный баннер инди-игры друга на Itch.io с прямым переходом для поддержки юного разработчика.',
    },
  ];

  const v146BugFixes = [
    {
      title: 'Удалены лишние сетевые запросы и зависимости от Supabase',
      desc: 'Устранена зависимость @supabase/supabase-js, очищен бандл от неиспользуемых фоновых обращений к внешним сервисам.',
    },
    {
      title: 'Добавлена поддержка Apache Cordova lifecycle (deviceready)',
      desc: 'Устранена потенциальная ошибка инициализации в Cordova-контейнерах: при запуске APK нативно инициализируются статус-бар и скрытие заставки.',
    },
    {
      title: 'Исправлен баг случайного закрытия приложения кнопкой «Назад» на Android',
      desc: 'Аппаратная кнопка «Назад» и системный жест теперь перехватываются: сначала закрывают всплывающие окна, затем возвращают на главный экран, а на главном экране требуют двойного нажатия («Нажмите Назад еще раз для выхода»).',
    },
    {
      title: 'Устранена проблема с белым экраном при отсутствии интернета в APK',
      desc: 'Подключен Service Worker (sw.js) с оффлайн-кэшированием, сохраняющий оболочку приложения локально на телефоне.',
    },
    {
      title: 'Исправлен баг наплыва шапки на статус-бар и вырезы камер Android',
      desc: 'Добавлены CSS-переменные safe-area-inset-top и safe-area-inset-bottom для корректного отображения на экранах с вырезами (punch-hole, notch).',
    },
    {
      title: 'Устранена нежелательная перезагрузка страницы при свайпе вниз (Pull-to-refresh)',
      desc: 'Включено свойство overscroll-behavior-y: contain, предотвращающее случайные перезагрузки страницы внутри WebView оболочки.',
    },
    {
      title: 'Устранена задержка 300мс при тапах на сенсорных экранах Android',
      desc: 'Добавлено свойство touch-action: manipulation для кнопок и ссылок, делающее отклик интерфейса мгновенным.',
    },
    {
      title: 'Сохранены все 60 тем оформления и 8 школьных игр',
      desc: 'Ни одна старая функция не удалена. Все модули, расписание, аналитика и темы бережно сохранены и адаптированы под APK.',
    },
  ];

  const allCapabilities = [
    { title: '🔐 Приватные коды классов (от классных руководителей)', desc: 'Безопасный вход в свой класс по личному коду без доступа посторонних.' },
    { title: '💬 Школьный мессенджер (Классы & Общешкольный)', desc: 'Быстрый обмен сообщениями между одноклассниками и всей школой с защитой от смены класса.' },
    { title: '📊 Аналитика посещаемости Vercel Web Analytics', desc: 'Автоматический учёт визитов и активности приложения в реальном времени.' },
    { title: '🎨 60 Графических тем оформления', desc: 'Атмосферные темы оформления с неоновыми подсветками, AMOLED и стилями Урала.' },
    { title: '🌐 Погода & Актировки с. Аргаяш (Яндекс + Метео)', desc: 'Автоматический мониторинг погоды и расчет отмены уроков по нормам Челябинской области.' },
    { title: '🔔 Расписание Звонков & Звуковой Пульт', desc: 'Таймер уроков и перемен для 1 и 2 смены, 5 школьных звуков на Web Audio API.' },
    { title: '📅 Официальное расписание 5А–11Б', desc: 'Сетка уроков всех классов школы с понедельника по субботу на 2026 год.' },
    { title: '🎮 8 Игр для перемен', desc: 'Флаппи-Дневник, Бумажный Самолётик, Змейка, Дуэль 1v1, Пакман, Сапёр, 2048, Крестики-нолики.' },
    { title: '🛠️ Панель Разработчика (Dev Tools)', desc: 'Инспекторы памяти, генераторы данных, симуляторы уроков, скачивание презентации и стресс-тесты.' },
    { title: '🏅 Школьное Портфолио ВсОШ и ГТО', desc: 'Учёт побед на олимпиадах, знаков ГТО и подсчет бонусов к поступлению.' },
    { title: '🎒 Чек-лист «Что брать в школу»', desc: 'Автоматический список учебников на завтра на основе расписания и принадлежностей.' },
    { title: '🎯 Калькулятор среднего балла', desc: 'Расчет успеваемости и прогноз сколько «5» нужно до отличной оценки.' },
    { title: '📊 Счётчик четверти и дней до каникул', desc: 'Интерактивная полоса прогресса четверти и подсчет дней до каникул.' },
    { title: '📐 Справочник формул & Таблица Менделеева', desc: 'Формулы по математике, физике, химии, русскому языку и английскому.' },
    { title: '🍅 Помодоро-таймер ДЗ & Фокус-звуки', desc: 'Циклы продуктивности с перерывами, звуками дождя и метрономом.' },
    { title: '⭐ Домашние задания и заметки', desc: 'Закрепление важных ДЗ звездочкой и фильтрация по готовности.' },
    { title: '🧮 Школьный калькулятор', desc: 'Быстрый расчет выражений, степеней, корней и история вычислений.' },
    { title: '📝 Генератор объяснительных записок', desc: 'Готовые шаблоны записок учителю по болезни или семейным обстоятельствам.' },
    { title: '🗺 Поиск кабинетов школы', desc: 'Навигатор по этажам и корпусам МОБУ АСОШ №2.' },
    { title: '🚨 Режим «Анти-палево» (Panic Mode)', desc: 'Мгновенный черный экран по двойному тапу.' },
  ];

  return (
    <div className="card screen-enter space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-cyan-300 flex items-center gap-2">
            <span>🧠</span>
            <span>Что нового в АСОШ №2 v14.8</span>
          </h2>
          <p className="text-xs text-white/70">
            Всевидящий ИИ дневника (Gemini Vision), отправка фото, знания об Аргаяше и сохранение профиля
          </p>
        </div>
        <span className="badge bg-cyan-500/20 text-cyan-300 border-cyan-400/40 text-xs font-mono font-black">
          v14.8 AI VISION
        </span>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5 p-1 bg-white/5 rounded-2xl border border-white/10">
        <button
          type="button"
          className={`flex-1 min-w-[120px] py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'v148'
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black shadow-md'
              : 'text-white/70 hover:bg-white/10'
          }`}
          onClick={() => setActiveTab('v148')}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Новое в v14.8 (ИИ & Фото)</span>
        </button>

        <button
          type="button"
          className={`flex-1 min-w-[120px] py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'v147'
              ? 'bg-emerald-500 text-slate-950 font-black shadow-md'
              : 'text-white/70 hover:bg-white/10'
          }`}
          onClick={() => setActiveTab('v147')}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Релиз v14.7</span>
        </button>

        <button
          type="button"
          className={`flex-1 min-w-[120px] py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'v146'
              ? 'bg-amber-500 text-slate-950 font-black shadow-md'
              : 'text-white/70 hover:bg-white/10'
          }`}
          onClick={() => setActiveTab('v146')}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>История v14.6</span>
        </button>

        <button
          type="button"
          className={`flex-1 min-w-[120px] py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'history'
              ? 'bg-amber-500 text-slate-950 font-black shadow-md'
              : 'text-white/70 hover:bg-white/10'
          }`}
          onClick={() => setActiveTab('history')}
        >
          <Bug className="w-3.5 h-3.5" />
          <span>Все баги</span>
        </button>

        <button
          type="button"
          className={`flex-1 min-w-[120px] py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'allFeatures'
              ? 'bg-amber-500 text-slate-950 font-black shadow-md'
              : 'text-white/70 hover:bg-white/10'
          }`}
          onClick={() => setActiveTab('allFeatures')}
        >
          <ListFilter className="w-3.5 h-3.5" />
          <span>Все функции</span>
        </button>
      </div>

      {/* TAB 0: v14.8 Features & Bugs */}
      {activeTab === 'v148' && (
        <div className="space-y-4">
          {/* Hero Banner */}
          <div className="p-4 bg-gradient-to-r from-cyan-950/90 via-slate-900 to-blue-950/90 rounded-2xl border border-cyan-400/50 space-y-2.5 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">🧠</span>
                <div>
                  <b className="text-xs font-black text-cyan-300 block uppercase tracking-wider">
                    Всевидящий ИИ Дневника & Отправка фото (Gemini Vision)
                  </b>
                  <span className="text-[10px] text-white/60">
                    Релиз v14.8.0 • МОУ АСОШ №2 с. Аргаяш (Челябинская обл.)
                  </span>
                </div>
              </div>
              <span className="badge bg-cyan-500/20 text-cyan-300 border-cyan-400/30 text-[10px] font-mono font-bold">
                100% SMART
              </span>
            </div>
            <p className="text-xs text-white/80 leading-relaxed">
              ИИ-помощник подключён напрямую ко всем разделам приложения: видит текущий урок, время до звонка, несделанные домашние задания, погоду и статус актировок в Аргаяше. Добавлена отправка фотографий задач и доски для мгновенного решения по шагам!
            </p>
          </div>

          {/* New Features List */}
          <div className="space-y-2">
            <b className="text-xs font-black text-white/80 uppercase tracking-wider block px-1">
              ✨ Что добавили в v14.8:
            </b>
            <div className="grid grid-cols-1 gap-2.5">
              {v148NewFeatures.map((feat, idx) => (
                <div
                  key={idx}
                  className="p-3.5 bg-white/6 rounded-2xl border border-white/10 flex items-start gap-3 hover:border-cyan-400/40 transition-colors shadow-sm"
                >
                  <span className="text-2xl p-2 rounded-xl bg-white/5 border border-white/8 shrink-0">
                    {feat.icon}
                  </span>
                  <div className="space-y-1">
                    <b className="text-xs font-black text-cyan-200 block">{feat.title}</b>
                    <p className="text-xs text-white/70 leading-relaxed">{feat.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bug Fixes List */}
          <div className="space-y-2 pt-2">
            <b className="text-xs font-black text-rose-300 uppercase tracking-wider block px-1">
              🛠️ Исправленные баги и улучшения в v14.8:
            </b>
            <div className="grid grid-cols-1 gap-2">
              {v148BugFixes.map((bug, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-rose-500/10 rounded-2xl border border-rose-400/25 flex items-start gap-2.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <b className="text-xs font-bold text-white block">{bug.title}</b>
                    <p className="text-xs text-white/70 leading-relaxed">{bug.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: v14.7 Features & Bugs */}
      {activeTab === 'v147' && (
        <div className="space-y-4">
          {/* Hero Banner */}
          <div className="p-4 bg-gradient-to-r from-emerald-950/80 via-slate-900 to-cyan-950/80 rounded-2xl border border-emerald-400/50 space-y-2.5 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">🟢</span>
                <div>
                  <b className="text-xs font-black text-emerald-300 block uppercase tracking-wider">
                    Серверы запущены & Панель разработчика защищена
                  </b>
                  <span className="text-[10px] text-white/60">
                    Релиз v14.7.0 • МОУ АСОШ №2 села Аргаяш
                  </span>
                </div>
              </div>
              <span className="badge bg-emerald-500/20 text-emerald-300 border-emerald-400/30 text-[10px] font-mono font-bold">
                100% ONLINE
              </span>
            </div>
            <p className="text-xs text-white/80 leading-relaxed">
              Все школьные серверы вернулись в строй после планового обслуживания. Вход в панель разработчика теперь строго закрыт мастер-паролем, защищая дневник от несанкционированных изменений.
            </p>
          </div>

          {/* New Features List */}
          <div className="space-y-2">
            <b className="text-xs font-black text-white/80 uppercase tracking-wider block px-1">
              ✨ Что добавили в v14.7:
            </b>
            <div className="grid grid-cols-1 gap-2.5">
              {v147NewFeatures.map((feat, idx) => (
                <div
                  key={idx}
                  className="p-3.5 bg-white/6 rounded-2xl border border-white/10 flex items-start gap-3 hover:border-emerald-400/40 transition-colors shadow-sm"
                >
                  <span className="text-xl shrink-0 p-1.5 bg-white/5 rounded-xl border border-white/10">
                    {feat.icon}
                  </span>
                  <div className="space-y-1">
                    <b className="text-xs font-black text-white block">{feat.title}</b>
                    <p className="text-[11px] text-white/70 leading-relaxed">{feat.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bug Fixes Section for v14.7 */}
          <div className="space-y-2 pt-1">
            <b className="text-xs font-black text-amber-300 uppercase tracking-wider block px-1 flex items-center gap-1.5">
              <Bug className="w-3.5 h-3.5" />
              <span>Какие баги были исправлены в v14.7:</span>
            </b>
            <div className="space-y-2">
              {v147BugFixes.map((bug, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-white/6 rounded-2xl border border-amber-400/30 flex items-start gap-3"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <b className="text-xs text-white block font-bold">{bug.title}</b>
                    <p className="text-[11px] text-white/70 leading-relaxed">{bug.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: v14.6 Features */}
      {activeTab === 'v146' && (
        <div className="space-y-3">
          {/* Quick presentation download directly in what's new tab */}
          <div className="p-3.5 bg-gradient-to-r from-amber-950/80 via-slate-900 to-yellow-950/80 rounded-2xl border border-amber-400/50 space-y-2.5 shadow-md">
            <div className="flex items-center justify-between">
              <b className="text-xs font-black text-amber-300 flex items-center gap-1.5 uppercase tracking-wider">
                <span>🎤 Презентация для защиты перед директором и завучем</span>
              </b>
              <span className="badge bg-amber-500/20 text-amber-300 border-amber-400/30 text-[10px] font-mono">
                ГОТОВО К ВЫСТУПЛЕНИЮ
              </span>
            </div>
            <p className="text-xs text-white/80 leading-relaxed">
              Скачайте файл интерактивной презентации с таймером на 5 минут и 7 слайдами для демонстрации проекта директору АСОШ №2.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => downloadPresentationHtml()}
                className="btn text-xs py-2 px-3 font-black bg-amber-500 text-slate-950 hover:bg-amber-400 flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Скачать .HTML</span>
              </button>
              <button
                type="button"
                onClick={() => downloadPresentationMarkdown()}
                className="btn text-xs py-2 px-3 font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 flex items-center gap-1.5 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 text-amber-300" />
                <span>Скачать тексты .MD</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {v146NewFeatures.map((feat, idx) => (
              <div
                key={idx}
                className="p-3 bg-white/6 hover:bg-white/10 rounded-2xl border border-cyan-400/25 flex items-start gap-3 transition-colors"
              >
                <span className="text-2xl shrink-0 p-1 bg-white/5 rounded-xl border border-white/10">
                  {feat.icon}
                </span>
                <div className="space-y-1">
                  <h4 className="text-xs font-black text-white">{feat.title}</h4>
                  <p className="text-[11px] text-white/70 leading-relaxed">{feat.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: Bug Fixes */}
      {activeTab === 'history' && (
        <div className="space-y-3">
          <div className="p-3 bg-emerald-950/40 rounded-2xl border border-emerald-400/30 text-xs text-emerald-200 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Все выявленные проблемы WebView, Cordova, кнопки «Назад» и конфиденциальности устранены в релизе v14.6.</span>
          </div>

          <div className="space-y-2.5">
            {v146BugFixes.map((bug, idx) => (
              <div
                key={idx}
                className="p-3 bg-white/8 rounded-2xl border border-emerald-400/30 flex items-start gap-3"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <b className="text-xs text-white block font-bold">{bug.title}</b>
                  <p className="text-[11px] text-white/70 leading-relaxed">{bug.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: All Features */}
      {activeTab === 'allFeatures' && (
        <div className="space-y-2.5">
          <div className="p-3 bg-cyan-950/40 rounded-2xl border border-cyan-400/30 text-xs text-cyan-200">
            Полный арсенал возможностей умного дневника АСОШ №2 (20+ автономных модулей).
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {allCapabilities.map((cap, idx) => (
              <div
                key={idx}
                className="p-3 bg-white/6 rounded-2xl border border-white/10 space-y-1"
              >
                <b className="text-xs font-bold text-cyan-300 block">{cap.title}</b>
                <p className="text-[10px] text-white/65 leading-relaxed">{cap.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer / Back */}
      {onBack && (
        <div className="pt-2">
          <button
            type="button"
            onClick={onBack}
            className="btn darkBtn w-full py-2.5 rounded-2xl text-xs font-bold justify-center cursor-pointer"
          >
            ← Вернуться к расписанию
          </button>
        </div>
      )}
    </div>
  );
};

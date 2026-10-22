import React, { useState } from 'react';
import {
  Smartphone,
  CheckCircle2,
  Copy,
  Check,
  Download,
  Terminal,
  ShieldCheck,
  X,
  Vibrate,
  FileCode,
  Layers,
  Sparkles,
  Code2,
} from 'lucide-react';
import { getApkDiagnostics, triggerAndroidVibrate } from '../utils/apkSupport';
import {
  downloadCordovaConfigXml,
  generateCordovaBuildScript,
  getCordovaInfo,
  getCordovaConfigXml,
} from '../services/cordovaService';

interface ApkSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast?: (msg: string) => void;
}

export const ApkSupportModal: React.FC<ApkSupportModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'cordova' | 'configxml' | 'mconvertor'>('cordova');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const diagnostics = getApkDiagnostics();
  const cordovaInfo = getCordovaInfo();
  const currentUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const configXmlContent = getCordovaConfigXml();

  if (!isOpen) return null;

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(fieldName);
      if (onShowToast) onShowToast(`Скопировано: ${fieldName}`);
      setTimeout(() => setCopiedField(null), 2000);
    });
  };

  const testVibration = () => {
    triggerAndroidVibrate([40, 60, 40]);
    if (onShowToast) onShowToast('📳 Виброотклик сработал!');
  };

  const downloadScript = () => {
    const script = generateCordovaBuildScript();
    const blob = new Blob([script], { type: 'text/x-shellscript;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'build-cordova-apk.sh';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    if (onShowToast) onShowToast('Скрипт сборки build-cordova-apk.sh скачан!');
  };

  return (
    <div className="fixed inset-0 z-[10000] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border-2 border-cyan-400/40 rounded-3xl max-w-xl w-full p-4 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-xl">
              📱
            </div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-1.5">
                <span>Сборка Android APK: Cordova & MConvertor</span>
              </h3>
              <p className="text-[11px] text-cyan-300">
                Полная спецификация config.xml API, Cordova CLI, WebView и MConvertor
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-white/5 rounded-2xl border border-white/10">
          <button
            type="button"
            onClick={() => setActiveTab('cordova')}
            className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'cordova'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                : 'text-white/70 hover:bg-white/10'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span className="truncate">Cordova CLI</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('configxml')}
            className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'configxml'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                : 'text-white/70 hover:bg-white/10'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span className="truncate">Config.xml API</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('mconvertor')}
            className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'mconvertor'
                ? 'bg-cyan-500 text-slate-950 font-black shadow-md'
                : 'text-white/70 hover:bg-white/10'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="truncate">MConvertor</span>
          </button>
        </div>

        {/* Status Indicators */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono text-white/70">
          <div className="p-2 rounded-xl bg-slate-950/60 border border-white/5">
            <span className="text-white/40 block text-[9px]">CORDOVA:</span>
            <b className={cordovaInfo.isCordova ? 'text-emerald-300' : 'text-cyan-300'}>
              {cordovaInfo.isCordova ? '✅ Активна' : 'Готово к сборке'}
            </b>
          </div>
          <div className="p-2 rounded-xl bg-slate-950/60 border border-white/5">
            <span className="text-white/40 block text-[9px]">КНОПКА «НАЗАД»:</span>
            <b className="text-emerald-300">🛡️ Double-Back</b>
          </div>
          <div className="p-2 rounded-xl bg-slate-950/60 border border-white/5">
            <span className="text-white/40 block text-[9px]">CONFIG.XML:</span>
            <b className="text-amber-300">W3C Compliant</b>
          </div>
          <div className="p-2 rounded-xl bg-slate-950/60 border border-white/5">
            <span className="text-white/40 block text-[9px]">OFFLINE КЭШ:</span>
            <b className="text-cyan-300">⚡ sw.js</b>
          </div>
        </div>

        {/* TAB 1: CORDOVA CLI GUIDE */}
        {activeTab === 'cordova' && (
          <div className="space-y-3">
            <div className="p-3 bg-amber-950/30 rounded-2xl border border-amber-400/30 text-xs text-amber-200 leading-relaxed space-y-1">
              <b className="text-amber-300 block font-bold flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Инструкция по сборке через Apache Cordova</span>
              </b>
              <p className="text-[11px] text-white/80">
                Следуйте 5 шагам для упаковки дневника АСОШ №2 в чистый автономный APK для Android:
              </p>
            </div>

            {/* Step 1: Install Cordova */}
            <div className="p-3 rounded-2xl bg-slate-950/80 border border-white/10 space-y-1.5">
              <div className="flex items-center justify-between">
                <b className="text-xs text-white flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] flex items-center justify-center">
                    1
                  </span>
                  <span>Установка Cordova (Installing Cordova)</span>
                </b>
                <button
                  type="button"
                  onClick={() => copyToClipboard('npm install -g cordova', 'npm install -g cordova')}
                  className="text-[10px] text-cyan-300 hover:text-cyan-200 flex items-center gap-1 bg-white/10 px-2 py-1 rounded-lg cursor-pointer"
                >
                  {copiedField === 'npm install -g cordova' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>Копировать</span>
                </button>
              </div>
              <p className="text-[11px] text-white/60">Cordova работает на Node.js и устанавливается через NPM:</p>
              <pre className="p-2 rounded-xl bg-black/60 border border-white/5 text-[11px] font-mono text-emerald-300 overflow-x-auto select-all">
                npm install -g cordova
              </pre>
            </div>

            {/* Step 2: Create a project */}
            <div className="p-3 rounded-2xl bg-slate-950/80 border border-white/10 space-y-1.5">
              <div className="flex items-center justify-between">
                <b className="text-xs text-white flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] flex items-center justify-center">
                    2
                  </span>
                  <span>Создание проекта (Create a project)</span>
                </b>
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      'cordova create asosh2 ru.asosh2.diary "АСОШ №2"',
                      'Команда создания проекта'
                    )
                  }
                  className="text-[10px] text-cyan-300 hover:text-cyan-200 flex items-center gap-1 bg-white/10 px-2 py-1 rounded-lg cursor-pointer"
                >
                  {copiedField === 'Команда создания проекта' ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  <span>Копировать</span>
                </button>
              </div>
              <p className="text-[11px] text-white/60">Создайте пустой проект с ID пакета АСОШ №2:</p>
              <pre className="p-2 rounded-xl bg-black/60 border border-white/5 text-[11px] font-mono text-cyan-300 overflow-x-auto select-all">
                cordova create asosh2 ru.asosh2.diary "АСОШ №2"
              </pre>
            </div>

            {/* Step 3: Add a platform */}
            <div className="p-3 rounded-2xl bg-slate-950/80 border border-white/10 space-y-1.5">
              <div className="flex items-center justify-between">
                <b className="text-xs text-white flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] flex items-center justify-center">
                    3
                  </span>
                  <span>Добавление платформ (Add a platform)</span>
                </b>
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      'cd asosh2 && cordova platform add android && cordova platform add browser',
                      'Добавление платформ'
                    )
                  }
                  className="text-[10px] text-cyan-300 hover:text-cyan-200 flex items-center gap-1 bg-white/10 px-2 py-1 rounded-lg cursor-pointer"
                >
                  {copiedField === 'Добавление платформ' ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  <span>Копировать</span>
                </button>
              </div>
              <p className="text-[11px] text-white/60">Перейдите в проект и добавьте Android и Browser:</p>
              <pre className="p-2 rounded-xl bg-black/60 border border-white/5 text-[11px] font-mono text-yellow-300 overflow-x-auto select-all">
                cd asosh2{"\n"}cordova platform add android{"\n"}cordova platform add browser
              </pre>
            </div>

            {/* Step 4: Run & Build your app */}
            <div className="p-3 rounded-2xl bg-slate-950/80 border border-white/10 space-y-1.5">
              <div className="flex items-center justify-between">
                <b className="text-xs text-white flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] flex items-center justify-center">
                    4
                  </span>
                  <span>Запуск и компиляция APK (Run & Build)</span>
                </b>
                <button
                  type="button"
                  onClick={() => copyToClipboard('cordova build android', 'cordova build android')}
                  className="text-[10px] text-cyan-300 hover:text-cyan-200 flex items-center gap-1 bg-white/10 px-2 py-1 rounded-lg cursor-pointer"
                >
                  {copiedField === 'cordova build android' ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  <span>Копировать</span>
                </button>
              </div>
              <p className="text-[11px] text-white/60">Запуск на эмуляторе/телефоне или сборка .apk:</p>
              <pre className="p-2 rounded-xl bg-black/60 border border-white/5 text-[11px] font-mono text-emerald-300 overflow-x-auto select-all">
                cordova run android{"\n"}# или чистая сборка APK:{"\n"}cordova build android
              </pre>
            </div>

            {/* Step 5: Plugins & config.xml */}
            <div className="p-3 rounded-2xl bg-slate-950/80 border border-white/10 space-y-2">
              <b className="text-xs text-white flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] flex items-center justify-center">
                  5
                </span>
                <span>Настройка плагинов и config.xml</span>
              </b>
              <p className="text-[11px] text-white/70">
                В приложении уже настроены плагины: Status Bar (сапфировый цвет), Vibration, Splash Screen и Whitelist.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={downloadCordovaConfigXml}
                  className="btn flex-1 min-w-[150px] py-2 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Скачать config.xml</span>
                </button>
                <button
                  type="button"
                  onClick={downloadScript}
                  className="btn flex-1 min-w-[150px] py-2 px-3 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/15 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <FileCode className="w-3.5 h-3.5 text-cyan-300" />
                  <span>Скачать build.sh</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CONFIG.XML API SPECIFICATION & VIEWER */}
        {activeTab === 'configxml' && (
          <div className="space-y-3">
            <div className="p-3 bg-amber-950/30 rounded-2xl border border-amber-400/30 text-xs text-amber-200 leading-relaxed space-y-1.5">
              <div className="flex items-center justify-between">
                <b className="text-amber-300 font-bold flex items-center gap-1.5">
                  <Code2 className="w-4 h-4 text-amber-400" />
                  <span>Спецификация config.xml (W3C Packaged Web Apps)</span>
                </b>
                <button
                  type="button"
                  onClick={() => copyToClipboard(configXmlContent, 'Полный config.xml')}
                  className="text-[10px] bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-2 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                >
                  {copiedField === 'Полный config.xml' ? <Check className="w-3 h-3 text-emerald-950" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedField === 'Полный config.xml' ? 'Скопировано!' : 'Копировать XML'}</span>
                </button>
              </div>
              <p className="text-[11px] text-white/80 leading-relaxed">
                Файл <code className="text-amber-300">config.xml</code> располагается в корне Cordova-проекта и определяет ID пакета (<code className="text-cyan-300">ru.asosh2.diary</code>), ориентацию, статус-бар, плагины и разрешения.
              </p>
            </div>

            {/* XML Code Viewer */}
            <div className="p-2.5 rounded-2xl bg-black/80 border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-white/60 border-b border-white/10 pb-1.5">
                <span className="font-mono text-amber-300 flex items-center gap-1">
                  <span>📄</span>
                  <span>public/config.xml (14.6.0)</span>
                </span>
                <button
                  type="button"
                  onClick={downloadCordovaConfigXml}
                  className="text-[10px] text-cyan-300 hover:text-cyan-200 flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3 h-3" />
                  <span>Скачать файл</span>
                </button>
              </div>
              <pre className="p-2.5 rounded-xl bg-slate-950 text-[10px] sm:text-[11px] font-mono text-cyan-200 max-h-56 overflow-y-auto overflow-x-auto whitespace-pre leading-relaxed select-all">
                {configXmlContent}
              </pre>
            </div>

            {/* Parameters Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                <b className="text-cyan-300 text-[11px] block font-bold">Ключевые атрибуты &lt;widget&gt;:</b>
                <ul className="text-[10px] text-white/70 space-y-0.5 font-mono">
                  <li>• id: <span className="text-purple-300">ru.asosh2.diary</span></li>
                  <li>• version: <span className="text-emerald-300">14.6.0</span></li>
                  <li>• android-versionCode: <span className="text-amber-300">146</span></li>
                  <li>• defaultlocale: <span className="text-cyan-300">ru</span></li>
                </ul>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                <b className="text-amber-300 text-[11px] block font-bold">Параметры &lt;preference&gt;:</b>
                <ul className="text-[10px] text-white/70 space-y-0.5 font-mono">
                  <li>• Orientation: <span className="text-emerald-300">portrait</span></li>
                  <li>• DisallowOverscroll: <span className="text-cyan-300">true</span></li>
                  <li>• BackgroundColor: <span className="text-amber-300">0xff060d1f</span></li>
                  <li>• AndroidEdgeToEdge: <span className="text-purple-300">true</span></li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: MCONVERTOR & WEBVIEW */}
        {activeTab === 'mconvertor' && (
          <div className="space-y-3">
            <div className="space-y-2.5">
              <b className="text-xs font-black text-cyan-300 flex items-center gap-1.5 uppercase tracking-wider">
                <span>Параметры для MConvertor (скопируйте в программу):</span>
              </b>

              {/* Field 1: App URL */}
              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-white/10 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-[10px] text-white/50 block font-mono">1. САЙТ / URL ПРИЛОЖЕНИЯ:</span>
                  <span className="text-xs font-mono text-cyan-200 truncate block">{currentUrl}</span>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(currentUrl, 'URL приложения')}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white shrink-0 cursor-pointer text-xs flex items-center gap-1 font-bold"
                >
                  {copiedField === 'URL приложения' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Field 2: App Name */}
              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-white/10 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-[10px] text-white/50 block font-mono">2. НАЗВАНИЕ ПРИЛОЖЕНИЯ (App Name):</span>
                  <span className="text-xs font-bold text-white">АСОШ №2</span>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard('АСОШ №2', 'Название приложения')}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white shrink-0 cursor-pointer text-xs flex items-center gap-1 font-bold"
                >
                  {copiedField === 'Название приложения' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Field 3: Package Name */}
              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-white/10 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-[10px] text-white/50 block font-mono">3. PACKAGE NAME (ID пакета):</span>
                  <span className="text-xs font-mono text-purple-300">ru.asosh2.diary</span>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard('ru.asosh2.diary', 'Package Name')}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white shrink-0 cursor-pointer text-xs flex items-center gap-1 font-bold"
                >
                  {copiedField === 'Package Name' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Field 4: Orientation */}
              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-white/10 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-[10px] text-white/50 block font-mono">4. ОРИЕНТАЦИЯ ЭКРАНА (Orientation):</span>
                  <span className="text-xs font-bold text-emerald-300">Portrait (Портретная)</span>
                </div>
                <span className="text-[10px] font-mono text-white/50">Автоматически</span>
              </div>
            </div>

            {/* Feature Checkpoints */}
            <div className="p-3 bg-white/5 rounded-2xl border border-white/10 space-y-2 text-xs">
              <b className="text-cyan-300 block font-bold">Особенности поддержки в WebView & APK:</b>
              <ul className="space-y-1.5 text-white/80 text-[11px] leading-relaxed">
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span><b>Аппаратная кнопка «Назад»:</b> закрывает модальные окна, возвращает из вкладок в расписание, а при выходе предупреждает двойным нажатием.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span><b>Вырезы и чёлки (Safe Area):</b> интерфейс автоматически центрируется с учётом статус-бара и навигационных жестов Android.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span><b>Защита от случайных свайпов:</b> отключена лишняя перезагрузка по свайпу вниз (overscroll contain).</span>
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Quick Vibration & Manifest Check */}
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={testVibration}
            className="btn flex-1 min-w-[130px] py-2 px-3 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/15 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Vibrate className="w-3.5 h-3.5 text-cyan-300" />
            <span>Тест виброотклика</span>
          </button>

          <a
            href="/manifest.json"
            target="_blank"
            rel="noopener noreferrer"
            className="btn flex-1 min-w-[130px] py-2 px-3 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 rounded-xl border border-cyan-400/30 text-xs font-bold flex items-center justify-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Открыть manifest.json</span>
          </a>
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="btn purple w-full py-2.5 rounded-2xl text-xs font-bold justify-center cursor-pointer"
        >
          Готово
        </button>
      </div>
    </div>
  );
};

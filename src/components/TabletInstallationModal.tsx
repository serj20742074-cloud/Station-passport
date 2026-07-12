import React, { useState } from 'react';
import { X, Github, Tablet, QrCode, ExternalLink, ArrowRight, CheckCircle, Info } from 'lucide-react';

interface TabletInstallationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAppUrl?: string;
}

export default function TabletInstallationModal({ isOpen, onClose, currentAppUrl = window.location.href }: TabletInstallationModalProps) {
  const [customUrl, setCustomUrl] = useState(currentAppUrl);
  const [activeTab, setActiveTab] = useState<'github' | 'tablet' | 'apk'>('github');

  if (!isOpen) return null;

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(customUrl)}`;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div 
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-2xl relative overflow-hidden flex flex-col my-8 max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
        id="tablet-install-modal"
      >
        {/* RZD Corporate Line */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#e21a1a]" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="bg-red-50 p-2 rounded-xl text-[#e21a1a]">
              <Tablet size={20} className="stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Инструкция по установке на планшет</h3>
              <p className="text-xs text-slate-500 mt-0.5">Публикация через GitHub Pages и запуск как приложение</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex flex-wrap border-b border-slate-100 bg-slate-50/50 p-1.5 gap-1 mx-6 mt-4 rounded-xl border border-slate-200/50" id="tablet-install-tabs">
          <button
            onClick={() => setActiveTab('github')}
            className={`flex-1 min-w-[130px] flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'github'
                ? 'bg-white text-[#e21a1a] shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Github size={14} />
            1. Публикация на GitHub
          </button>
          <button
            onClick={() => setActiveTab('tablet')}
            className={`flex-1 min-w-[130px] flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'tablet'
                ? 'bg-white text-[#e21a1a] shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <QrCode size={14} />
            2. Установка как PWA
          </button>
          <button
            onClick={() => setActiveTab('apk')}
            className={`flex-1 min-w-[130px] flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'apk'
                ? 'bg-white text-[#e21a1a] shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Tablet size={14} />
            3. Сборка APK (Android)
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5 text-slate-700 text-xs sm:text-sm leading-relaxed">
          {activeTab === 'github' && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-200" id="install-github-content">
              {/* Intro box */}
              <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-3.5 flex gap-3 text-emerald-800">
                <CheckCircle size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-bold">Всё уже настроено!</span> Мы создали файл автоматического развертывания <code className="bg-emerald-100/60 px-1 rounded font-mono text-[10px]">deploy.yml</code> и настроили относительные пути в сборщике. Вам осталось только перенести код на свой GitHub.
                </div>
              </div>

              {/* Step 1 */}
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold font-mono text-xs flex items-center justify-center shrink-0">1</div>
                <div>
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm">Экспортируйте проект на GitHub</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    В правом верхнем углу интерфейса Google AI Studio нажмите на иконку настроек (шестеренку) или меню и выберите <span className="font-semibold text-slate-800">Export to GitHub</span>. Следуйте инструкциям для создания репозитория.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold font-mono text-xs flex items-center justify-center shrink-0">2</div>
                <div>
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm">Включите авто-сборку на GitHub</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Откройте ваш репозиторий на сайте <a href="https://github.com" target="_blank" rel="noreferrer" className="text-red-600 hover:underline font-semibold inline-flex items-center gap-0.5">GitHub <ExternalLink size={10} /></a>. Перейдите во вкладку <span className="font-semibold text-slate-800">Settings</span> (Настройки) ➜ <span className="font-semibold text-slate-800">Pages</span> (Страницы) в левой панели.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-[#e21a1a] text-white font-bold font-mono text-xs flex items-center justify-center shrink-0">3</div>
                <div>
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm">Активируйте источник GitHub Actions</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    В разделе <span className="font-semibold text-slate-800">Build and deployment</span> найдите выпадающий список <span className="font-semibold text-slate-800">Source</span> (Источник) и измените значение с <i>Deploy from a branch</i> на <span className="font-bold text-red-600">GitHub Actions</span>.
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold font-mono text-xs flex items-center justify-center shrink-0">4</div>
                <div>
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm">Получите готовую ссылку</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Перейдите на вкладку <span className="font-semibold text-slate-800">Actions</span> вашего репозитория. Вы увидите запущенный процесс сборки. Как только он завершится (зеленая галочка), сверху отобразится ваша постоянная ссылка вида: <code className="bg-slate-50 border border-slate-200 px-1 rounded font-mono text-red-600 font-semibold text-[11px]">https://[имя-пользователя].github.io/[имя-репозитория]/</code>.
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex gap-2.5 text-slate-500 text-[11px] mt-2">
                <Info size={16} className="text-slate-400 shrink-0 mt-0.5" />
                <span>Все последующие изменения, внесенные вами в репозиторий, будут автоматически собираться и обновляться на планшете без ручного вмешательства!</span>
              </div>
            </div>
          )}

          {activeTab === 'tablet' && (
            <div className="flex flex-col md:flex-row gap-6 animate-in fade-in duration-200" id="install-tablet-content">
              {/* QR Code and link setup */}
              <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 border border-slate-200/60 rounded-2xl p-4 text-center">
                <span className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider mb-2">ОТСКАНИРУЙТЕ КАМЕРОЙ ПЛАНШЕТА</span>
                
                <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm mb-3">
                  <img 
                    src={qrCodeUrl} 
                    alt="PWA Installation QR Code" 
                    className="w-48 h-48 sm:w-56 sm:h-56"
                    referrerPolicy="no-referrer"
                  />
                </div>

                <div className="w-full flex flex-col gap-1 text-left mt-1">
                  <label className="text-[10px] font-bold text-slate-500">Адрес приложения (или ваша ссылка GitHub Pages):</label>
                  <input
                    type="text"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500 text-slate-800 font-mono"
                    placeholder="Вставьте ссылку..."
                  />
                  <span className="text-[9px] text-slate-400 mt-0.5">Вставьте вашу постоянную ссылку GitHub Pages, чтобы QR-код обновился.</span>
                </div>
              </div>

              {/* Tablet App Installation Instructions */}
              <div className="flex-1 flex flex-col gap-4 justify-center">
                <div className="border-b border-slate-100 pb-2">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-[#e21a1a] rounded-full" />
                    Как установить на рабочий стол:
                  </h4>
                </div>

                {/* Apple iPad / iPhone */}
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded self-start">Apple iPadOS / iOS (Safari)</span>
                  <ol className="list-decimal list-inside text-xs text-slate-600 pl-1 flex flex-col gap-1 mt-1">
                    <li>Откройте Safari и перейдите по ссылке приложения.</li>
                    <li>Нажмите кнопку <span className="font-semibold text-slate-800">«Поделиться»</span> (квадрат со стрелкой вверх в верхней панели).</li>
                    <li>В меню прокрутите вниз и выберите <span className="font-bold text-red-600">«На экран "Домой"»</span> (Add to Home Screen).</li>
                    <li>Нажмите «Добавить» в правом верхнем углу.</li>
                  </ol>
                </div>

                {/* Android Tablet */}
                <div className="flex flex-col gap-1 mt-2">
                  <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded self-start">Android (Google Chrome / Huawei Browser)</span>
                  <ol className="list-decimal list-inside text-xs text-slate-600 pl-1 flex flex-col gap-1 mt-1">
                    <li>Откройте браузер и перейдите по ссылке приложения.</li>
                    <li>Нажмите кнопку меню <span className="font-semibold text-slate-800">«три точки»</span> в верхнем правом углу.</li>
                    <li>Выберите пункт <span className="font-bold text-red-600">«Добавить на главный экран»</span> (или «Установить приложение»).</li>
                    <li>Подтвердите добавление.</li>
                  </ol>
                </div>

                <div className="bg-[#e21a1a]/5 border border-[#e21a1a]/10 rounded-xl p-3 text-xs text-[#e21a1a] font-medium leading-relaxed">
                  После добавления приложение появится на рабочем столе планшета с красивой иконкой и будет запускаться на весь экран, скрывая адресную строку браузера!
                </div>
              </div>
            </div>
          )}

          {activeTab === 'apk' && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-200" id="install-apk-content">
              {/* Info alert */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex gap-3 text-slate-700">
                <Info size={18} className="text-blue-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-bold">Полноценное Android-приложение (.apk)</span>. Поскольку приложение полностью автономно и хранит данные в IndexedDB, его можно упаковать в нативный APK-файл с помощью CapacitorJS за 5 минут. Это идеальное решение для Huawei MatePad Paper!
                </div>
              </div>

              {/* Step 1 */}
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold font-mono text-xs flex items-center justify-center shrink-0">1</div>
                <div className="flex-1">
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm">Экспорт проекта</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Скачайте код проекта архивом (через меню настроек <span className="font-semibold text-slate-800">«Export as ZIP»</span>) или склонируйте его репозиторий с GitHub на ваш рабочий компьютер.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold font-mono text-xs flex items-center justify-center shrink-0">2</div>
                <div className="flex-1">
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm">Добавление Capacitor в проект</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Откройте терминал в папке проекта на компьютере и выполните команду для установки ядра Capacitor:
                  </p>
                  <pre className="bg-slate-900 text-slate-100 p-2.5 rounded-lg font-mono text-[11px] mt-1.5 overflow-x-auto">
                    npm install @capacitor/core @capacitor/cli<br />
                    npx cap init "Паспорт Станций" "ru.rzd.stations.passport" --web-dir=dist
                  </pre>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold font-mono text-xs flex items-center justify-center shrink-0">3</div>
                <div className="flex-1">
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm">Подключение платформы Android</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Установите Android-пакет и инициализируйте проект Android Studio:
                  </p>
                  <pre className="bg-slate-900 text-slate-100 p-2.5 rounded-lg font-mono text-[11px] mt-1.5 overflow-x-auto">
                    npm install @capacitor/android<br />
                    npx cap add android
                  </pre>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-[#e21a1a] text-white font-bold font-mono text-xs flex items-center justify-center shrink-0">4</div>
                <div className="flex-1">
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm">Сборка и синхронизация веб-кода</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Скомпилируйте наше React-приложение и перенесите файлы в Android-проект:
                  </p>
                  <pre className="bg-slate-900 text-slate-100 p-2.5 rounded-lg font-mono text-[11px] mt-1.5 overflow-x-auto">
                    npm run build<br />
                    npx cap sync
                  </pre>
                </div>
              </div>

              {/* Step 5 */}
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold font-mono text-xs flex items-center justify-center shrink-0">5</div>
                <div className="flex-1">
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm">Сборка готового APK-файла</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Откройте проект в Android Studio одной командой:
                  </p>
                  <pre className="bg-slate-900 text-slate-100 p-2.5 rounded-lg font-mono text-[11px] mt-1.5 overflow-x-auto">
                    npx cap open android
                  </pre>
                  <p className="text-xs text-slate-500 mt-1.5">
                    В верхнем меню Android Studio нажмите: <span className="font-bold text-slate-800">Build</span> ➜ <span className="font-bold text-slate-800">Build Bundle(s) / APK(s)</span> ➜ <span className="font-bold text-red-600">Build APK(s)</span>. 
                  </p>
                  <p className="text-xs text-slate-600 font-medium mt-1">
                    Готовый установочный файл <code className="bg-slate-100 px-1 rounded font-mono text-[#e21a1a] font-bold text-[10px]">app-debug.apk</code> будет собран за минуту! Перенесите его на Huawei MatePad по USB-кабелю или через Telegram/Почту и запустите установку.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer border border-slate-200"
          >
            Закрыть
          </button>
          <button
            onClick={() => {
              if (activeTab === 'github') setActiveTab('tablet');
              else if (activeTab === 'tablet') setActiveTab('apk');
              else setActiveTab('github');
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#e21a1a] hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-sm shadow-red-500/10"
          >
            <span>
              {activeTab === 'github' && 'К установке PWA'}
              {activeTab === 'tablet' && 'К сборке APK'}
              {activeTab === 'apk' && 'Вернуться к GitHub'}
            </span>
            <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

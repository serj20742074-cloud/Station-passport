/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import InteractiveMap from './components/InteractiveMap';
import StationPassportModal from './components/StationPassportModal';
import SchemeEditor from './components/SchemeEditor';
import { STATIONS, STATION_CLASS_INFO } from './data/stations';
import { StationData, StationClass } from './types';
import { 
  Building2, Train, Database, HelpCircle, 
  MapPin, Clipboard, ArrowRight, Layers, FileText,
  Download, Upload, RefreshCw, Check, AlertCircle, Sliders
} from 'lucide-react';
import { exportBackup, importBackup } from './lib/db';

export default function App() {
  const [stations, setStations] = useState<StationData[]>(() => {
    const saved = localStorage.getItem('rzd_custom_stations');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error loading custom stations:', e);
      }
    }
    return STATIONS;
  });

  const [selectedStation, setSelectedStation] = useState<StationData | null>(null);
  const [selectedClassFilter, setSelectedClassFilter] = useState<StationClass | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isEditMode, setIsEditMode] = useState(false);
  
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [backupMessage, setBackupMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleUpdateStations = (newStations: StationData[]) => {
    setStations(newStations);
    localStorage.setItem('rzd_custom_stations', JSON.stringify(newStations));
  };

  const handleResetStations = () => {
    if (window.confirm('Вы уверены, что хотите сбросить все ручные изменения схемы к заводским настройкам?')) {
      localStorage.removeItem('rzd_custom_stations');
      setStations(STATIONS);
      setSelectedStation(null);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    setBackupMessage(null);
    try {
      const backupJson = await exportBackup();
      const blob = new Blob([backupJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rzd_smolensk_stations_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setBackupMessage({ type: 'success', text: 'Резервная копия успешно создана и скачана!' });
      setTimeout(() => setBackupMessage(null), 5000);
    } catch (error) {
      console.error(error);
      setBackupMessage({ type: 'error', text: 'Ошибка при создании резервной копии.' });
      setTimeout(() => setBackupMessage(null), 5000);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!window.confirm('Внимание! Восстановление из резервной копии полностью заменит текущие штатные расписания, показатели и PDF-схемы. Продолжить?')) {
      event.target.value = '';
      return;
    }

    setIsImporting(true);
    setBackupMessage(null);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const jsonText = e.target?.result as string;
          await importBackup(jsonText);
          
          // Re-load custom stations from localStorage after importing backup
          const saved = localStorage.getItem('rzd_custom_stations');
          if (saved) {
            try {
              setStations(JSON.parse(saved));
            } catch (e) {
              setStations(STATIONS);
            }
          } else {
            setStations(STATIONS);
          }

          setBackupMessage({ type: 'success', text: 'Данные успешно восстановлены из резервной копии!' });
          setSelectedStation(null);
          setTimeout(() => setBackupMessage(null), 5000);
        } catch (err: any) {
          console.error(err);
          setBackupMessage({ type: 'error', text: err?.message || 'Ошибка при импорте файла резервной копии.' });
          setTimeout(() => setBackupMessage(null), 5000);
        } finally {
          setIsImporting(false);
        }
      };
      reader.readAsText(file);
    } catch (error) {
      console.error(error);
      setBackupMessage({ type: 'error', text: 'Не удалось прочитать файл резервной копии.' });
      setIsImporting(false);
      setTimeout(() => setBackupMessage(null), 5000);
    } finally {
      event.target.value = '';
    }
  };

  // Group stations by class for statistics
  const stats = useMemo(() => {
    const counts = {
      [StationClass.EXTRA]: 0,
      [StationClass.CLASS_1]: 0,
      [StationClass.CLASS_2]: 0,
      [StationClass.CLASS_3]: 0,
      [StationClass.CLASS_4]: 0,
      [StationClass.CLASS_5]: 0,
    };
    stations.forEach(s => {
      counts[s.classType]++;
    });
    return counts;
  }, [stations]);

  // Filter list of stations for bottom directory view
  const filteredStations = useMemo(() => {
    return stations.filter(s => {
      const matchesClass = selectedClassFilter === 'ALL' || s.classType === selectedClassFilter;
      const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            s.km.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesClass && matchesSearch;
    });
  }, [stations, selectedClassFilter, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-800 font-sans flex flex-col selection:bg-red-500 selection:text-white animate-in fade-in duration-300" id="app-root-container">
      
      {/* Top Professional Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm relative overflow-hidden" id="app-header">
        {/* RZD Corporate Accent Stripe */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#e21a1a]" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="bg-[#e21a1a] p-2.5 rounded-xl text-white shadow-md shadow-red-500/10">
              <Train size={24} className="stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                Паспорт станций Смоленского региона
              </h1>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                Информационно-технический комплекс Смоленского территориального управления МЖД
              </p>
            </div>
          </div>

          {/* Quick Technical Summary Counters */}
          <div className="flex flex-wrap items-center gap-3 md:gap-4 text-xs" id="quick-tech-summary">
            <div className="bg-white border border-slate-200 px-3 py-2 rounded-xl flex items-center gap-2.5 shadow-sm">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-400 animate-pulse" />
              <div>
                <div className="text-slate-400 text-[10px] font-bold font-mono leading-none">ВСЕГО СТАНЦИЙ</div>
                <div className="text-slate-800 font-bold font-mono mt-0.5">{stations.length}</div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 px-3 py-2 rounded-xl flex items-center gap-2.5 shadow-sm">
              <div className="w-2.5 h-2.5 rounded-full bg-red-600" />
              <div>
                <div className="text-slate-400 text-[10px] font-bold font-mono leading-none">ВНЕКЛАССНЫЕ</div>
                <div className="text-slate-800 font-bold font-mono mt-0.5">{stats[StationClass.EXTRA]}</div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 px-3 py-2 rounded-xl flex items-center gap-2.5 shadow-sm">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
              <div>
                <div className="text-slate-400 text-[10px] font-bold font-mono leading-none">I КЛАСС</div>
                <div className="text-slate-800 font-bold font-mono mt-0.5">{stats[StationClass.CLASS_1]}</div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 px-3 py-2 rounded-xl flex items-center gap-2.5 shadow-sm">
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
              <div>
                <div className="text-slate-400 text-[10px] font-bold font-mono leading-none">II КЛАСС</div>
                <div className="text-slate-800 font-bold font-mono mt-0.5">{stats[StationClass.CLASS_2]}</div>
              </div>
            </div>
          </div>

        </div>
      </header>

      {/* Main Body content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex flex-col gap-6" id="app-main-content">
        
        {/* Top Interactive Guideline Ribbon */}
        <section className="bg-white border-l-4 border-l-[#e21a1a] border-y border-r border-slate-200/80 rounded-r-2xl rounded-l-sm p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm" id="welcome-alert">
          <div className="flex items-start gap-3">
            <Clipboard size={18} className="text-[#e21a1a] shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm text-slate-600">
              <span className="font-bold text-slate-900">Инструкция:</span> Выберите интересующую станцию на интерактивной карте Смоленского управления ниже или найдите в списке. В открывшейся карточке паспорта вы сможете загрузить схемы путей и ТРА в PDF, а также импортировать штат и показатели работы из Excel-файлов.
            </div>
          </div>
          <a 
            href="#directory-section" 
            className="text-xs font-bold text-[#e21a1a] hover:text-red-700 flex items-center gap-1 transition-all shrink-0 cursor-pointer"
            id="jump-to-list-link"
          >
            Перейти к списку станций <ArrowRight size={12} />
          </a>
        </section>

        {/* Backup Status Message */}
        {backupMessage && (
          <div 
            className={`p-4 rounded-xl border flex items-center gap-3 text-xs sm:text-sm animate-in fade-in slide-in-from-top-4 duration-300 ${
              backupMessage.type === 'success' 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
            id="backup-status-notification"
          >
            {backupMessage.type === 'success' ? (
              <Check size={18} className="text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle size={18} className="text-red-600 shrink-0" />
            )}
            <span className="font-medium">{backupMessage.text}</span>
          </div>
        )}

        {/* Backup & Restore Panel */}
        <section className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm" id="backup-restore-panel">
          <div className="flex items-start gap-3">
            <Database size={18} className="text-[#e21a1a] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-900 text-xs sm:text-sm">Резервное копирование и восстановление</span>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                Экспортируйте все данные станций (штат, KPI и PDF-файлы схем) в один локальный файл JSON или загрузите ранее созданную копию.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-lg text-xs transition-colors cursor-pointer border border-slate-200 shadow-sm disabled:opacity-50"
              id="export-backup-btn"
            >
              {isExporting ? (
                <RefreshCw size={14} className="text-slate-500 animate-spin" />
              ) : (
                <Download size={14} className="text-slate-500" />
              )}
              {isExporting ? 'Создание копии...' : 'Создать копию данных'}
            </button>
            <label 
              className={`flex items-center gap-1.5 px-3 py-2 bg-[#e21a1a] hover:bg-red-700 text-white font-bold rounded-lg text-xs transition-all shadow-sm cursor-pointer ${isImporting ? 'opacity-50 pointer-events-none' : ''}`}
              id="import-backup-label"
            >
              {isImporting ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <Upload size={14} />
              )}
              <span>{isImporting ? 'Восстановление...' : 'Восстановить из файла'}</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                disabled={isImporting}
                className="hidden"
              />
            </label>
          </div>
        </section>

        {/* Map Section */}
        <section className="flex flex-col gap-3" id="map-section">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
            <div>
              <h2 className="text-xs font-bold font-mono tracking-wider text-slate-400 uppercase flex items-center gap-2">
                <Layers size={14} className="text-[#e21a1a]" />
                Интерактивная карта Смоленского управления МЖД
              </h2>
              <span className="text-[11px] text-slate-400 mt-0.5 block">Масштаб регулируется колесиком мыши. {isEditMode && "Режим редактирования активен: перетаскивайте станции мышкой!"}</span>
            </div>
            
            {/* Map manual edit controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditMode(!isEditMode)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer border ${
                  isEditMode 
                    ? 'bg-red-500 border-red-600 text-white hover:bg-red-600' 
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
                id="edit-mode-toggle"
              >
                <Sliders size={14} className={isEditMode ? 'animate-pulse' : ''} />
                {isEditMode ? 'Редактирование: ВКЛ' : 'Редактировать схему'}
              </button>
              {isEditMode && (
                <button
                  onClick={handleResetStations}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-500 font-bold rounded-xl text-xs transition-colors cursor-pointer border border-slate-200 shadow-sm"
                  id="reset-stations-btn"
                >
                  <RefreshCw size={12} />
                  Сбросить схему
                </button>
              )}
            </div>
          </div>

          <div className={`grid grid-cols-1 ${isEditMode ? 'lg:grid-cols-4' : ''} gap-4 w-full`}>
            <div className={isEditMode ? 'lg:col-span-3 flex flex-col gap-3' : 'w-full flex flex-col gap-3'}>
              <InteractiveMap 
                stations={stations}
                onSelectStation={setSelectedStation}
                selectedStationId={selectedStation?.id}
                isEditMode={isEditMode}
                onUpdateStations={handleUpdateStations}
              />
            </div>
            {isEditMode && (
              <div className="lg:col-span-1 h-full min-h-[500px]">
                <SchemeEditor
                  stations={stations}
                  onUpdateStations={handleUpdateStations}
                  selectedStation={selectedStation}
                  onSelectStation={setSelectedStation}
                />
              </div>
            )}
          </div>
        </section>

        {/* Bottom Station Directory list (Bento layout) */}
        <section className="mt-4 flex flex-col gap-4 border-t border-slate-200 pt-6" id="directory-section">
          
          {/* Header of Section */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building2 size={16} className="text-[#e21a1a]" />
                Реестр железнодорожных станций управления
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Быстрый доступ к электронным паспортам и отчетным документам
              </p>
            </div>

            {/* Filters & Direct Search */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Search in list */}
              <input
                type="text"
                id="directory-search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Фильтр по названию..."
                className="bg-white border border-slate-200 text-slate-800 text-xs px-3 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 transition-all placeholder-slate-400 shadow-sm"
              />

              {/* Class filters */}
              <select
                id="directory-class-filter"
                value={selectedClassFilter}
                onChange={(e) => setSelectedClassFilter(e.target.value as any)}
                className="bg-white border border-slate-200 text-slate-800 text-xs px-3 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500 transition-all shadow-sm"
              >
                <option value="ALL">Все классы</option>
                {Object.values(StationClass).map(cls => (
                  <option key={cls} value={cls}>{cls} класс ({stats[cls]})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Cards Directory Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3" id="directory-grid">
            {filteredStations.map((station) => {
              const classInfo = STATION_CLASS_INFO[station.classType];
              const isSelected = selectedStation?.id === station.id;
              
              return (
                <button
                  key={station.id}
                  id={`directory-card-${station.id}`}
                  onClick={() => setSelectedStation(station)}
                  className={`p-3.5 bg-white hover:bg-slate-50 border text-left rounded-xl transition-all flex flex-col justify-between h-28 group relative overflow-hidden cursor-pointer shadow-sm hover:shadow-md ${
                    isSelected 
                      ? 'border-[#e21a1a] ring-1 ring-[#e21a1a]/30 bg-red-50/10' 
                      : 'border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold font-mono tracking-wider uppercase mb-1" style={{ color: classInfo.bg }}>
                      {station.classType} КЛАСС
                    </span>
                    <span className="text-sm font-bold text-slate-800 group-hover:text-[#e21a1a] transition-all leading-snug">{station.name}</span>
                  </div>
                  
                  <div className="mt-auto flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>км {station.km}</span>
                    <span className="opacity-0 group-hover:opacity-100 transition-all text-[#e21a1a] font-bold">Паспорт →</span>
                  </div>
                  
                  {/* Decorative background class identifier */}
                  <span className="absolute -right-3 -bottom-5 text-7xl font-bold text-slate-200/40 pointer-events-none select-none font-sans">
                    {station.classType}
                  </span>
                </button>
              );
            })}

            {filteredStations.length === 0 && (
              <div className="col-span-full py-12 text-center text-xs text-slate-400" id="no-stations-found">
                Станций по выбранным критериям не найдено.
              </div>
            )}
          </div>

        </section>

      </main>

      {/* Professional Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12 text-xs text-slate-500" id="app-footer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div>
            <div className="font-semibold text-slate-700">Паспорт станций • Smolensk Territory (МЖД)</div>
            <p className="mt-1 text-slate-400">Информационно-справочная система учета и паспортизации железнодорожных станций Смоленского региона.</p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono text-slate-400">
            <span>IndexedDB: Активен</span>
            <span>XLSX Engine: Запущен</span>
            <span>Vite SPA v6.2</span>
          </div>
        </div>
      </footer>

      {/* Dynamic Slide-over Passport Modal */}
      {selectedStation && (
        <StationPassportModal 
          station={selectedStation}
          onClose={() => setSelectedStation(null)}
        />
      )}

    </div>
  );
}

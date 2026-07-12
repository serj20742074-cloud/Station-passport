import React, { useState, useEffect } from 'react';
import { 
  BarChart2, Award, AlertCircle, CheckCircle2, AlertTriangle, 
  Search, RefreshCw, FileText, Smartphone, LayoutGrid, Check, Info, Download
} from 'lucide-react';
import { StationData, StationIndicator, StationClass } from '../types';
import { getIndicators, getAllIndicatorsMap } from '../lib/db';
import { DEFAULT_INDICATORS } from '../data/stations';
import * as XLSX from 'xlsx';

interface WorkAnalysisProps {
  stations: StationData[];
  onSelectStation: (station: StationData) => void;
}

export default function WorkAnalysis({ stations, onSelectStation }: WorkAnalysisProps) {
  // Mode selection: 'region' (all stations) or 'station' (specific station)
  const [analysisType, setAnalysisType] = useState<'region' | 'station'>('region');
  const [selectedStationId, setSelectedStationId] = useState<string>(stations[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Local Database State
  const [allIndicators, setAllIndicators] = useState<Record<string, StationIndicator[]>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Huawei MatePad Paper 10.5 E-Ink Compatibility Mode
  const [isEInkMode, setIsEInkMode] = useState<boolean>(() => {
    return localStorage.getItem('matepad_eink_mode') === 'true';
  });

  // Load all indicators from DB (merge with DEFAULT_INDICATORS)
  useEffect(() => {
    let active = true;
    async function loadData() {
      setIsLoading(true);
      try {
        const customIndicatorsMap = await getAllIndicatorsMap();
        if (!active) return;
        
        const merged: Record<string, StationIndicator[]> = {};
        stations.forEach(s => {
          merged[s.id] = customIndicatorsMap[s.id] || DEFAULT_INDICATORS[s.id] || [];
        });
        setAllIndicators(merged);
      } catch (err) {
        console.error('Error loading work analysis indicators:', err);
        // Fallback entirely to default indicators
        const merged: Record<string, StationIndicator[]> = {};
        stations.forEach(s => {
          merged[s.id] = DEFAULT_INDICATORS[s.id] || [];
        });
        setAllIndicators(merged);
      } finally {
        if (active) setIsLoading(false);
      }
    }
    loadData();
    return () => { active = false; };
  }, [stations, refreshTrigger]);

  const toggleEInkMode = () => {
    const newValue = !isEInkMode;
    setIsEInkMode(newValue);
    localStorage.setItem('matepad_eink_mode', String(newValue));
  };

  // Helper helper to check if indicator is successful
  // For 'простой' or 'оборот' or 'время', exceeding plan (>100%) is bad (not successful). 
  // Under or equal to plan is good (successful).
  const isIndicatorSuccess = (item: StationIndicator): boolean => {
    if (item.plan === 0) return true;
    const isIdle = item.metric.toLowerCase().includes('простой') || item.metric.toLowerCase().includes('оборот');
    return isIdle ? item.percent <= 100 : item.percent >= 100;
  };

  // Calculate global summary metrics
  const getGlobalStats = () => {
    let totalStationsWithData = 0;
    let totalCargoFact = 0; // Tons
    let totalCargoPlan = 0; // Tons
    let totalLoadingWagonsFact = 0; // Wagons per day
    let totalLoadingWagonsPlan = 0; // Wagons per day
    let totalUnloadingWagonsFact = 0;
    let totalUnloadingWagonsPlan = 0;
    
    // For local wagon idle times
    let localIdleTotalSum = 0;
    let localIdleCount = 0;
    let localIdlePlanSum = 0;

    // For transit wagon idle times
    let transitIdleTotalSum = 0;
    let transitIdleCount = 0;

    // compliance statistics
    let totalIndicatorsCount = 0;
    let successfulIndicatorsCount = 0;

    Object.keys(allIndicators).forEach((stationId) => {
      const indList = allIndicators[stationId] || [];
      if (indList.length > 0) totalStationsWithData++;
      
      indList.forEach(ind => {
        totalIndicatorsCount++;
        if (isIndicatorSuccess(ind)) {
          successfulIndicatorsCount++;
        }

        const mName = ind.metric.toLowerCase();
        
        // 1. Cargo volumes (tons)
        if (mName.includes('объем погрузки') || (mName.includes('погрузка') && ind.unit.toLowerCase().includes('тонн'))) {
          totalCargoFact += ind.fact;
          totalCargoPlan += ind.plan;
        }

        // 2. Loading wagons (ваг/сут)
        if (mName.includes('погрузка') && ind.unit.toLowerCase().includes('ваг')) {
          totalLoadingWagonsFact += ind.fact;
          totalLoadingWagonsPlan += ind.plan;
        }

        // 3. Unloading wagons (ваг/сут)
        if (mName.includes('выгрузка') && ind.unit.toLowerCase().includes('ваг')) {
          totalUnloadingWagonsFact += ind.fact;
          totalUnloadingWagonsPlan += ind.plan;
        }

        // 4. Local wagon idle time
        if (mName.includes('простой местных') || mName.includes('простой под одной')) {
          localIdleTotalSum += ind.fact;
          localIdlePlanSum += ind.plan;
          localIdleCount++;
        }

        // 5. Transit wagon idle time
        if (mName.includes('простой транзит')) {
          transitIdleTotalSum += ind.fact;
          transitIdleCount++;
        }
      });
    });

    const averageLocalIdleFact = localIdleCount > 0 ? localIdleTotalSum / localIdleCount : 0;
    const averageLocalIdlePlan = localIdleCount > 0 ? localIdlePlanSum / localIdleCount : 0;
    const averageTransitIdleFact = transitIdleCount > 0 ? transitIdleTotalSum / transitIdleCount : 0;
    const complianceRate = totalIndicatorsCount > 0 ? (successfulIndicatorsCount / totalIndicatorsCount) * 100 : 100;

    return {
      totalStationsWithData,
      totalCargoFact,
      totalCargoPlan,
      totalLoadingWagonsFact,
      totalLoadingWagonsPlan,
      totalUnloadingWagonsFact,
      totalUnloadingWagonsPlan,
      averageLocalIdleFact,
      averageLocalIdlePlan,
      averageTransitIdleFact,
      complianceRate,
      totalIndicatorsCount,
      successfulIndicatorsCount
    };
  };

  const globalStats = getGlobalStats();

  // Find worst performing stations for Local Idle Time
  const getWorstIdleStations = () => {
    const list: { stationName: string; plan: number; fact: number; excessPercent: number; excessHours: number }[] = [];
    
    Object.keys(allIndicators).forEach((stationId) => {
      const indList = allIndicators[stationId] || [];
      const station = stations.find(s => s.id === stationId);
      if (!station) return;

      indList.forEach(ind => {
        const mName = ind.metric.toLowerCase();
        if (mName.includes('простой местных') || mName.includes('простой под одной')) {
          if (ind.plan > 0 && ind.fact > ind.plan) {
            const excessHours = ind.fact - ind.plan;
            const excessPercent = Math.round((excessHours / ind.plan) * 1000) / 10;
            list.push({
              stationName: station.name,
              plan: ind.plan,
              fact: ind.fact,
              excessPercent,
              excessHours: Math.round(excessHours * 100) / 100
            });
          }
        }
      });
    });

    return list.sort((a, b) => b.excessPercent - a.excessPercent).slice(0, 5);
  };

  const worstIdleStations = getWorstIdleStations();

  // Find best performing stations for Local Idle Time or general indicators compliance
  const getBestComplianceStations = () => {
    const list: { station: StationData; successRate: number; totalCount: number; successCount: number }[] = [];

    Object.keys(allIndicators).forEach((stationId) => {
      const indList = allIndicators[stationId] || [];
      const station = stations.find(s => s.id === stationId);
      if (!station || indList.length === 0) return;

      let successCount = 0;
      indList.forEach(ind => {
        if (isIndicatorSuccess(ind)) successCount++;
      });

      list.push({
        station,
        successRate: Math.round((successCount / indList.length) * 100),
        totalCount: indList.length,
        successCount
      });
    });

    return list.sort((a, b) => b.successRate - a.successRate).slice(0, 5);
  };

  const bestComplianceStations = getBestComplianceStations();

  // Filter stations based on search query
  const filteredStations = stations.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.classType.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedStation = stations.find(s => s.id === selectedStationId);
  const selectedStationIndicators = allIndicators[selectedStationId] || [];

  // Export report of all stations indicators to Excel
  const handleExportAllIndicatorsReport = () => {
    const dataRows: any[] = [];
    
    // Header
    dataRows.push(['АНАЛИЗ ВЫПОЛНЕНИЯ ПОКАЗАТЕЛЕЙ РАБОТЫ СТАНЦИЙ СМОЛЕНСКОГО РЕГИОНА']);
    dataRows.push([`Отчет сформирован автономно: ${new Date().toLocaleDateString('ru-RU')} ${new Date().toLocaleTimeString('ru-RU')}`]);
    dataRows.push([]);
    dataRows.push(['Станция', 'Показатель', 'Ед. изм.', 'План', 'Факт', 'Выполнение %', 'Статус']);

    stations.forEach(s => {
      const inds = allIndicators[s.id] || [];
      if (inds.length === 0) {
        dataRows.push([s.name, 'Нет загруженных показателей за текущий период', '-', '-', '-', '-', '-']);
      } else {
        inds.forEach(ind => {
          const success = isIndicatorSuccess(ind);
          const statusText = success ? 'В НОРМЕ / ВЫПОЛНЕНО' : 'ПРЕВЫШЕНИЕ / НЕ ВЫПОЛНЕНО';
          dataRows.push([
            s.name,
            ind.metric,
            ind.unit,
            ind.plan || '-',
            ind.fact,
            `${ind.percent}%`,
            statusText
          ]);
        });
      }
    });

    const ws = XLSX.utils.aoa_to_sheet(dataRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Анализ работы региона');
    XLSX.writeFile(wb, `Анализ_Показателей_Смоленский_Регион_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className={`p-4 sm:p-6 rounded-2xl border transition-colors ${
      isEInkMode 
        ? 'bg-white border-black text-black' 
        : 'bg-white border-slate-200 shadow-sm text-slate-800'
    }`} id="work-analysis-container">
      
      {/* Header with selector and E-Ink mode toggle */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4 mb-6 ${
        isEInkMode ? 'border-black' : 'border-slate-100'
      }`}>
        <div>
          <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
            <BarChart2 className={isEInkMode ? 'text-black' : 'text-[#e21a1a]'} size={22} />
            <span>Анализ работы и оценка эффективности Смоленского региона</span>
          </h2>
          <p className={`text-xs mt-1 ${isEInkMode ? 'text-black font-semibold' : 'text-slate-400'}`}>
            Мониторинг соблюдения технологических норм простоя и объемов погрузки/выгрузки
          </p>
        </div>

        {/* Action controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* E-ink mode toggle for Huawei MatePad Paper */}
          <button
            onClick={toggleEInkMode}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
              isEInkMode 
                ? 'bg-black text-white border-black' 
                : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
            }`}
            title="Оптимизировать отображение для e-ink экрана планшета Huawei MatePad Paper (высокий контраст, без градиентов и анимации)"
            id="toggle-eink-mode-btn"
          >
            <Smartphone size={13} />
            <span>{isEInkMode ? 'Режим E-Ink: ВКЛ' : 'Режим E-Ink'}</span>
          </button>

          {/* Refresh button */}
          <button
            onClick={() => setRefreshTrigger(prev => prev + 1)}
            className={`p-2 rounded-lg border transition-all cursor-pointer ${
              isEInkMode 
                ? 'border-black hover:bg-black hover:text-white' 
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
            title="Обновить аналитические данные из локальной базы"
            id="refresh-analytics-btn"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>

          {/* Excel Export report */}
          <button
            onClick={handleExportAllIndicatorsReport}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              isEInkMode 
                ? 'border border-black bg-white hover:bg-black hover:text-white text-black' 
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
            }`}
            title="Экспортировать сводный аналитический отчет в файл Excel"
            id="export-analytics-report-btn"
          >
            <Download size={13} />
            <span>Скачать отчет (Excel)</span>
          </button>
        </div>
      </div>

      {/* Standalone state notification */}
      <div className={`mb-6 p-3 rounded-xl border flex items-center justify-between text-xs ${
        isEInkMode 
          ? 'bg-white border-black border-2 text-black font-mono' 
          : 'bg-cyan-50 border-cyan-100 text-cyan-800'
      }`}>
        <div className="flex items-center gap-2">
          <Info size={14} className="shrink-0" />
          <span>
            <strong>Автономная работа на планшете (Huawei MatePad Paper 10.5):</strong> Приложение работает полностью автономно. Все графики, показатели и расчёты производятся непосредственно на вашем устройстве без обращения к интернету. Данные хранятся локально в IndexedDB.
          </span>
        </div>
      </div>

      {/* Selection Tabs */}
      <div className="flex p-1 bg-slate-100 rounded-xl max-w-md mb-6 border border-slate-200" id="analytics-tabs-wrapper">
        <button
          onClick={() => setAnalysisType('region')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold tracking-wide transition-all cursor-pointer ${
            analysisType === 'region'
              ? (isEInkMode ? 'bg-black text-white font-mono' : 'bg-[#e21a1a] text-white shadow-sm')
              : 'text-slate-600 hover:text-slate-900'
          }`}
          id="analytics-tab-region-btn"
        >
          <LayoutGrid size={13} />
          <span>СВОДНЫЙ АНАЛИЗ РЕГИОНА</span>
        </button>
        <button
          onClick={() => setAnalysisType('station')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold tracking-wide transition-all cursor-pointer ${
            analysisType === 'station'
              ? (isEInkMode ? 'bg-black text-white font-mono' : 'bg-[#e21a1a] text-white shadow-sm')
              : 'text-slate-600 hover:text-slate-900'
          }`}
          id="analytics-tab-station-btn"
        >
          <Smartphone size={13} />
          <span>АНАЛИЗ ПО СТАНЦИЯМ</span>
        </button>
      </div>

      {/* MAIN ANALYSIS CONTENT AREA */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400" id="analytics-loading-state">
          <RefreshCw size={32} className="animate-spin text-[#e21a1a]" />
          <span className="text-sm font-bold">Вычисление показателей и построение графиков...</span>
        </div>
      ) : (
        <>
          {/* ANALYSIS TYPE 1: REGIONAL SUMMARY */}
          {analysisType === 'region' && (
            <div className="flex flex-col gap-6" id="region-analysis-section">
              
              {/* Top Score Bento Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="region-kpi-grid">
                
                {/* Total Compliance Rate */}
                <div className={`p-4 rounded-xl border flex flex-col justify-between ${
                  isEInkMode 
                    ? 'border-black border-2 bg-white' 
                    : 'border-slate-150 bg-gradient-to-br from-slate-50 to-white'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Выполнение норм</span>
                    <Award size={16} className={isEInkMode ? 'text-black' : 'text-amber-500'} />
                  </div>
                  <div>
                    <span className="text-2xl font-mono font-black text-slate-800">
                      {Math.round(globalStats.complianceRate * 10) / 10}%
                    </span>
                    <div className="text-[10px] text-slate-500 mt-1">
                      {globalStats.successfulIndicatorsCount} из {globalStats.totalIndicatorsCount} параметров в норме
                    </div>
                  </div>
                </div>

                {/* Total Loading (Tons) */}
                <div className={`p-4 rounded-xl border flex flex-col justify-between ${
                  isEInkMode 
                    ? 'border-black border-2 bg-white' 
                    : 'border-slate-150 bg-gradient-to-br from-slate-50 to-white'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Погрузка грузов (тонн)</span>
                    <FileText size={16} className={isEInkMode ? 'text-black' : 'text-[#e21a1a]'} />
                  </div>
                  <div>
                    <span className="text-2xl font-mono font-black text-slate-800">
                      {globalStats.totalCargoFact.toLocaleString('ru-RU')}
                    </span>
                    <div className="text-[10px] text-slate-500 mt-1">
                      При плане: {globalStats.totalCargoPlan.toLocaleString('ru-RU')} тонн
                      {globalStats.totalCargoPlan > 0 && (
                        <span className={`font-bold ml-1 ${globalStats.totalCargoFact >= globalStats.totalCargoPlan ? 'text-emerald-600' : 'text-[#e21a1a]'}`}>
                          ({Math.round((globalStats.totalCargoFact / globalStats.totalCargoPlan) * 100)}%)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Average Local Idle Time */}
                <div className={`p-4 rounded-xl border flex flex-col justify-between ${
                  isEInkMode 
                    ? 'border-black border-2 bg-white' 
                    : 'border-slate-150 bg-gradient-to-br from-slate-50 to-white'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ср. Простой местного вагона</span>
                    <AlertTriangle size={16} className={isEInkMode ? 'text-black' : 'text-orange-500'} />
                  </div>
                  <div>
                    <span className="text-2xl font-mono font-black text-slate-800">
                      {Math.round(globalStats.averageLocalIdleFact * 100) / 100} ч.
                    </span>
                    <div className="text-[10px] text-slate-500 mt-1">
                      Ср. по плану: {Math.round(globalStats.averageLocalIdlePlan * 100) / 100} ч.
                      {globalStats.averageLocalIdlePlan > 0 && (
                        <span className={`font-bold ml-1 ${globalStats.averageLocalIdleFact <= globalStats.averageLocalIdlePlan ? 'text-emerald-600' : 'text-[#e21a1a]'}`}>
                          ({Math.round((globalStats.averageLocalIdleFact / globalStats.averageLocalIdlePlan) * 100)}%)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Average Unloading */}
                <div className={`p-4 rounded-xl border flex flex-col justify-between ${
                  isEInkMode 
                    ? 'border-black border-2 bg-white' 
                    : 'border-slate-150 bg-gradient-to-br from-slate-50 to-white'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Выгрузка вагонов</span>
                    <CheckCircle2 size={16} className={isEInkMode ? 'text-black' : 'text-emerald-500'} />
                  </div>
                  <div>
                    <span className="text-2xl font-mono font-black text-slate-800">
                      {globalStats.totalUnloadingWagonsFact} ваг/сут
                    </span>
                    <div className="text-[10px] text-slate-500 mt-1">
                      При плане: {globalStats.totalUnloadingWagonsPlan} ваг/сут
                      {globalStats.totalUnloadingWagonsPlan > 0 && (
                        <span className={`font-bold ml-1 ${globalStats.totalUnloadingWagonsFact >= globalStats.totalUnloadingWagonsPlan ? 'text-emerald-600' : 'text-[#e21a1a]'}`}>
                          ({Math.round((globalStats.totalUnloadingWagonsFact / globalStats.totalUnloadingWagonsPlan) * 100)}%)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

              </div>

              {/* Graphical Analysis Section (Native SVG responsive charts) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="region-visual-charts">
                
                {/* Horizontal Bar Chart: Cargo Volume Top Stations */}
                <div className={`lg:col-span-7 p-5 rounded-xl border ${
                  isEInkMode ? 'border-black border-2' : 'border-slate-100 bg-slate-50/20'
                }`} id="cargo-top-chart-card">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4">
                    Объемы погрузки грузов по станциям (План vs Факт, тонн)
                  </h3>

                  <div className="space-y-4" id="cargo-bars-container">
                    {stations
                      .map(s => {
                        const inds = allIndicators[s.id] || [];
                        const cargoInd = inds.find(ind => {
                          const name = ind.metric.toLowerCase();
                          return name.includes('объем погрузки') || (name.includes('погрузка') && ind.unit.toLowerCase().includes('тонн'));
                        });
                        return {
                          name: s.name,
                          plan: cargoInd?.plan || 0,
                          fact: cargoInd?.fact || 0,
                        };
                      })
                      .filter(item => item.fact > 0 || item.plan > 0)
                      .sort((a, b) => b.fact - a.fact)
                      .slice(0, 7)
                      .map((item, idx) => {
                        const maxVal = Math.max(...stations.map(s => {
                          const cargoInd = (allIndicators[s.id] || []).find(ind => ind.metric.toLowerCase().includes('погрузка') && ind.unit.toLowerCase().includes('тонн'));
                          return Math.max(cargoInd?.fact || 0, cargoInd?.plan || 0);
                        }));
                        const factWidthPercent = maxVal > 0 ? (item.fact / maxVal) * 100 : 0;
                        const planWidthPercent = maxVal > 0 ? (item.plan / maxVal) * 100 : 0;
                        
                        return (
                          <div key={`cargo-bar-${idx}`} className="text-xs">
                            <div className="flex justify-between font-semibold text-slate-700 mb-1">
                              <span>{item.name}</span>
                              <span>
                                Ф: <strong className="font-mono">{item.fact.toLocaleString('ru-RU')}</strong>
                                <span className="text-slate-400 font-normal"> / П: {item.plan.toLocaleString('ru-RU')}</span>
                              </span>
                            </div>
                            
                            {/* Visual Bar tracks */}
                            <div className="w-full h-5 bg-slate-100 rounded overflow-hidden relative">
                              {/* Plan line/area */}
                              <div 
                                className={`absolute top-0 bottom-0 left-0 border-r-2 ${
                                  isEInkMode ? 'bg-transparent border-dashed border-black' : 'bg-slate-300/30 border-slate-500'
                                }`}
                                style={{ width: `${planWidthPercent}%` }}
                              />
                              {/* Fact area */}
                              <div 
                                className={`h-full transition-all duration-500 ${
                                  isEInkMode 
                                    ? 'bg-black' 
                                    : (item.fact >= item.plan ? 'bg-emerald-500' : 'bg-red-500/80')
                                }`}
                                style={{ width: `${factWidthPercent}%` }}
                              />
                            </div>
                          </div>
                        );
                      })
                    }
                  </div>
                </div>

                {/* Performance Alerts and worst local wagon idle times */}
                <div className="lg:col-span-5 flex flex-col gap-4" id="alerts-compliance-column">
                  
                  {/* Underperforming List: Where wagon idle is above norm */}
                  <div className={`p-5 rounded-xl border flex-1 ${
                    isEInkMode ? 'border-black border-2' : 'border-slate-100 bg-slate-50/20'
                  }`}>
                    <h3 className="text-xs font-bold text-[#e21a1a] uppercase tracking-wider mb-4 flex items-center gap-1.5">
                      <AlertCircle size={14} />
                      <span>Превышение простоя местных вагонов (Топ-5)</span>
                    </h3>

                    {worstIdleStations.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-1.5">
                        <CheckCircle2 size={24} className="text-emerald-500" />
                        <span>Все станции соблюдают нормы простоя местных вагонов!</span>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {worstIdleStations.map((item, idx) => (
                          <div key={`worst-idle-${idx}`} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between text-xs">
                            <div>
                              <strong className="text-slate-700">{item.stationName}</strong>
                              <div className="text-slate-400 text-[10px]">
                                План: {item.plan} ч. | Факт: <span className="font-bold text-[#e21a1a] font-mono">{item.fact} ч.</span>
                              </div>
                            </div>
                            <div className={`px-2 py-1 rounded text-[10px] font-mono font-bold text-right border ${
                              isEInkMode 
                                ? 'border-black font-semibold' 
                                : 'text-red-700 bg-red-50 border-red-200'
                            }`}>
                              +{item.excessHours} ч. (+{item.excessPercent}%)
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Best Performing Compliance List */}
                  <div className={`p-5 rounded-xl border flex-1 ${
                    isEInkMode ? 'border-black border-2' : 'border-slate-100 bg-slate-50/20'
                  }`}>
                    <h3 className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                      <Award size={14} />
                      <span>Лидеры по соблюдению показателей (Топ-5)</span>
                    </h3>

                    {bestComplianceStations.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 text-xs">
                        Нет данных о показателях.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {bestComplianceStations.map((item, idx) => (
                          <div key={`best-comp-${idx}`} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between text-xs" onClick={() => onSelectStation(item.station)}>
                            <div className="cursor-pointer hover:underline">
                              <strong className="text-slate-700">{item.station.name}</strong>
                              <div className="text-slate-400 text-[10px]">
                                {item.successCount} из {item.totalCount} показателей в норме
                              </div>
                            </div>
                            <div className={`px-2 py-1 rounded text-[10px] font-mono font-bold text-right border ${
                              isEInkMode 
                                ? 'border-black font-semibold' 
                                : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                            }`}>
                              {item.successRate}% выполнения
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>

              </div>

              {/* Full Stations Compliance Grid Heatmap */}
              <div className={`p-5 rounded-xl border ${
                isEInkMode ? 'border-black border-2' : 'border-slate-100 bg-slate-50/20'
              }`} id="region-compliance-heatmap">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                  Тепловая карта качества работы станций региона за отчетный месяц
                </h3>
                <span className="text-[10px] text-slate-400 block mb-5 leading-relaxed">
                  Зеленым отмечены станции со 100% выполнением норм технологического процесса и планов. Красным отмечены станции, имеющие отклонения (превышение норм простоя вагонов или невыполнение объемов погрузки/выгрузки). Нажмите на название станции для открытия ее электронного паспорта.
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {stations.map(s => {
                    const inds = allIndicators[s.id] || [];
                    if (inds.length === 0) {
                      return (
                        <div 
                          key={`heatmap-st-${s.id}`}
                          className={`p-3 rounded-lg border text-center transition-all ${
                            isEInkMode ? 'border-dashed border-slate-300 bg-white' : 'border-slate-100 bg-slate-50/30'
                          }`}
                        >
                          <span className="text-xs font-bold text-slate-400 block truncate">{s.name}</span>
                          <span className="text-[9px] text-slate-400">Нет данных</span>
                        </div>
                      );
                    }

                    const totalCount = inds.length;
                    const successCount = inds.filter(ind => isIndicatorSuccess(ind)).length;
                    const isAllOk = successCount === totalCount;
                    const percent = Math.round((successCount / totalCount) * 100);

                    return (
                      <div 
                        key={`heatmap-st-${s.id}`}
                        onClick={() => onSelectStation(s)}
                        className={`p-3 rounded-lg border text-center cursor-pointer transition-all hover:scale-[1.02] ${
                          isAllOk 
                            ? (isEInkMode 
                                ? 'border-black border-2 bg-white text-black font-semibold' 
                                : 'border-emerald-100 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-800') 
                            : (isEInkMode 
                                ? 'border-black border-2 border-double bg-white text-black font-semibold' 
                                : 'border-red-100 bg-red-50/50 hover:bg-red-50 text-red-800')
                        }`}
                        title={`Станция ${s.name}: в норме ${successCount} из ${totalCount} показателей (${percent}%)`}
                      >
                        <span className="text-xs font-black block truncate">{s.name}</span>
                        <div className="flex items-center justify-center gap-1 mt-1 text-[10px] font-mono font-bold">
                          {isAllOk ? (
                            <span className="text-[9px]">В норме 100%</span>
                          ) : (
                            <span className="text-[9px]">Норма: {percent}% ({successCount}/{totalCount})</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* ANALYSIS TYPE 2: STATION-SPECIFIC VIEW */}
          {analysisType === 'station' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="station-analysis-section">
              
              {/* Left Column: Station Selector & Search list */}
              <div className="lg:col-span-4 flex flex-col gap-4">
                <div className={`p-4 rounded-xl border ${
                  isEInkMode ? 'border-black border-2' : 'border-slate-100 bg-slate-50/50'
                }`}>
                  <span className="text-xs font-bold text-slate-500 block mb-3 uppercase tracking-wider">Выбор станции для анализа</span>
                  
                  {/* Search input */}
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                    <input
                      type="text"
                      placeholder="Поиск станции..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={`w-full pl-9 pr-3 py-2 text-xs rounded-lg border transition-all ${
                        isEInkMode 
                          ? 'border-black bg-white focus:outline-none focus:ring-1 focus:ring-black' 
                          : 'border-slate-200 focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400'
                      }`}
                    />
                  </div>

                  {/* Stations List box */}
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 pr-1 text-xs">
                    {filteredStations.map((s) => {
                      const inds = allIndicators[s.id] || [];
                      const successCount = inds.filter(ind => isIndicatorSuccess(ind)).length;
                      const hasData = inds.length > 0;
                      const isSelected = s.id === selectedStationId;

                      return (
                        <button
                          key={`sel-${s.id}`}
                          onClick={() => setSelectedStationId(s.id)}
                          className={`w-full text-left py-2 px-3 rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                            isSelected 
                              ? (isEInkMode ? 'bg-black text-white font-semibold' : 'bg-red-50 text-red-900 font-bold border-l-4 border-[#e21a1a]') 
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          <div>
                            <div className="font-bold truncate max-w-[150px]">{s.name}</div>
                            <span className="text-[9px] text-slate-400">{s.classType} класс • {s.km} км</span>
                          </div>

                          {hasData ? (
                            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                              inds.length === successCount 
                                ? (isSelected && !isEInkMode ? 'bg-emerald-600 text-white' : 'text-emerald-700 bg-emerald-50')
                                : (isSelected && !isEInkMode ? 'bg-red-500 text-white' : 'text-red-700 bg-red-50')
                            }`}>
                              {successCount}/{inds.length}
                            </span>
                          ) : (
                            <span className="text-[9px] text-slate-400">Нет данных</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {selectedStation && (
                  <button
                    onClick={() => onSelectStation(selectedStation)}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center justify-center gap-1.5 ${
                      isEInkMode 
                        ? 'border-black hover:bg-black hover:text-white text-black font-mono' 
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700 bg-white'
                    }`}
                  >
                    <FileText size={14} />
                    <span>Открыть Электронный паспорт</span>
                  </button>
                )}
              </div>

              {/* Right Column: Station Specific Report Card */}
              <div className="lg:col-span-8 flex flex-col gap-4">
                {selectedStation ? (
                  <div className={`p-5 rounded-xl border flex-1 flex flex-col ${
                    isEInkMode ? 'border-black border-2' : 'border-slate-100 bg-slate-50/10'
                  }`} id="station-analysis-report-card">
                    
                    {/* Header info */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3 mb-4">
                      <div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          isEInkMode 
                            ? 'border-black text-black' 
                            : 'bg-red-50 text-red-700 border-red-100'
                        }`}>
                          Класс станции: {selectedStation.classType}
                        </span>
                        <h3 className="text-base font-black text-slate-800 mt-1">{selectedStation.name}</h3>
                        <span className="text-xs text-slate-400 mt-0.5 block">
                          Координата: {selectedStation.km} км • Анализ технологических норм работы за текущий период
                        </span>
                      </div>
                    </div>

                    {/* Performance metrics list */}
                    {selectedStationIndicators.length === 0 ? (
                      <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                        <AlertCircle size={32} className="text-slate-300" />
                        <div>
                          <strong className="text-slate-600 text-xs block">Показатели работы еще не внесены</strong>
                          <span className="text-xs text-slate-400">Для заполнения воспользуйтесь кнопкой "Импорт показателей работы (Excel)" на главном экране.</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-5">
                        
                        {/* Indicators summary block */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {selectedStationIndicators.slice(0, 3).map((ind, idx) => {
                            const isOk = isIndicatorSuccess(ind);
                            return (
                              <div key={`ind-sum-${idx}`} className={`p-3 rounded-lg border text-center ${
                                isOk 
                                  ? (isEInkMode ? 'border-black bg-white' : 'border-emerald-100 bg-emerald-50/20 text-emerald-800')
                                  : (isEInkMode ? 'border-black border-2 bg-white' : 'border-red-100 bg-red-50/20 text-red-800')
                              }`}>
                                <div className="text-[9px] font-bold uppercase text-slate-400 truncate" title={ind.metric}>{ind.metric}</div>
                                <div className="text-lg font-mono font-black mt-1 text-slate-800">
                                  {ind.fact} {ind.unit}
                                </div>
                                <div className="text-[10px] text-slate-500 mt-1">
                                  {ind.plan > 0 ? `План: ${ind.plan}` : 'Без плана'} • <span className={`font-black ${isOk ? 'text-emerald-600' : 'text-[#e21a1a]'}`}>{ind.percent}%</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Detailed Table of Indicators with Status Highlights */}
                        <div className="overflow-x-auto rounded-xl border border-slate-100" id="station-indicators-table-wrapper">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className={`bg-slate-50/80 font-bold text-slate-500 border-b ${
                                isEInkMode ? 'border-black bg-white' : 'border-slate-100'
                              }`}>
                                <th className="p-2.5">Показатель работы</th>
                                <th className="p-2.5 text-center">Ед. изм.</th>
                                <th className="p-2.5 text-right">План (Норма)</th>
                                <th className="p-2.5 text-right">Факт (Июнь)</th>
                                <th className="p-2.5 text-right">Вып. %</th>
                                <th className="p-2.5 text-center">Оценка</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {selectedStationIndicators.map((ind, idx) => {
                                const isOk = isIndicatorSuccess(ind);
                                const isIdle = ind.metric.toLowerCase().includes('простой') || ind.metric.toLowerCase().includes('оборот');
                                
                                return (
                                  <tr key={`ind-row-${idx}`} className={`hover:bg-slate-50/50 transition-colors ${
                                    isEInkMode ? 'border-black' : ''
                                  }`}>
                                    <td className="p-2.5 font-bold text-slate-800">{ind.metric}</td>
                                    <td className="p-2.5 text-center text-slate-500">{ind.unit}</td>
                                    <td className="p-2.5 text-right font-mono text-slate-600">
                                      {ind.plan > 0 ? ind.plan : '-'}
                                    </td>
                                    <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                                      {ind.fact}
                                    </td>
                                    <td className={`p-2.5 text-right font-mono font-bold ${
                                      isOk ? 'text-emerald-600' : 'text-[#e21a1a]'
                                    }`}>
                                      {ind.percent}%
                                    </td>
                                    <td className="p-2.5 text-center">
                                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold border ${
                                        isOk
                                          ? (isEInkMode 
                                              ? 'border-black bg-white text-black font-semibold' 
                                              : 'text-emerald-700 bg-emerald-50 border-emerald-100')
                                          : (isEInkMode 
                                              ? 'border-black border-2 border-dashed bg-white text-black font-black' 
                                              : 'text-red-700 bg-red-50 border-red-100')
                                      }`}>
                                        {isOk ? (
                                          <>
                                            <CheckCircle2 size={10} className="text-emerald-500 shrink-0" />
                                            <span>{isIdle ? 'Соблюдено' : 'Выполнено'}</span>
                                          </>
                                        ) : (
                                          <>
                                            <AlertTriangle size={10} className="text-[#e21a1a] shrink-0" />
                                            <span>{isIdle ? 'Превышение' : 'Отклонение'}</span>
                                          </>
                                        )}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Station Specific Guidance/Analysis text */}
                        <div className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
                          isEInkMode 
                            ? 'border-black bg-white font-mono' 
                            : 'border-slate-100 bg-slate-50 text-slate-600'
                        }`}>
                          <strong className="text-slate-800 font-bold block mb-1">Выводы и рекомендации по станции:</strong>
                          {selectedStationIndicators.some(ind => !isIndicatorSuccess(ind)) ? (
                            <span>
                              На станции <strong>{selectedStation.name}</strong> зафиксированы отклонения от технологического регламента по отдельным показателям. Требуется провести дополнительный разбор причин задержек вагонов, проверить качество взаимодействия с маневровыми локомотивами и погрузочно-разгрузочными бригадами на путях необщего пользования.
                            </span>
                          ) : (
                            <span>
                              Станция <strong>{selectedStation.name}</strong> полностью выполняет все установленные планы работы, технологические нормы простоя местных и транзитных вагонов соблюдены. Рекомендуется зафиксировать передовой опыт работы смены и поощрить ответственный диспетчерский персонал.
                            </span>
                          )}
                        </div>

                      </div>
                    )}

                  </div>
                ) : (
                  <div className="py-20 text-center text-slate-400">
                    Выберите станцию из списка слева для проведения детального анализа.
                  </div>
                )}
              </div>

            </div>
          )}
        </>
      )}

    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import InteractiveMap from './components/InteractiveMap';
import StationPassportModal from './components/StationPassportModal';
import SchemeEditor from './components/SchemeEditor';
import TabletInstallationModal from './components/TabletInstallationModal';
import WorkAnalysis from './components/WorkAnalysis';
import { STATIONS, STATION_CLASS_INFO, DEFAULT_STAFF } from './data/stations';
import { StationData, StationClass, StationStaff, StationDocument, StationIndicator } from './types';
import { 
  Building2, Train, Database, HelpCircle, 
  MapPin, Clipboard, ArrowRight, Layers, FileText,
  Download, Upload, RefreshCw, Check, AlertCircle, Sliders, Tablet, BarChart2
} from 'lucide-react';
import { exportBackup, importBackup, getStaff, saveStaff, saveDocument, saveIndicators } from './lib/db';
import * as XLSX from 'xlsx';

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
  const [isTabletModalOpen, setIsTabletModalOpen] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState<'map' | 'registry' | 'analytics'>('map');
  
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [backupMessage, setBackupMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleUpdateStations = (newStations: StationData[]) => {
    setStations(newStations);
    localStorage.setItem('rzd_custom_stations', JSON.stringify(newStations));
  };

  const handleUpdateStation = (updatedStation: StationData) => {
    const updated = stations.map(s => s.id === updatedStation.id ? updatedStation : s);
    setStations(updated);
    localStorage.setItem('rzd_custom_stations', JSON.stringify(updated));
    if (selectedStation && selectedStation.id === updatedStation.id) {
      setSelectedStation(updatedStation);
    }
  };

  const handleGlobalStaffExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
        if (rows.length === 0) {
          alert('Файл Excel пуст.');
          return;
        }

        const firstCell = String(rows[0]?.[0] || '').toLowerCase();
        const startRow = (firstCell.includes('станц') || firstCell.includes('назван') || firstCell.includes('station')) ? 1 : 0;

        const staffByStation: Record<string, StationStaff[]> = {};

        // Normalizer function to enable robust matching for station names
        const normalizeName = (str: string) => {
          let clean = str.trim().toLowerCase();
          // Remove prefixes/types at the beginning like "р.", "ст.", "о.п."
          clean = clean.replace(/^(р\.|р\s+|ст\.|ст\s+|о\.п\.|о\.п\s+)/g, '');
          // Replace ё with е, and strip all non-alphanumeric characters
          return clean
            .replace(/ё/g, 'е')
            .replace(/[^a-zа-я0-9]/g, '');
        };

        for (let i = startRow; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length < 2) continue;

          const rowStationNameRaw = String(row[0] || '').trim();
          if (!rowStationNameRaw) continue;

          // Extract station name by removing everything in parentheses, e.g. "Смоленск (1 класс)" -> "Смоленск"
          let rowStationName = rowStationNameRaw.replace(/\s*\([^)]*\)/g, '').trim();
          const position = String(row[1] || '').trim();
          const fullName = String(row[2] || '').trim();
          const phone = String(row[3] || '').trim();

          if (!rowStationName || !position) continue;

          const cleanRowStation = normalizeName(rowStationName);

          // Find station using exact normalized name first
          let matchedStation = stations.find(s => normalizeName(s.name) === cleanRowStation);

          // Fallback to substring matching if exact match not found
          if (!matchedStation) {
            matchedStation = stations.find(s => {
              const cleanSName = normalizeName(s.name);
              return cleanSName.includes(cleanRowStation) || cleanRowStation.includes(cleanSName);
            });
          }

          if (matchedStation) {
            if (!staffByStation[matchedStation.id]) {
              staffByStation[matchedStation.id] = [];
            }
            staffByStation[matchedStation.id].push({
              id: Math.random().toString(36).substr(2, 9),
              position,
              fullName: fullName || 'ФИО не указано',
              phone: phone || '',
            });
          }
        }

        const matchedStationIds = Object.keys(staffByStation);
        if (matchedStationIds.length === 0) {
          alert('Не удалось сопоставить ни одну строку со станциями Смоленского региона. Пожалуйста, убедитесь, что в первой колонке указано название станции (класс в скобках необязателен).');
          return;
        }

        let totalImported = 0;
        for (const stationId of matchedStationIds) {
          const newStaff = staffByStation[stationId];
          // We overwrite the staff for the matched stations to ensure correctness and avoid duplication
          await saveStaff(stationId, newStaff);
          totalImported += newStaff.length;
        }

        alert(`Импорт завершен успешно!\nЗаписано работников: ${totalImported} по ${matchedStationIds.length} станциям.\nДанные по этим станциям были успешно обновлены.`);
      } catch (err) {
        alert('Ошибка при чтении Excel файла. Убедитесь в корректности структуры (1-я колонка: Название станции (класс в скобках), 2-я: Должность, 3-я: ФИО, 4-я: Контакты (необязательно)).');
        console.error(err);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const handleBulkSchemesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    let matchedCount = 0;
    const unmatchedFiles: string[] = [];

    const normalizeName = (str: string) => {
      let clean = str.trim().toLowerCase();
      // Remove prefixes/types at the beginning like "р.", "ст.", "о.п."
      clean = clean.replace(/^(р\.|р\s+|ст\.|ст\s+|о\.п\.|о\.п\s+)/g, '');
      // Remove everything in parentheses, e.g. "Смоленск (1 класс)" -> "Смоленск"
      clean = clean.replace(/\s*\([^)]*\)/g, '').trim();
      // Replace ё with е, and strip all non-alphanumeric characters
      return clean
        .replace(/ё/g, 'е')
        .replace(/[^a-zа-я0-9]/g, '');
    };

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      if (!isPdf) continue;

      const baseName = file.name.replace(/\.[^/.]+$/, "");
      const cleanFileName = normalizeName(baseName);

      if (!cleanFileName) continue;

      let matchedStation = stations.find(s => normalizeName(s.name) === cleanFileName);

      if (!matchedStation) {
        matchedStation = stations.find(s => {
          const cleanSName = normalizeName(s.name);
          return cleanSName.includes(cleanFileName) || cleanFileName.includes(cleanSName);
        });
      }

      if (matchedStation) {
        try {
          const doc: StationDocument = {
            stationId: matchedStation.id,
            docType: 'scheme',
            fileName: file.name,
            fileBlob: file,
            uploadedAt: new Date().toLocaleDateString('ru-RU') + ' ' + new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
          };
          await saveDocument(doc);
          matchedCount++;
        } catch (err) {
          console.error(`Error saving document for ${matchedStation.name}:`, err);
        }
      } else {
        unmatchedFiles.push(file.name);
      }
    }

    if (matchedCount > 0) {
      let msg = `Успешно импортировано и разложено по карточкам схем: ${matchedCount}.`;
      if (unmatchedFiles.length > 0) {
        msg += `\n\nНе удалось сопоставить файлы (${unmatchedFiles.length} шт.):\n` + unmatchedFiles.slice(0, 10).join('\n');
        if (unmatchedFiles.length > 10) {
          msg += `\n...и еще ${unmatchedFiles.length - 10} файлов.`;
        }
      }
      alert(msg);
    } else {
      alert(`Не удалось сопоставить ни один файл со станциями. Проверьте, что названия файлов соответствуют названиям станций.\n\nЗагружено файлов: ${files.length}\nПримеры файлов: ${Array.from(files).slice(0, 3).map((f: any) => f.name).join(', ')}`);
    }

    e.target.value = '';
  };

  const handleDownloadGlobalIndicatorsTemplate = () => {
    const row1 = ['№', 'Станции', 'Простой местных вагонов', '', '', '', '', '', '', '', '', '', 'Простой транзитных', '', 'Рабочий парк', 'Коэфф. сдвоенных', 'ПОГРУЗКА', '', '', '', '', '', '', '', '', '', '', 'ВЫГРУЗКА', '', ''];
    const row2 = ['', '', 'Факт Июль 2025', '', 'Факт май 2026', '', 'Факт Июнь 2026', '', 'Технологическая норма', '', 'План Июль 2026', '', 'С пер', 'Без пер', 'Июнь без учета путей н.о.', 'Порож операций', 'Коэфф.', 'Факт', 'План', 'Тонны', 'ПО РОДАМ', '', '', '', '', '', '', 'Факт', 'План', 'Тонны'];
    const row3 = ['', '', 'Общий', 'на отв. ОАО"РЖД"', 'Общий', 'на отв. ОАО"РЖД"', 'Общий', 'на отв. ОАО"РЖД"', 'Общий', 'на отв. ОАО"РЖД"', 'Общий', 'на отв. ОАО"РЖД"', '', '', '', '', '', '', '', '', 'ВС', 'КР', 'ПЛ', 'ПВ', 'ЦС', 'РФ', 'ПР', '', '', ''];

    const sampleData = [
      ['1', 'Смоленск (1 класс)', '100,50', '4,00', '110,20', '5,00', '132,57', '35,97', '15,76', '7,59', '124,00', '21,00', '157', '150', '49', '40', '1,131', '1,7', '1,7', '13,0', '1,7', '0,4', '3,6', '9,0', '11,3', '0,4', '3,6', '7,3', '28', '0,0'],
      ['2', 'Вязьма (Внеклассная)', '316,61', '59,31', '167,01', '44,25', '239,94', '81,96', '11,90', '9,73', '172,00', '19,00', '102', '67', '55', '30', '1,100', '1,6', '1,6', '16,0', '0,2', '14,0', '1,8', '14,4', '0,2', '14,0', '0,2', '16', '12', '15,5'],
      ['3', 'Сафоново (2 класс)', '97,19', '16,86', '193,31', '34,63', '176,57', '18,43', '13,84', '7,48', '176,00', '12,00', '15,00', '10', '202', '50', '1,000', '0,5', '0,5', '1,0', '1,0', '0,0', '1,0', '1,0', '0,0', '0,0', '0,0', '147', '140', '160'],
      ['4', 'Гагарин (3 класс)', '122,47', '34,92', '132,57', '35,97', '169,78', '45,11', '15,76', '7,59', '124,00', '21,00', '157', '150', '49', '40', '1,131', '1,7', '1,7', '13,0', '0,4', '3,6', '9,0', '11,3', '0,4', '3,6', '7,3', '28', '25', '30,5']
    ];

    const aoa = [row1, row2, row3, ...sampleData];
    const ws = XLSX.utils.aoa_to_sheet(aoa);

    ws['!merges'] = [
      { s: { r: 0, c: 2 }, e: { r: 0, c: 11 } },
      { s: { r: 0, c: 12 }, e: { r: 0, c: 13 } },
      { s: { r: 0, c: 16 }, e: { r: 0, c: 26 } },
      { s: { r: 0, c: 27 }, e: { r: 0, c: 29 } },
      { s: { r: 0, c: 0 }, e: { r: 2, c: 0 } },
      { s: { r: 0, c: 1 }, e: { r: 2, c: 1 } },
      { s: { r: 0, c: 14 }, e: { r: 1, c: 14 } },
      { s: { r: 0, c: 15 }, e: { r: 1, c: 15 } },
      { s: { r: 1, c: 2 }, e: { r: 1, c: 3 } },
      { s: { r: 1, c: 4 }, e: { r: 1, c: 5 } },
      { s: { r: 1, c: 6 }, e: { r: 1, c: 7 } },
      { s: { r: 1, c: 8 }, e: { r: 1, c: 9 } },
      { s: { r: 1, c: 10 }, e: { r: 1, c: 11 } },
      { s: { r: 1, c: 20 }, e: { r: 1, c: 26 } }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Показатели работы');
    XLSX.writeFile(wb, 'Шаблон_Показатели_Работы_Станций.xlsx');
  };

  const handleGlobalIndicatorsExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
        if (rows.length === 0) {
          alert('Файл Excel пуст.');
          return;
        }

        const headerRows: string[][] = [];
        for (let r = 0; r < Math.min(rows.length, 5); r++) {
          headerRows.push(rows[r] ? rows[r].map(cell => String(cell || '').trim()) : []);
        }

        for (let r = 0; r < headerRows.length; r++) {
          let lastVal = '';
          for (let c = 0; c < headerRows[r].length; c++) {
            if (headerRows[r][c]) {
              lastVal = headerRows[r][c];
            } else if (lastVal && c > 0) {
              headerRows[r][c] = lastVal;
            }
          }
        }

        const colPaths: string[] = [];
        const numCols = Math.max(...headerRows.map(r => r.length));
        for (let c = 0; c < numCols; c++) {
          const pathParts: string[] = [];
          for (let r = 0; r < headerRows.length; r++) {
            const cellVal = headerRows[r][c];
            if (cellVal && !pathParts.includes(cellVal)) {
              pathParts.push(cellVal);
            }
          }
          colPaths.push(pathParts.join(' -> ').toLowerCase());
        }

        const findColumnIndex = (keywords: string[], excludeKeywords: string[] = []) => {
          let foundIdx = -1;
          for (let c = 0; c < colPaths.length; c++) {
            const path = colPaths[c];
            const hasAllKeywords = keywords.every(kw => path.includes(kw));
            const hasNoExcludeKeywords = excludeKeywords.every(kw => !path.includes(kw));
            if (hasAllKeywords && hasNoExcludeKeywords) {
              foundIdx = c;
            }
          }
          return foundIdx;
        };

        const FALLBACK_MAP = {
          localFactObj: 6,
          localFactRzd: 7,
          localPlanObj: 10,
          localPlanRzd: 11,
          transitWithPer: 12,
          transitNoPer: 13,
          workingPark: 14,
          doubleCoeff: 16,
          loadFact: 17,
          loadPlan: 18,
          loadTons: 19,
          unloadFact: 27,
          unloadPlan: 28,
        };

        const getIndex = (keywords: string[], fallbackIdx: number, excludeKeywords: string[] = []) => {
          const idx = findColumnIndex(keywords, excludeKeywords);
          return idx !== -1 ? idx : fallbackIdx;
        };

        const localFactObjIdx = getIndex(['простой местных', 'факт', 'общий'], FALLBACK_MAP.localFactObj);
        
        let localFactRzdIdx = findColumnIndex(['простой местных', 'факт', 'отв']);
        if (localFactRzdIdx === -1) localFactRzdIdx = findColumnIndex(['простой местных', 'факт', 'ржд']);
        if (localFactRzdIdx === -1) localFactRzdIdx = FALLBACK_MAP.localFactRzd;

        let localPlanObjIdx = findColumnIndex(['простой местных', 'план', 'общий']);
        if (localPlanObjIdx === -1) localPlanObjIdx = findColumnIndex(['простой местных', 'норма', 'общий']);
        if (localPlanObjIdx === -1) localPlanObjIdx = FALLBACK_MAP.localPlanObj;

        let localPlanRzdIdx = findColumnIndex(['простой местных', 'план', 'отв']);
        if (localPlanRzdIdx === -1) localPlanRzdIdx = findColumnIndex(['простой местных', 'план', 'ржд']);
        if (localPlanRzdIdx === -1) localPlanRzdIdx = findColumnIndex(['простой местных', 'норма', 'отв']);
        if (localPlanRzdIdx === -1) localPlanRzdIdx = findColumnIndex(['простой местных', 'норма', 'ржд']);
        if (localPlanRzdIdx === -1) localPlanRzdIdx = FALLBACK_MAP.localPlanRzd;

        const transitWithPerIdx = getIndex(['простой транзитных', 'с пер'], FALLBACK_MAP.transitWithPer);
        const transitNoPerIdx = getIndex(['простой транзитных', 'без пер'], FALLBACK_MAP.transitNoPer);
        const workingParkIdx = getIndex(['рабочий парк'], FALLBACK_MAP.workingPark);
        const doubleCoeffIdx = getIndex(['коэфф'], FALLBACK_MAP.doubleCoeff);
        
        const loadFactIdx = getIndex(['погрузка', 'факт'], FALLBACK_MAP.loadFact, ['тонн', 'родам']);
        const loadPlanIdx = getIndex(['погрузка', 'план'], FALLBACK_MAP.loadPlan, ['тонн', 'родам']);
        const loadTonsIdx = getIndex(['погрузка', 'тонн'], FALLBACK_MAP.loadTons);
        
        const unloadFactIdx = getIndex(['выгрузка', 'факт'], FALLBACK_MAP.unloadFact, ['родам']);
        const unloadPlanIdx = getIndex(['выгрузка', 'план'], FALLBACK_MAP.unloadPlan, ['родам']);

        let startRowIdx = 3;
        for (let i = 0; i < Math.min(rows.length, 10); i++) {
          const cell0 = String(rows[i]?.[0] || '').trim();
          const cell1 = String(rows[i]?.[1] || '').trim();
          if (cell0 && !isNaN(Number(cell0)) && cell1 && !cell1.toLowerCase().includes('станции') && !cell1.toLowerCase().includes('станция')) {
            startRowIdx = i;
            break;
          }
        }

        const normalizeName = (str: string) => {
          let clean = str.trim().toLowerCase();
          clean = clean.replace(/^(р\.|р\s+|ст\.|ст\s+|о\.п\.|о\.п\s+)/g, '');
          clean = clean.replace(/\s*\([^)]*\)/g, '').trim();
          return clean
            .replace(/ё/g, 'е')
            .replace(/[^a-zа-я0-9]/g, '');
        };

        const parseVal = (v: any): number => {
          if (v === undefined || v === null) return 0;
          if (typeof v === 'number') return v;
          const str = String(v).trim().replace(',', '.').replace(/\s+/g, '');
          const num = parseFloat(str);
          return isNaN(num) ? 0 : num;
        };

        let stationsImportedCount = 0;

        for (let i = startRowIdx; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length < 2) continue;

          const stationNameRaw = String(row[1] || '').trim();
          if (!stationNameRaw || stationNameRaw.toLowerCase().includes('итого') || stationNameRaw.toLowerCase().includes('всего')) continue;

          const cleanRowStation = normalizeName(stationNameRaw);
          if (!cleanRowStation) continue;

          let matchedStation = stations.find(s => normalizeName(s.name) === cleanRowStation);
          if (!matchedStation) {
            matchedStation = stations.find(s => {
              const cleanSName = normalizeName(s.name);
              return cleanSName.includes(cleanRowStation) || cleanRowStation.includes(cleanSName);
            });
          }

          if (matchedStation) {
            const stationIndicators: StationIndicator[] = [];

            const addInd = (metric: string, unit: string, p: number, f: number) => {
              const percent = p > 0 ? Math.round((f / p) * 1000) / 10 : 100;
              stationIndicators.push({
                id: Math.random().toString(36).substr(2, 9),
                metric,
                unit,
                plan: p,
                fact: f,
                percent
              });
            };

            const pLocalObj = parseVal(row[localPlanObjIdx]);
            const fLocalObj = parseVal(row[localFactObjIdx]);
            if (pLocalObj > 0 || fLocalObj > 0) {
              addInd('Простой местных вагонов (общий)', 'час', pLocalObj, fLocalObj);
            }

            const pLocalRzd = parseVal(row[localPlanRzdIdx]);
            const fLocalRzd = parseVal(row[localFactRzdIdx]);
            if (pLocalRzd > 0 || fLocalRzd > 0) {
              addInd('Простой местных вагонов (на отв. ОАО "РЖД")', 'час', pLocalRzd, fLocalRzd);
            }

            const fTransitWith = parseVal(row[transitWithPerIdx]);
            if (fTransitWith > 0) {
              addInd('Простой транзитного вагона с переработкой', 'час', 0, fTransitWith);
            }

            const fTransitNo = parseVal(row[transitNoPerIdx]);
            if (fTransitNo > 0) {
              addInd('Простой транзитного вагона без переработки', 'час', 0, fTransitNo);
            }

            const fWorking = parseVal(row[workingParkIdx]);
            if (fWorking > 0) {
              addInd('Рабочий парк вагонов', 'ваг.', 0, fWorking);
            }

            const fDouble = parseVal(row[doubleCoeffIdx]);
            if (fDouble > 0) {
              addInd('Коэффициент сдвоенных операций', 'коэф.', 0, fDouble);
            }

            const pLoad = parseVal(row[loadPlanIdx]);
            const fLoad = parseVal(row[loadFactIdx]);
            if (pLoad > 0 || fLoad > 0) {
              addInd('Погрузка грузов', 'ваг/сут', pLoad, fLoad);
            }

            const fLoadTons = parseVal(row[loadTonsIdx]);
            if (fLoadTons > 0) {
              addInd('Объем погрузки грузов', 'тонн', 0, fLoadTons);
            }

            const pUnload = parseVal(row[unloadPlanIdx]);
            const fUnload = parseVal(row[unloadFactIdx]);
            if (pUnload > 0 || fUnload > 0) {
              addInd('Выгрузка вагонов', 'ваг/сут', pUnload, fUnload);
            }

            if (stationIndicators.length > 0) {
              await saveIndicators(matchedStation.id, stationIndicators);
              stationsImportedCount++;
            }
          }
        }

        if (stationsImportedCount > 0) {
          alert(`Импорт показателей работы завершен успешно!\nЗагружены и распределены показатели по ${stationsImportedCount} станциям.`);
          if (selectedStation) {
            setSelectedStation({ ...selectedStation });
          }
        } else {
          alert('Не удалось сопоставить ни одну строку со станциями Смоленского региона. Пожалуйста, проверьте, что во втором столбце корректно указаны названия станций.');
        }
      } catch (err) {
        alert('Ошибка при чтении файла показателей. Убедитесь, что структура таблицы соответствует установленному образцу.');
        console.error(err);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const handleDownloadGlobalStaffTemplate = () => {
    const header = ['Станция (класс)', 'Должность', 'ФИО', 'Рабочий телефон'];
    const templateData = [
      ['Смоленск (1 класс)', 'Начальник станции', 'Иванов Сергей Петрович', '+7 (910) 123-45-67, 2-11-22'],
      ['Смоленск (1 класс)', 'Дежурный по станции', 'Петров Алексей Владимирович', '+7 (910) 765-43-21'],
      ['Вязьма (Внеклассная)', 'Начальник станции', 'Александров Илья Андреевич', '+7 (905) 698-22-33'],
      ['Сафоново (2 класс)', 'Начальник станции', 'Григорьев Денис Сергеевич', '+7 (915) 634-88-99']
    ];

    const ws = XLSX.utils.aoa_to_sheet([header, ...templateData]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Штат Станций');
    XLSX.writeFile(wb, 'Шаблон_Импорт_Штата_Всех_Станций.xlsx');
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
        
        {/* Main Tabs Switcher */}
        <div className="flex border-b border-slate-200 bg-white rounded-xl p-1 shadow-sm border border-slate-200 animate-in fade-in duration-300" id="main-view-tabs">
          <button
            onClick={() => setActiveMainTab('map')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-xs font-bold tracking-wide transition-all cursor-pointer ${
              activeMainTab === 'map'
                ? 'bg-[#e21a1a] text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
            id="main-tab-map-btn"
          >
            <Layers size={14} />
            <span>ИНТЕРАКТИВНАЯ СХЕМА СМОЛЕНСКОГО РЕГИОНА</span>
          </button>
          <button
            onClick={() => setActiveMainTab('registry')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-xs font-bold tracking-wide transition-all cursor-pointer ${
              activeMainTab === 'registry'
                ? 'bg-[#e21a1a] text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
            id="main-tab-registry-btn"
          >
            <Building2 size={14} />
            <span>РЕЕСТР СТАНЦИЙ РЕГИОНА</span>
          </button>
          <button
            onClick={() => setActiveMainTab('analytics')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-xs font-bold tracking-wide transition-all cursor-pointer ${
              activeMainTab === 'analytics'
                ? 'bg-[#e21a1a] text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
            id="main-tab-analytics-btn"
          >
            <BarChart2 size={14} />
            <span>АНАЛИЗ РАБОТЫ И KPI</span>
          </button>
        </div>

        {/* Tab 1: Map Section */}
        {activeMainTab === 'map' && (
          <section className="flex flex-col gap-3 bg-white p-5 rounded-2xl border border-slate-200/85 shadow-sm animate-in fade-in duration-200" id="map-section">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Layers size={16} className="text-[#e21a1a]" />
                  Интерактивная схема Смоленского региона МЖД
                </h2>
                <span className="text-xs text-slate-400 mt-0.5 block">
                  Схема региона закреплена по центру. Для масштабирования используйте колесико мыши или pinch-to-zoom (жест двумя пальцами на планшетах). Удерживайте левую кнопку мыши для перемещения схемы.
                </span>
              </div>
            </div>

            <div className="w-full flex items-center justify-center overflow-hidden bg-slate-50/50 rounded-xl border border-slate-100 p-2">
              <InteractiveMap 
                stations={stations}
                onSelectStation={setSelectedStation}
                selectedStationId={selectedStation?.id}
                isEditMode={false}
                onUpdateStations={handleUpdateStations}
              />
            </div>
          </section>
        )}

        {/* Tab 2: Station Directory list */}
        {activeMainTab === 'registry' && (
          <section className="flex flex-col gap-4 bg-white p-5 rounded-2xl border border-slate-200/85 shadow-sm animate-in fade-in duration-200" id="directory-section">
            
            {/* Header of Section */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Building2 size={16} className="text-[#e21a1a]" />
                  Реестр железнодорожных станций управления
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Быстрый доступ к электронным паспортам, схемам путевого развития и штатному расписанию станций
                </p>
              </div>

              {/* Filters & Actions */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Search in list */}
                <input
                  type="text"
                  id="directory-search-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск по названию или км..."
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

                <div className="w-px h-6 bg-slate-200 hidden sm:block mx-1" />

                {/* Global Excel Import Template */}
                <button
                  onClick={handleDownloadGlobalStaffTemplate}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-lg text-xs transition-colors cursor-pointer border border-slate-200 shadow-sm"
                  title="Скачать шаблон таблицы Excel для импорта штата всех станций"
                  id="download-global-template-btn"
                >
                  <Download size={13} className="text-slate-500" />
                  <span>Шаблон штата (Excel)</span>
                </button>

                {/* Global Excel Upload Button */}
                <label 
                  id="global-staff-excel-label"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-emerald-600 font-semibold rounded-lg text-xs transition-all cursor-pointer shadow-sm"
                  title="Загрузить штатные расписания всех станций из одного Excel файла"
                >
                  <Upload size={13} />
                  <span>Импорт штата (Excel)</span>
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={handleGlobalStaffExcelUpload}
                    className="hidden"
                  />
                </label>

                {/* Global Indicators Template Downloader */}
                <button
                  onClick={handleDownloadGlobalIndicatorsTemplate}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-lg text-xs transition-colors cursor-pointer border border-slate-200 shadow-sm"
                  title="Скачать шаблон таблицы Excel для импорта показателей работы станций за месяц"
                  id="download-global-indicators-template-btn"
                >
                  <Download size={13} className="text-[#e21a1a]" />
                  <span>Шаблон показателей (Excel)</span>
                </button>

                {/* Global Indicators Upload Button */}
                <label 
                  id="global-indicators-excel-label"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-all cursor-pointer shadow-sm shadow-emerald-500/10"
                  title="Загрузить показатели работы всех станций из одного Excel файла"
                >
                  <BarChart2 size={13} />
                  <span>Импорт показателей работы (Excel)</span>
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={handleGlobalIndicatorsExcelUpload}
                    className="hidden"
                  />
                </label>

                {/* Bulk PDF Schemes Upload Button */}
                <label 
                  id="bulk-schemes-pdf-label"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#e21a1a] hover:bg-red-700 text-white font-bold rounded-lg text-xs transition-all cursor-pointer shadow-sm shadow-red-500/10"
                  title="Выбрать несколько PDF-файлов со схемами путевого развития станций (название файла должно соответствовать названию станции)"
                >
                  <FileText size={13} />
                  <span>Импорт схем (PDF)</span>
                  <input
                    type="file"
                    accept=".pdf"
                    multiple
                    onChange={handleBulkSchemesUpload}
                    className="hidden"
                  />
                </label>
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
        )}

        {/* Tab 3: Performance Analysis and KPI Dashboard */}
        {activeMainTab === 'analytics' && (
          <WorkAnalysis 
            stations={stations}
            onSelectStation={(station) => {
              setSelectedStation(station);
            }}
          />
        )}

        {/* Backup Status Message */}
        {backupMessage && (
          <div 
            className={`p-4 rounded-xl border flex items-center gap-3 text-xs sm:text-sm mt-4 animate-in fade-in slide-in-from-top-4 duration-300 ${
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
        <section className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm mt-6" id="backup-restore-panel">
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
          onUpdateStation={handleUpdateStation}
        />
      )}

    </div>
  );
}

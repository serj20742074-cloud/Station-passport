/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { StationData, StationStaff, StationIndicator, StationDocument, StationClass } from '../types';
import { STATION_CLASS_INFO, DEFAULT_STAFF, DEFAULT_INDICATORS } from '../data/stations';
import { 
  getStaff, saveStaff, 
  getIndicators, saveIndicators, 
  getDocument, saveDocument, deleteDocument 
} from '../lib/db';
import { 
  X, Users, FileText, BarChart2, MapPin, 
  Upload, Download, Plus, Trash2, Edit2, 
  Check, Save, RefreshCw, AlertCircle, FileSpreadsheet
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface StationPassportModalProps {
  station: StationData | null;
  onClose: () => void;
  onUpdateStation?: (updatedStation: StationData) => void;
}

type TabType = 'staff' | 'scheme' | 'tra' | 'indicators';

export default function StationPassportModal({ station, onClose, onUpdateStation }: StationPassportModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('scheme');
  const [staffList, setStaffList] = useState<StationStaff[]>([]);
  const [indicators, setIndicators] = useState<StationIndicator[]>([]);
  const [schemeDoc, setSchemeDoc] = useState<StationDocument | null>(null);
  const [traDoc, setTraDoc] = useState<StationDocument | null>(null);
  const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  
  // URL created from Blob for iframe PDF rendering
  const [schemeUrl, setSchemeUrl] = useState<string>('');
  const [traUrl, setTraUrl] = useState<string>('');

  // Refs for file uploads
  const schemeInputRef = useRef<HTMLInputElement>(null);
  const traInputRef = useRef<HTMLInputElement>(null);
  const excelStaffRef = useRef<HTMLInputElement>(null);
  const excelIndicatorsRef = useRef<HTMLInputElement>(null);

  // Edit states for staff/indicators
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [editingIndicatorId, setEditingIndicatorId] = useState<string | null>(null);

  // Station card editing state
  const [isEditingCard, setIsEditingCard] = useState(false);
  const [editClass, setEditClass] = useState<StationClass>(station?.classType || StationClass.CLASS_5);
  const [editKm, setEditKm] = useState<string>(station?.km || '');
  const [editDesc, setEditDesc] = useState<string>(station?.description || '');

  if (!station) return null;

  // Load data for the selected station
  useEffect(() => {
    let active = true;

    async function loadStationData() {
      if (!station) return;
      setSavingStatus('idle');

      // Load staff
      const storedStaff = await getStaff(station.id);
      if (active) {
        setStaffList(storedStaff || DEFAULT_STAFF[station.id] || []);
      }

      // Load indicators
      const storedIndicators = await getIndicators(station.id);
      if (active) {
        setIndicators(storedIndicators || DEFAULT_INDICATORS[station.id] || []);
      }

      // Load documents
      const storedScheme = await getDocument(station.id, 'scheme');
      const storedTra = await getDocument(station.id, 'tra');
      
      if (active) {
        setSchemeDoc(storedScheme);
        if (storedScheme) {
          if (schemeUrl) URL.revokeObjectURL(schemeUrl);
          setSchemeUrl(URL.createObjectURL(storedScheme.fileBlob));
        } else {
          setSchemeUrl('');
        }

        setTraDoc(storedTra);
        if (storedTra) {
          if (traUrl) URL.revokeObjectURL(traUrl);
          setTraUrl(URL.createObjectURL(storedTra.fileBlob));
        } else {
          setTraUrl('');
        }
      }
    }

    loadStationData();

    // Reset card editing fields
    setEditClass(station.classType);
    setEditKm(station.km);
    setEditDesc(station.description || '');
    setIsEditingCard(false);

    return () => {
      active = false;
    };
  }, [station]);

  // Clean up Object URLs on unmount
  useEffect(() => {
    return () => {
      if (schemeUrl) URL.revokeObjectURL(schemeUrl);
      if (traUrl) URL.revokeObjectURL(traUrl);
    };
  }, [schemeUrl, traUrl]);

  // Save changes wrapper
  const triggerSave = async (type: 'staff' | 'indicators', data: any[]) => {
    if (!station) return;
    setSavingStatus('saving');
    try {
      if (type === 'staff') {
        await saveStaff(station.id, data);
      } else if (type === 'indicators') {
        await saveIndicators(station.id, data);
      }
      setSavingStatus('saved');
      setTimeout(() => setSavingStatus('idle'), 2000);
    } catch (e) {
      console.error(e);
      setSavingStatus('error');
    }
  };

  const handleSaveCard = () => {
    if (onUpdateStation) {
      onUpdateStation({
        ...station,
        classType: editClass,
        km: editKm,
        description: editDesc,
      });
    }
    setIsEditingCard(false);
    setSavingStatus('saved');
    setTimeout(() => setSavingStatus('idle'), 2000);
  };

  // Staff Operations
  const handleAddStaffRow = () => {
    const newRow: StationStaff = {
      id: Math.random().toString(36).substr(2, 9),
      position: 'Новая должность',
      fullName: 'ФИО сотрудника',
      phone: '+7 (900) 000-00-00',
    };
    const updated = [...staffList, newRow];
    setStaffList(updated);
    setEditingStaffId(newRow.id);
    triggerSave('staff', updated);
  };

  const handleUpdateStaff = (id: string, field: keyof StationStaff, value: string) => {
    const updated = staffList.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    });
    setStaffList(updated);
  };

  const handleSaveStaffRow = (id: string) => {
    setEditingStaffId(null);
    triggerSave('staff', staffList);
  };

  const handleRemoveStaff = (id: string) => {
    const updated = staffList.filter(item => item.id !== id);
    setStaffList(updated);
    triggerSave('staff', updated);
  };

  // Excel Staff Import
  const handleExcelStaffUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Parse raw cells (AOA - array of arrays) to guarantee correct column indexes
        const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
        if (rows.length === 0) {
          alert('Файл Excel пуст.');
          return;
        }

        // Determine if first row contains headers like "Станция" or "Должность"
        const firstCell = String(rows[0]?.[0] || '').toLowerCase();
        const startRow = (firstCell.includes('станц') || firstCell.includes('назван') || firstCell.includes('station')) ? 1 : 0;

        const importedStaff: StationStaff[] = [];
        for (let i = startRow; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length < 2) continue;

          // Columns layout: 1st Name of Station, 2nd Position, 3rd FIO, 4th Work Phone
          const rowStationName = String(row[0] || '').trim();
          const position = String(row[1] || '').trim();
          const fullName = String(row[2] || '').trim();
          const phone = String(row[3] || '').trim();

          if (!position) continue;

          // If station is specified in spreadsheet, filter by current station
          if (rowStationName) {
            const cleanRowStation = rowStationName.toLowerCase().replace(/[^a-zа-я0-9]/g, '');
            const cleanCurrentStation = station.name.toLowerCase().replace(/[^a-zа-я0-9]/g, '');
            if (cleanRowStation !== cleanCurrentStation && !cleanCurrentStation.includes(cleanRowStation) && !cleanRowStation.includes(cleanCurrentStation)) {
              continue; // skip if doesn't match
            }
          }

          importedStaff.push({
            id: Math.random().toString(36).substr(2, 9),
            position,
            fullName: fullName || 'ФИО не указано',
            phone: phone || '',
          });
        }

        if (importedStaff.length === 0) {
          alert(`В файле не найдено записей для станции "${station.name}". Пожалуйста, убедитесь, что в первой колонке указано правильное название станции.`);
          return;
        }

        const merged = [...staffList, ...importedStaff];
        setStaffList(merged);
        triggerSave('staff', merged);
        alert(`Успешно импортировано работников: ${importedStaff.length}`);
      } catch (err) {
        alert('Ошибка при чтении Excel файла. Убедитесь в корректности структуры (1-я колонка: Станция, 2-я: Должность, 3-я: ФИО, 4-я: Телефоны).');
        console.error(err);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = ''; // Reset input
  };

  // Excel Staff Template Download
  const handleDownloadStaffTemplate = () => {
    const header = ['Станция', 'Должность', 'ФИО', 'Рабочий телефон'];
    const templateData = [
      [station.name, 'Начальник станции', 'Иванов Сергей Петрович', '+7 (910) 123-45-67, 2-11-22'],
      [station.name, 'Дежурный по станции', 'Петров Алексей Владимирович', '+7 (910) 765-43-21'],
      [station.name, 'Главный инженер', 'Николаев Иван Иванович', '+7 (910) 999-88-77']
    ];

    const ws = XLSX.utils.aoa_to_sheet([header, ...templateData]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Штат Станции');
    XLSX.writeFile(wb, `Шаблон_Штат_${station.name}.xlsx`);
  };

  // Indicators Operations
  const handleAddIndicatorRow = () => {
    const newRow: StationIndicator = {
      id: Math.random().toString(36).substr(2, 9),
      metric: 'Новый показатель работы',
      unit: 'ед.',
      plan: 0,
      fact: 0,
      percent: 100
    };
    const updated = [...indicators, newRow];
    setIndicators(updated);
    setEditingIndicatorId(newRow.id);
    triggerSave('indicators', updated);
  };

  const handleUpdateIndicator = (id: string, field: keyof StationIndicator, value: any) => {
    const updated = indicators.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        // Auto calculate percentage if Plan and Fact are updated
        if (field === 'plan' || field === 'fact') {
          const p = Number(updatedItem.plan);
          const f = Number(updatedItem.fact);
          if (p > 0) {
            updatedItem.percent = Math.round((f / p) * 1000) / 10;
          } else {
            updatedItem.percent = 0;
          }
        }
        return updatedItem;
      }
      return item;
    });
    setIndicators(updated);
  };

  const handleSaveIndicatorRow = (id: string) => {
    setEditingIndicatorId(null);
    triggerSave('indicators', indicators);
  };

  const handleRemoveIndicator = (id: string) => {
    const updated = indicators.filter(item => item.id !== id);
    setIndicators(updated);
    triggerSave('indicators', updated);
  };

  // Excel Indicators Import
  const handleExcelIndicatorsUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json<any>(worksheet);

        // Map spreadsheet headers to StationIndicator fields
        // Supported headers: "Показатель", "Ед. изм.", "План", "Факт"
        const importedIndicators: StationIndicator[] = json.map(row => {
          const plan = Number(row['План'] || row['план'] || 0);
          const fact = Number(row['Факт'] || row['факт'] || 0);
          const percent = plan > 0 ? Math.round((fact / plan) * 1000) / 10 : 0;
          return {
            id: Math.random().toString(36).substr(2, 9),
            metric: String(row['Показатель'] || row['показатель'] || 'Показатель').trim(),
            unit: String(row['Ед. изм.'] || row['Единица измерения'] || row['ед. изм.'] || 'ед.').trim(),
            plan,
            fact,
            percent,
          };
        });

        if (importedIndicators.length === 0) {
          alert('В файле не найдено записей для показателей.');
          return;
        }

        const merged = [...indicators, ...importedIndicators];
        setIndicators(merged);
        triggerSave('indicators', merged);
        alert(`Успешно импортировано показателей: ${importedIndicators.length}`);
      } catch (err) {
        alert('Ошибка при чтении Excel файла. Проверьте правильность структуры шаблона.');
        console.error(err);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = ''; // Reset input
  };

  // Excel Indicators Template Download
  const handleDownloadIndicatorsTemplate = () => {
    const templateData = [
      { 'Показатель': 'Погрузка грузов', 'Ед. изм.': 'тонн', 'План': 5000, 'Факт': 5230 },
      { 'Показатель': 'Выгрузка грузов', 'Ед. изм.': 'тонн', 'План': 8000, 'Факт': 7900 },
      { 'Показатель': 'Простой под одной грузовой операцией', 'Ед. изм.': 'час', 'План': 24, 'Факт': 22 }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Показатели');
    XLSX.writeFile(wb, `Шаблон_Показатели_${station.name}.xlsx`);
  };

  // PDF Document Upload (Scheme or TRA)
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'scheme' | 'tra') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Пожалуйста, загрузите документ в формате PDF.');
      return;
    }

    setSavingStatus('saving');
    try {
      const doc: StationDocument = {
        stationId: station.id,
        docType: type,
        fileName: file.name,
        fileBlob: file,
        uploadedAt: new Date().toLocaleDateString('ru-RU') + ' ' + new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
      };

      await saveDocument(doc);

      if (type === 'scheme') {
        setSchemeDoc(doc);
        if (schemeUrl) URL.revokeObjectURL(schemeUrl);
        setSchemeUrl(URL.createObjectURL(file));
      } else {
        setTraDoc(doc);
        if (traUrl) URL.revokeObjectURL(traUrl);
        setTraUrl(URL.createObjectURL(file));
      }

      setSavingStatus('saved');
      setTimeout(() => setSavingStatus('idle'), 2000);
    } catch (err) {
      console.error(err);
      setSavingStatus('error');
    }
  };

  const handleRemovePdf = async (type: 'scheme' | 'tra') => {
    if (!window.confirm('Вы уверены, что хотите удалить этот документ?')) return;
    
    setSavingStatus('saving');
    try {
      await deleteDocument(station.id, type);
      if (type === 'scheme') {
        setSchemeDoc(null);
        if (schemeUrl) URL.revokeObjectURL(schemeUrl);
        setSchemeUrl('');
      } else {
        setTraDoc(null);
        if (traUrl) URL.revokeObjectURL(traUrl);
        setTraUrl('');
      }
      setSavingStatus('saved');
      setTimeout(() => setSavingStatus('idle'), 2000);
    } catch (err) {
      console.error(err);
      setSavingStatus('error');
    }
  };

  const classInfo = STATION_CLASS_INFO[station.classType];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" id="passport-modal-backdrop">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-6xl h-[88vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200" id="passport-modal-content">
        
        {/* Modal Header */}
        <div className="bg-slate-50 border-b border-slate-200 p-5 flex items-center justify-between" id="passport-modal-header">
          <div className="flex items-center gap-4 flex-1">
            <div className="flex flex-col w-full">
              {isEditingCard ? (
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full max-w-2xl">
                  <div className="flex items-center gap-2 shrink-0">
                    <h2 className="text-xl font-bold text-slate-900 font-sans tracking-tight shrink-0" id="station-title">{station.name}</h2>
                    <span className="text-xs text-slate-400 font-medium shrink-0">(Редактирование)</span>
                  </div>
                  <div className="flex items-center gap-3 w-full">
                    {/* Class Selector */}
                    <div className="flex items-center gap-1.5 w-40">
                      <span className="text-xs text-slate-500 font-semibold shrink-0">Класс:</span>
                      <select
                        value={editClass}
                        onChange={(e) => setEditClass(e.target.value as StationClass)}
                        className="bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-[#e21a1a] w-full cursor-pointer"
                        id="edit-class-select"
                      >
                        {(Object.values(StationClass) as StationClass[]).map((cls) => (
                          <option key={cls} value={cls}>
                            {STATION_CLASS_INFO[cls].label} класс ({cls === StationClass.EXTRA ? 'ВН' : cls})
                          </option>
                        ))}
                      </select>
                    </div>
                    {/* Ordinate / KM Input */}
                    <div className="flex items-center gap-1.5 w-44">
                      <span className="text-xs text-slate-500 font-semibold shrink-0">км:</span>
                      <input
                        type="text"
                        value={editKm}
                        onChange={(e) => setEditKm(e.target.value)}
                        placeholder="418,6"
                        className="bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-[#e21a1a] w-full"
                        id="edit-km-input"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-xl font-bold text-slate-900 font-sans tracking-tight" id="station-title">{station.name}</h2>
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${classInfo.color}`} id="station-class-badge">
                      {classInfo.label} класс
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-2 font-medium">
                    <MapPin size={12} className="text-[#e21a1a]" />
                    <span>Ордината: км {station.km} Смоленского территориального управления МЖД</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Save / Edit Buttons */}
            {isEditingCard ? (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleSaveCard}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                  id="save-card-btn"
                >
                  <Check size={14} />
                  Сохранить
                </button>
                <button
                  onClick={() => {
                    setIsEditingCard(false);
                    setEditClass(station.classType);
                    setEditKm(station.km);
                    setEditDesc(station.description || '');
                  }}
                  className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  id="cancel-card-edit-btn"
                >
                  <X size={14} />
                  Отмена
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsEditingCard(true)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 font-bold border border-slate-300 rounded-lg text-xs transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                id="edit-card-toggle-btn"
              >
                <Edit2 size={13} className="text-[#e21a1a]" />
                Редактировать карточку
              </button>
            )}

            <div className="w-px h-6 bg-slate-200 mx-1" />

            {/* Saving indicator status */}
            {savingStatus === 'saving' && (
              <span className="text-xs text-slate-500 flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200" id="saving-status">
                <RefreshCw size={12} className="animate-spin text-[#e21a1a]" />
                Сохранение...
              </span>
            )}
            {savingStatus === 'saved' && (
              <span className="text-xs text-emerald-700 flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200" id="saved-status">
                <Check size={12} />
                Сохранено
              </span>
            )}
            {savingStatus === 'error' && (
              <span className="text-xs text-red-700 flex items-center gap-1.5 bg-red-50 px-3 py-1.5 rounded-lg border border-red-200" id="error-status">
                <AlertCircle size={12} />
                Ошибка сохранения
              </span>
            )}

            <button 
              onClick={onClose}
              className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              id="close-modal-btn"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Main Body Grid */}
        <div className="flex-1 flex overflow-hidden flex-col md:flex-row" id="passport-modal-inner-body">
          
          {/* Left Navigation & Overview Rail */}
          <div className="w-full md:w-64 bg-slate-50 p-5 border-r border-slate-200 flex flex-col justify-between" id="passport-modal-rail">
            <div className="flex flex-col gap-6">
              
              {/* Tab Selector Buttons */}
              <div className="flex flex-col gap-1.5" id="tab-selectors">
                <button
                  id="tab-btn-scheme"
                  onClick={() => setActiveTab('scheme')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                    activeTab === 'scheme' 
                      ? 'bg-[#e21a1a] text-white shadow-lg shadow-red-500/15' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <FileText size={16} />
                  <span>СХЕМА СТАНЦИИ</span>
                </button>

                <button
                  id="tab-btn-staff"
                  onClick={() => setActiveTab('staff')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                    activeTab === 'staff' 
                      ? 'bg-[#e21a1a] text-white shadow-lg shadow-red-500/15' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <Users size={16} />
                  <span>ШТАТ СТАНЦИИ</span>
                </button>

                <button
                  id="tab-btn-tra"
                  onClick={() => setActiveTab('tra')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                    activeTab === 'tra' 
                      ? 'bg-[#e21a1a] text-white shadow-lg shadow-red-500/15' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <FileText size={16} />
                  <span>ТРА СТАНЦИИ</span>
                </button>

                <button
                  id="tab-btn-indicators"
                  onClick={() => setActiveTab('indicators')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                    activeTab === 'indicators' 
                      ? 'bg-[#e21a1a] text-white shadow-lg shadow-red-500/15' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <BarChart2 size={16} />
                  <span>ПОКАЗАТЕЛИ РАБОТЫ</span>
                </button>
              </div>

              {/* Station Description Card */}
              <div className="bg-white rounded-xl p-4 border border-slate-200 text-xs shadow-sm flex flex-col gap-2" id="station-description-card">
                {isEditingCard ? (
                  <>
                    <div className="font-bold text-slate-800">Короткая справка:</div>
                    <textarea
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      rows={5}
                      placeholder="Введите краткую информацию о станции, ее особенностях, путевом развитии или истории..."
                      className="w-full bg-slate-50 border border-slate-300 rounded p-2 text-xs text-slate-800 focus:outline-none focus:border-[#e21a1a] resize-none"
                      id="edit-description-textarea"
                    />
                  </>
                ) : (
                  <>
                    <div className="font-bold text-slate-800">Короткая справка:</div>
                    <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                      {station.description || 'Справка не заполнена. Вы можете нажать «Редактировать карточку» вверху, чтобы добавить описание станции.'}
                    </p>
                    <div className="mt-2 pt-2 border-t border-slate-100 font-bold text-[10px] text-slate-400 uppercase tracking-wider">
                      Справочно ({classInfo.label} класс):
                    </div>
                    <p className="text-slate-400 leading-relaxed text-[11px]">{classInfo.desc}</p>
                  </>
                )}
              </div>

            </div>

            {/* Simulated Tracks Blueprint (Extremely realistic industrial visual mockup!) */}
            <div className="mt-auto hidden md:block" id="simulated-railway-blueprint">
              <div className="text-[10px] text-slate-400 font-bold font-mono tracking-wider uppercase mb-1.5">Схематичный путевой макет:</div>
              <div className="h-16 w-full bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center overflow-hidden relative">
                {/* Platform overlay */}
                <div className="absolute top-1 left-2 right-2 h-2 bg-[#e21a1a]/10 border-b border-[#e21a1a]/20 rounded" />
                <svg width="100%" height="100%" className="opacity-80">
                  <line x1="10" y1="20" x2="190" y2="20" stroke="#94a3b8" strokeWidth="2" />
                  <line x1="10" y1="44" x2="190" y2="44" stroke="#94a3b8" strokeWidth="2" />
                  {/* Switch loops */}
                  <path d="M 30,20 Q 55,32 80,44" fill="none" stroke="#94a3b8" strokeWidth="2" />
                  <path d="M 120,44 Q 145,32 170,20" fill="none" stroke="#94a3b8" strokeWidth="2" />
                  {/* Station building dot */}
                  <rect x="95" y="14" width="12" height="12" fill="#e21a1a" rx="2" />
                </svg>
              </div>
            </div>

          </div>

          {/* Right Main Content Panel */}
          <div className="flex-1 overflow-y-auto p-6 bg-white" id="passport-modal-panel-content">
            
            {/* TAB: STAFF */}
            {activeTab === 'staff' && (
              <div className="flex flex-col gap-5 animate-in fade-in duration-150" id="tab-content-staff">
                
                {/* Actions & Imports Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200" id="staff-actions-bar">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-800">Штат работников станции ({staffList.length})</span>
                    <span className="text-xs text-slate-500 mt-0.5">Управляйте списком должностей или импортируйте таблицу из Excel</span>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Add row */}
                    <button
                      id="add-staff-btn"
                      onClick={handleAddStaffRow}
                      className="flex items-center gap-1.5 px-3 py-2 bg-[#e21a1a] hover:bg-red-700 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer shadow-sm"
                    >
                      <Plus size={14} />
                      Добавить должность
                    </button>

                    {/* Download Template */}
                    <button
                      id="download-staff-template-btn"
                      onClick={handleDownloadStaffTemplate}
                      className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-lg text-xs transition-colors cursor-pointer border border-slate-200 shadow-sm"
                      title="Скачать пустой Excel-шаблон заполнения штата"
                    >
                      <Download size={14} />
                      Скачать шаблон
                    </button>

                    {/* Excel Upload Input Wrapper */}
                    <label 
                      id="upload-staff-excel-label"
                      className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-emerald-600 font-semibold rounded-lg text-xs transition-colors cursor-pointer border border-slate-200 shadow-sm"
                      title="Загрузить заполненную таблицу Excel со штатом"
                    >
                      <FileSpreadsheet size={14} />
                      Импорт Excel
                      <input
                        ref={excelStaffRef}
                        type="file"
                        accept=".xlsx, .xls"
                        onChange={handleExcelStaffUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Staff Table Grid */}
                {staffList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-12 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center" id="empty-staff-alert">
                    <Users size={36} className="text-slate-300 mb-3 animate-pulse" />
                    <span className="text-sm font-semibold text-slate-500">Штатное расписание не заполнено</span>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm">Используйте кнопку выше для добавления должностей вручную или загрузите заполненную таблицу Excel.</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm" id="staff-table-wrapper">
                    <table className="w-full text-left border-collapse" id="staff-table">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold font-mono tracking-wider text-slate-500 uppercase">
                          <th className="py-3 px-4">Должность</th>
                          <th className="py-3 px-4">ФИО сотрудника</th>
                          <th className="py-3 px-4">Телефоны (через запятую)</th>
                          <th className="py-3 px-4 text-center w-28">Действия</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                        {staffList.map((item) => {
                          const isEditing = editingStaffId === item.id;
                          return (
                            <tr key={item.id} className="hover:bg-slate-50/50 transition-colors" id={`staff-row-${item.id}`}>
                              {/* Position */}
                              <td className="py-2.5 px-4 font-semibold text-slate-800">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={item.position}
                                    onChange={(e) => handleUpdateStaff(item.id, 'position', e.target.value)}
                                    className="w-full bg-white border border-slate-200 px-2 py-1 rounded text-xs text-slate-800 focus:outline-none focus:border-[#e21a1a]"
                                  />
                                ) : (
                                  item.position
                                )}
                              </td>

                              {/* Full name */}
                              <td className="py-2.5 px-4 text-slate-700">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={item.fullName}
                                    onChange={(e) => handleUpdateStaff(item.id, 'fullName', e.target.value)}
                                    className="w-full bg-white border border-slate-200 px-2 py-1 rounded text-xs text-slate-800 focus:outline-none focus:border-[#e21a1a]"
                                  />
                                ) : (
                                  item.fullName
                                )}
                              </td>

                              {/* Phone */}
                              <td className="py-2.5 px-4 font-mono text-slate-500">
                                {isEditing ? (
                                  <div className="flex flex-col gap-1">
                                    <input
                                      type="text"
                                      value={item.phone}
                                      onChange={(e) => handleUpdateStaff(item.id, 'phone', e.target.value)}
                                      className="w-full bg-white border border-slate-200 px-2 py-1 rounded text-[11px] text-slate-800 focus:outline-none focus:border-[#e21a1a]"
                                      placeholder="Номера через запятую (например: +7 999 123-45-67, 4-22-11)"
                                    />
                                    <span className="text-[10px] text-slate-400 font-sans">
                                      Можно указать несколько номеров через запятую
                                    </span>
                                  </div>
                                ) : (
                                  item.phone ? (
                                    <div className="flex flex-wrap gap-1">
                                      {item.phone.split(/[,;/]+/).map((ph, idx) => {
                                        const cleanPh = ph.trim();
                                        if (!cleanPh) return null;
                                        return (
                                          <span 
                                            key={idx} 
                                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-semibold rounded-md text-[11px] border border-slate-200 transition-colors shadow-2xs"
                                          >
                                            <span className="w-1.5 h-1.5 bg-[#e21a1a] rounded-full animate-pulse" />
                                            {cleanPh}
                                          </span>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <span className="text-slate-300">—</span>
                                  )
                                )}
                              </td>

                              {/* Actions */}
                              <td className="py-2.5 px-4 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  {isEditing ? (
                                    <button
                                      id={`save-staff-btn-${item.id}`}
                                      onClick={() => handleSaveStaffRow(item.id)}
                                      className="p-1 hover:bg-emerald-50 rounded text-emerald-600 cursor-pointer border border-transparent hover:border-emerald-200"
                                      title="Сохранить строку"
                                    >
                                      <Check size={14} />
                                    </button>
                                  ) : (
                                    <button
                                      id={`edit-staff-btn-${item.id}`}
                                      onClick={() => setEditingStaffId(item.id)}
                                      className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-[#e21a1a] cursor-pointer"
                                      title="Редактировать строку"
                                    >
                                      <Edit2 size={14} />
                                    </button>
                                  )}

                                  <button
                                    id={`delete-staff-btn-${item.id}`}
                                    onClick={() => handleRemoveStaff(item.id)}
                                    className="p-1 hover:bg-red-50 rounded text-slate-400 hover:text-red-600 cursor-pointer"
                                    title="Удалить должность"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB: SCHEME */}
            {activeTab === 'scheme' && (
              <div className="flex flex-col gap-5 animate-in fade-in duration-150" id="tab-content-scheme">
                <div className="flex flex-col bg-slate-50 p-4 rounded-xl border border-slate-200" id="scheme-meta-bar">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <span className="text-sm font-bold text-slate-800">Техническая схема путевого развития станции</span>
                      <p className="text-xs text-slate-500 mt-0.5">Вкладка позволяет загружать путевые схемы в формате PDF для их детального изучения.</p>
                    </div>

                    <label 
                      id="upload-scheme-pdf-label"
                      className="flex items-center justify-center gap-1.5 px-3 py-2 bg-[#e21a1a] hover:bg-red-700 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer self-start shadow-sm"
                    >
                      <Upload size={14} />
                      Загрузить PDF схему
                      <input
                        ref={schemeInputRef}
                        type="file"
                        accept="application/pdf"
                        onChange={(e) => handlePdfUpload(e, 'scheme')}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {schemeDoc ? (
                  <div className="flex flex-col gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200" id="scheme-pdf-viewport-card">
                    {/* File metadata */}
                    <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-200 pb-3" id="scheme-pdf-metadata">
                      <div className="flex items-center gap-2">
                        <FileText size={14} className="text-[#e21a1a]" />
                        <span className="text-slate-800 font-bold">{schemeDoc.fileName}</span>
                        <span className="text-slate-300">•</span>
                        <span>Загружено: {schemeDoc.uploadedAt}</span>
                      </div>
                      <button
                        id="remove-scheme-pdf-btn"
                        onClick={() => handleRemovePdf('scheme')}
                        className="text-red-600 hover:text-red-700 font-bold cursor-pointer transition-colors"
                      >
                        Удалить схему
                      </button>
                    </div>

                    {/* Notice & Active Call-To-Action buttons */}
                    <div className="bg-gradient-to-r from-red-50 to-slate-50 p-5 rounded-xl border border-red-100 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm" id="scheme-pdf-view-helpers">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-[#e21a1a]/10 text-[#e21a1a] rounded-xl shrink-0">
                          <FileText size={26} className="animate-pulse" />
                        </div>
                        <div>
                          <span className="text-sm font-bold text-slate-800 block">Файл схемы PDF успешно подготовлен!</span>
                          <span className="text-xs text-slate-500 mt-0.5 block max-w-md">
                            В связи с ограничениями безопасности браузера для документов внутри фреймов, откройте путевую схему в новой вкладке.
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto shrink-0">
                        <a
                          href={schemeUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-4.5 py-2.5 bg-[#e21a1a] hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-500/15 cursor-pointer text-center"
                        >
                          <FileText size={14} />
                          Открыть во весь экран
                        </a>
                        <a
                          href={schemeUrl}
                          download={schemeDoc.fileName}
                          className="px-4.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 border border-slate-200 shadow-sm cursor-pointer text-center"
                        >
                          <Download size={14} />
                          Скачать PDF файл
                        </a>
                      </div>
                    </div>

                    {/* Integrated PDF iframe preview */}
                    <div className="bg-slate-100 rounded-lg overflow-hidden border border-slate-200 flex flex-col items-center justify-center min-h-[480px]" id="scheme-pdf-frame-wrapper">
                      <iframe 
                        src={schemeUrl} 
                        className="w-full h-[500px]" 
                        title="Техническая схема путевого развития"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-16 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center" id="empty-scheme-alert">
                    <FileText size={48} className="text-slate-300 mb-4 animate-bounce" />
                    <span className="text-base font-semibold text-slate-700">Путевая схема не загружена</span>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm">Используйте кнопку выше для загрузки официального чертежа или схемы путевого развития в формате PDF.</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB: TRA */}
            {activeTab === 'tra' && (
              <div className="flex flex-col gap-5 animate-in fade-in duration-150" id="tab-content-tra">
                <div className="flex flex-col bg-slate-50 p-4 rounded-xl border border-slate-200" id="tra-meta-bar">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <span className="text-sm font-bold text-slate-800">ТРА станции (Техническо-распорядительный акт)</span>
                      <p className="text-xs text-slate-500 mt-0.5">Вкладка предназначена для хранения и просмотра документов техническо-распорядительных актов станций.</p>
                    </div>

                    <label 
                      id="upload-tra-pdf-label"
                      className="flex items-center justify-center gap-1.5 px-3 py-2 bg-[#e21a1a] hover:bg-red-700 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer self-start shadow-sm"
                    >
                      <Upload size={14} />
                      Загрузить PDF ТРА
                      <input
                        ref={traInputRef}
                        type="file"
                        accept="application/pdf"
                        onChange={(e) => handlePdfUpload(e, 'tra')}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {traDoc ? (
                  <div className="flex flex-col gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200" id="tra-pdf-viewport-card">
                    {/* File metadata */}
                    <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-200 pb-3" id="tra-pdf-metadata">
                      <div className="flex items-center gap-2">
                        <FileText size={14} className="text-[#e21a1a]" />
                        <span className="text-slate-800 font-bold">{traDoc.fileName}</span>
                        <span className="text-slate-300">•</span>
                        <span>Загружено: {traDoc.uploadedAt}</span>
                      </div>
                      <button
                        id="remove-tra-pdf-btn"
                        onClick={() => handleRemovePdf('tra')}
                        className="text-red-600 hover:text-red-700 font-bold cursor-pointer transition-colors"
                      >
                        Удалить ТРА
                      </button>
                    </div>

                    {/* Notice & Active Call-To-Action buttons */}
                    <div className="bg-gradient-to-r from-red-50 to-slate-50 p-5 rounded-xl border border-red-100 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm" id="tra-pdf-view-helpers">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-[#e21a1a]/10 text-[#e21a1a] rounded-xl shrink-0">
                          <FileText size={26} className="animate-pulse" />
                        </div>
                        <div>
                          <span className="text-sm font-bold text-slate-800 block">Файл ТРА PDF успешно подготовлен!</span>
                          <span className="text-xs text-slate-500 mt-0.5 block max-w-md">
                            В связи с ограничениями безопасности браузера для документов внутри фреймов, откройте ТРА в новой вкладке.
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto shrink-0">
                        <a
                          href={traUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-4.5 py-2.5 bg-[#e21a1a] hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-500/15 cursor-pointer text-center"
                        >
                          <FileText size={14} />
                          Открыть во весь экран
                        </a>
                        <a
                          href={traUrl}
                          download={traDoc.fileName}
                          className="px-4.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 border border-slate-200 shadow-sm cursor-pointer text-center"
                        >
                          <Download size={14} />
                          Скачать PDF файл
                        </a>
                      </div>
                    </div>

                    {/* Integrated PDF iframe preview */}
                    <div className="bg-slate-100 rounded-lg overflow-hidden border border-slate-200 flex flex-col items-center justify-center min-h-[480px]" id="tra-pdf-frame-wrapper">
                      <iframe 
                        src={traUrl} 
                        className="w-full h-[500px]" 
                        title="Техническо-распорядительный акт станции"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-16 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center" id="empty-tra-alert">
                    <FileText size={48} className="text-slate-300 mb-4 animate-bounce" />
                    <span className="text-base font-semibold text-slate-700">Документ ТРА не загружен</span>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm">Используйте кнопку выше для загрузки официального ТРА документа станции в формате PDF.</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB: INDICATORS */}
            {activeTab === 'indicators' && (
              <div className="flex flex-col gap-5 animate-in fade-in duration-150" id="tab-content-indicators">
                
                {/* Actions & Imports Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200" id="indicators-actions-bar">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-800">Показатели работы станции ({indicators.length})</span>
                    <span className="text-xs text-slate-500 mt-0.5">Управляйте ключевыми производственными показателями за текущий отчетный период</span>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Add row */}
                    <button
                      id="add-indicator-btn"
                      onClick={handleAddIndicatorRow}
                      className="flex items-center gap-1.5 px-3 py-2 bg-[#e21a1a] hover:bg-red-700 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer shadow-sm"
                    >
                      <Plus size={14} />
                      Добавить показатель
                    </button>

                    {/* Download Template */}
                    <button
                      id="download-indicators-template-btn"
                      onClick={handleDownloadIndicatorsTemplate}
                      className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-lg text-xs transition-colors cursor-pointer border border-slate-200 shadow-sm"
                      title="Скачать пустой Excel-шаблон заполнения показателей работы"
                    >
                      <Download size={14} />
                      Скачать шаблон
                    </button>

                    {/* Excel Upload Input Wrapper */}
                    <label 
                      id="upload-indicators-excel-label"
                      className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-emerald-600 font-semibold rounded-lg text-xs transition-colors cursor-pointer border border-slate-200 shadow-sm"
                      title="Загрузить заполненную таблицу Excel с показателями работы"
                    >
                      <FileSpreadsheet size={14} />
                      Импорт Excel
                      <input
                        ref={excelIndicatorsRef}
                        type="file"
                        accept=".xlsx, .xls"
                        onChange={handleExcelIndicatorsUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* KPI/Bento Summary Cards */}
                {indicators.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3" id="indicators-bento-summary">
                    {indicators.slice(0, 3).map((item) => {
                      const isHigh = item.percent >= 100;
                      return (
                        <div key={`card-${item.id}`} className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center justify-between shadow-sm" id={`kpi-card-${item.id}`}>
                          <div>
                            <span className="text-[10px] font-bold font-mono tracking-wider text-slate-400 uppercase">{item.metric}</span>
                            <div className="text-xl font-bold text-slate-800 mt-1">{item.fact} <span className="text-xs font-normal text-slate-500">{item.unit}</span></div>
                            <span className="text-[10px] text-slate-400">План: {item.plan} {item.unit}</span>
                          </div>
                          <div className={`text-sm font-mono font-bold px-2 py-1 rounded border ${
                            isHigh ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-[#e21a1a] bg-red-50 border-red-200'
                          }`}>
                            {item.percent}%
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Indicators Table Grid */}
                {indicators.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-12 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center" id="empty-indicators-alert">
                    <BarChart2 size={36} className="text-slate-300 mb-3 animate-pulse" />
                    <span className="text-sm font-semibold text-slate-500">Показатели работы отсутствуют</span>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm">Используйте кнопку выше для ручного добавления или импорта показателей работы из таблицы Excel.</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm" id="indicators-table-wrapper">
                    <table className="w-full text-left border-collapse" id="indicators-table">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold font-mono tracking-wider text-slate-500 uppercase">
                          <th className="py-3 px-4">Производственный показатель работы</th>
                          <th className="py-3 px-4 w-28">Ед. изм.</th>
                          <th className="py-3 px-4 w-32">План</th>
                          <th className="py-3 px-4 w-32">Факт</th>
                          <th className="py-3 px-4 w-32">Выполнение</th>
                          <th className="py-3 px-4 text-center w-28">Действия</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                        {indicators.map((item) => {
                          const isEditing = editingIndicatorId === item.id;
                          const isSuccess = item.percent >= 100;
                          return (
                            <tr key={item.id} className="hover:bg-slate-50/50 transition-colors" id={`indicator-row-${item.id}`}>
                              {/* Indicator Metric Name */}
                              <td className="py-2.5 px-4 font-semibold text-slate-800">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={item.metric}
                                    onChange={(e) => handleUpdateIndicator(item.id, 'metric', e.target.value)}
                                    className="w-full bg-white border border-slate-200 px-2 py-1 rounded text-xs text-slate-800 focus:outline-none focus:border-[#e21a1a]"
                                  />
                                ) : (
                                  item.metric
                                )}
                              </td>

                              {/* Unit */}
                              <td className="py-2.5 px-4 text-slate-500">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={item.unit}
                                    onChange={(e) => handleUpdateIndicator(item.id, 'unit', e.target.value)}
                                    className="w-full bg-white border border-slate-200 px-2 py-1 rounded text-xs text-slate-800 focus:outline-none focus:border-[#e21a1a]"
                                  />
                                ) : (
                                  item.unit
                                )}
                              </td>

                              {/* Plan */}
                              <td className="py-2.5 px-4 font-mono text-slate-600">
                                {isEditing ? (
                                  <input
                                    type="number"
                                    value={item.plan}
                                    onChange={(e) => handleUpdateIndicator(item.id, 'plan', Number(e.target.value))}
                                    className="w-full bg-white border border-slate-200 px-2 py-1 rounded text-xs text-slate-800 focus:outline-none focus:border-[#e21a1a] font-mono"
                                  />
                                ) : (
                                  item.plan.toLocaleString('ru-RU')
                                )}
                              </td>

                              {/* Fact */}
                              <td className="py-2.5 px-4 font-mono text-slate-800 font-semibold">
                                {isEditing ? (
                                  <input
                                    type="number"
                                    value={item.fact}
                                    onChange={(e) => handleUpdateIndicator(item.id, 'fact', Number(e.target.value))}
                                    className="w-full bg-white border border-slate-200 px-2 py-1 rounded text-xs text-slate-800 focus:outline-none focus:border-[#e21a1a] font-mono"
                                  />
                                ) : (
                                  item.fact.toLocaleString('ru-RU')
                                )}
                              </td>

                              {/* Execution % */}
                              <td className="py-2.5 px-4 font-mono">
                                <span className={`font-bold ${isSuccess ? 'text-emerald-600' : 'text-[#e21a1a]'}`}>
                                  {item.percent}%
                                </span>
                              </td>

                              {/* Actions */}
                              <td className="py-2.5 px-4 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  {isEditing ? (
                                    <button
                                      id={`save-indicator-btn-${item.id}`}
                                      onClick={() => handleSaveIndicatorRow(item.id)}
                                      className="p-1 hover:bg-emerald-50 rounded text-emerald-600 cursor-pointer border border-transparent hover:border-emerald-200"
                                      title="Сохранить строку"
                                    >
                                      <Check size={14} />
                                    </button>
                                  ) : (
                                    <button
                                      id={`edit-indicator-btn-${item.id}`}
                                      onClick={() => setEditingIndicatorId(item.id)}
                                      className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-[#e21a1a] cursor-pointer"
                                      title="Редактировать строку"
                                    >
                                      <Edit2 size={14} />
                                    </button>
                                  )}

                                  <button
                                    id={`delete-indicator-btn-${item.id}`}
                                    onClick={() => handleRemoveIndicator(item.id)}
                                    className="p-1 hover:bg-red-50 rounded text-slate-400 hover:text-red-600 cursor-pointer"
                                    title="Удалить показатель"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}

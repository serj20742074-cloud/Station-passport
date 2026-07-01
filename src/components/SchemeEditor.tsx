import React, { useState, useMemo } from 'react';
import { StationData, StationClass } from '../types';
import { STATION_CLASS_INFO } from '../data/stations';
import { Search, MapPin, Sliders, Link2, Trash2, Plus, CornerDownRight } from 'lucide-react';

interface SchemeEditorProps {
  stations: StationData[];
  onUpdateStations: (stations: StationData[]) => void;
  selectedStation: StationData | null;
  onSelectStation: (station: StationData | null) => void;
}

export default function SchemeEditor({
  stations,
  onUpdateStations,
  selectedStation,
  onSelectStation,
}: SchemeEditorProps) {
  const [stationSearch, setStationSearch] = useState('');
  const [connSearch, setConnSearch] = useState('');

  // Filter list of stations to select for editing
  const filteredStations = useMemo(() => {
    return stations.filter(s => 
      s.name.toLowerCase().includes(stationSearch.toLowerCase())
    );
  }, [stations, stationSearch]);

  // Filter list of potential connections
  const filteredConnectionTargets = useMemo(() => {
    if (!selectedStation) return [];
    return stations
      .filter(s => s.id !== selectedStation.id)
      .filter(s => s.name.toLowerCase().includes(connSearch.toLowerCase()));
  }, [stations, selectedStation, connSearch]);

  const handleFieldChange = (field: keyof StationData, value: any) => {
    if (!selectedStation) return;
    const updated = stations.map(s => {
      if (s.id === selectedStation.id) {
        return { ...s, [field]: value };
      }
      return s;
    });
    onUpdateStations(updated);
    onSelectStation(updated.find(s => s.id === selectedStation.id) || null);
  };

  const toggleConnection = (targetId: string) => {
    if (!selectedStation) return;
    const currentId = selectedStation.id;
    const isConnected = selectedStation.connections.includes(targetId);

    const updated = stations.map(s => {
      if (s.id === currentId) {
        const newConns = isConnected
          ? s.connections.filter(id => id !== targetId)
          : [...s.connections, targetId];
        return { ...s, connections: newConns };
      }
      if (s.id === targetId) {
        const newConns = isConnected
          ? s.connections.filter(id => id !== currentId)
          : [...s.connections, currentId];
        return { ...s, connections: newConns };
      }
      return s;
    });

    onUpdateStations(updated);
    onSelectStation(updated.find(s => s.id === currentId) || null);
  };

  const handleAddStation = () => {
    const id = `station_${Date.now()}`;
    const newStation: StationData = {
      id,
      name: 'Новая станция',
      classType: StationClass.CLASS_5,
      km: '100',
      x: 600,
      y: 450,
      connections: [],
    };
    onUpdateStations([...stations, newStation]);
    onSelectStation(newStation);
  };

  const handleDeleteStation = (id: string) => {
    if (!window.confirm('Вы действительно хотите удалить эту станцию и все её связи?')) {
      return;
    }
    const updated = stations
      .filter(s => s.id !== id)
      .map(s => ({
        ...s,
        connections: s.connections.filter(connId => connId !== id),
      }));
    onUpdateStations(updated);
    onSelectStation(null);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col gap-4 animate-in slide-in-from-right-4 duration-300 h-full max-h-[850px] overflow-y-auto" id="scheme-editor-sidebar">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <Sliders size={16} className="text-[#e21a1a]" />
          <h3 className="font-bold text-slate-900 text-sm">Параметры схемы</h3>
        </div>
        <button
          onClick={handleAddStation}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg text-[11px] transition-all cursor-pointer border border-emerald-100"
          id="add-custom-station-btn"
        >
          <Plus size={12} />
          Добавить
        </button>
      </div>

      {/* List of Stations */}
      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-bold font-mono text-slate-400 tracking-wider uppercase">ВЫБОР СТАНЦИИ ДЛЯ РЕДАКТИРОВАНИЯ</span>
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Поиск станции..."
            value={stationSearch}
            onChange={(e) => setStationSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 text-xs pl-8 pr-3 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 transition-all text-slate-800"
          />
        </div>
        
        <div className="max-h-36 overflow-y-auto border border-slate-100 rounded-xl divide-y divide-slate-50 text-xs">
          {filteredStations.map(s => {
            const isSelected = selectedStation?.id === s.id;
            const classInfo = STATION_CLASS_INFO[s.classType];
            return (
              <button
                key={s.id}
                onClick={() => onSelectStation(s)}
                className={`w-full text-left px-3 py-2 transition-colors flex items-center justify-between cursor-pointer ${
                  isSelected ? 'bg-red-50/50 font-bold text-[#e21a1a]' : 'hover:bg-slate-50 text-slate-600'
                }`}
              >
                <span>{s.name}</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded font-bold font-mono text-white" style={{ backgroundColor: classInfo?.bg || '#94a3b8' }}>
                  {s.classType}
                </span>
              </button>
            );
          })}
          {filteredStations.length === 0 && (
            <div className="p-3 text-center text-slate-400 text-[11px]">Станций не найдено</div>
          )}
        </div>
      </div>

      {/* Properties Panel */}
      {selectedStation ? (
        <div className="flex flex-col gap-4 border-t border-slate-100 pt-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold font-mono text-slate-400 tracking-wider uppercase">Свойства: {selectedStation.name}</span>
            <button
              onClick={() => handleDeleteStation(selectedStation.id)}
              className="p-1 hover:bg-red-50 text-red-500 rounded-lg transition-colors cursor-pointer"
              title="Удалить станцию со схемы"
            >
              <Trash2 size={14} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            {/* Name Input */}
            <div className="col-span-2 flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500">Название станции</label>
              <input
                type="text"
                value={selectedStation.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                className="bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg focus:ring-1 focus:ring-red-500 focus:outline-none"
              />
            </div>

            {/* Class Selection */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500">Класс станции</label>
              <select
                value={selectedStation.classType}
                onChange={(e) => handleFieldChange('classType', e.target.value as StationClass)}
                className="bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg focus:ring-1 focus:ring-red-500 focus:outline-none"
              >
                {Object.values(StationClass).map(cls => (
                  <option key={cls} value={cls}>{cls} класс</option>
                ))}
              </select>
            </div>

            {/* Kilometer Marker */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500">Километраж (км)</label>
              <input
                type="text"
                value={selectedStation.km}
                onChange={(e) => handleFieldChange('km', e.target.value)}
                className="bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg focus:ring-1 focus:ring-red-500 focus:outline-none"
              />
            </div>

            {/* Coordinate X */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500">Координата X</label>
              <input
                type="number"
                value={selectedStation.x}
                onChange={(e) => handleFieldChange('x', Number(e.target.value))}
                className="bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg focus:ring-1 focus:ring-red-500 focus:outline-none font-mono"
              />
            </div>

            {/* Coordinate Y */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500">Координата Y</label>
              <input
                type="number"
                value={selectedStation.y}
                onChange={(e) => handleFieldChange('y', Number(e.target.value))}
                className="bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg focus:ring-1 focus:ring-red-500 focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* Connections/Track Lines Editor */}
          <div className="flex flex-col gap-2 border-t border-slate-100 pt-3">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Link2 size={12} />
              <span className="text-[10px] font-bold font-mono tracking-wider uppercase">СВЯЗИ С ДРУГИМИ СТАНЦИЯМИ (ПУТИ)</span>
            </div>
            
            <div className="relative">
              <Search size={12} className="absolute left-2 top-2 text-slate-400" />
              <input
                type="text"
                placeholder="Фильтр станций..."
                value={connSearch}
                onChange={(e) => setConnSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-[11px] pl-7 pr-2 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500 text-slate-800"
              />
            </div>

            <div className="max-h-40 overflow-y-auto border border-slate-100 rounded-lg p-2 flex flex-col gap-1.5 bg-slate-50/50">
              {filteredConnectionTargets.map(target => {
                const isConnected = selectedStation.connections.includes(target.id);
                return (
                  <label
                    key={target.id}
                    className="flex items-center gap-2 text-[11px] text-slate-600 hover:text-slate-900 cursor-pointer select-none py-0.5"
                  >
                    <input
                      type="checkbox"
                      checked={isConnected}
                      onChange={() => toggleConnection(target.id)}
                      className="rounded border-slate-300 text-red-600 focus:ring-red-500 cursor-pointer"
                    />
                    <span>{target.name}</span>
                  </label>
                );
              })}
              {filteredConnectionTargets.length === 0 && (
                <div className="text-center text-slate-400 text-[10px] py-2">Нет станций для связывания</div>
              )}
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex gap-2">
            <MapPin size={14} className="text-red-500 shrink-0 mt-0.5" />
            <span className="text-[10px] text-slate-500 leading-relaxed font-medium">
              <span className="font-bold text-slate-700">Перетаскивание:</span> Вы также можете перетаскивать эту станцию мышкой по карте в реальном времени!
            </span>
          </div>
        </div>
      ) : (
        <div className="border-t border-slate-100 pt-8 pb-4 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
          <CornerDownRight size={24} className="text-slate-300 animate-bounce" />
          <span>Выберите станцию на карте или в списке выше, чтобы изменить её координаты, класс или железнодорожные пути.</span>
        </div>
      )}
    </div>
  );
}

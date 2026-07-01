/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useMemo, useEffect } from 'react';
import { STATIONS, STATION_CLASS_INFO } from '../data/stations';
import { StationData, StationClass } from '../types';
import { Search, ZoomIn, ZoomOut, RotateCcw, Filter, Navigation } from 'lucide-react';

interface InteractiveMapProps {
  stations?: StationData[];
  onSelectStation: (station: StationData) => void;
  selectedStationId?: string;
  isEditMode?: boolean;
  onUpdateStations?: (stations: StationData[]) => void;
}

const getSegmentColor = (fromId: string, toId: string) => {
  const ids = [fromId, toId];
  
  // Safonovo industrial branch
  if (ids.includes('safonovo') && ids.includes('azotnaya')) {
    return '#64748b'; // Slate gray
  }
  
  // Vladimirsky Branch
  if (ids.includes('vladimirsky_tupik') || ids.includes('igorevskaya')) {
    return '#8b5cf6'; // Purple
  }
  
  // Sychevka Branch
  if (ids.includes('sychevka') || ids.includes('novoduginskaya') || ids.includes('vyazma_novotor')) {
    return '#06b6d4'; // Cyan
  }
  
  // Temkino Branch
  if (ids.includes('temkino') || (ids.includes('volosta_pyatnitsa') && ids.includes('vyazma_bryanskaya'))) {
    return '#ec4899'; // Pink/Rose
  }
  
  // Bryansk - Zanoznaya Branch
  if (ids.includes('baskakovka') || ids.includes('ugra')) {
    return '#3b82f6'; // Blue
  }
  if (ids.includes('vyazma_bryanskaya') && ids.includes('zanoznaya')) {
    return '#3b82f6'; // Blue
  }
  
  // Roslavl-Ponyatovka Branch
  if (ids.includes('ponyatovka')) {
    return '#10b981'; // Green
  }
  
  // Lyudinovo Branch
  if (ids.includes('lyudinovo_1') || ids.includes('lyudinovo_2')) {
    return '#f59e0b'; // Amber
  }

  // Loop connections
  const loopIds = ['dobromino', 'elnya', 'pavlinovo', 'spas_demensk', 'zanoznaya', 'baryatinskaya', 'shaykovka', 'fayansovaya', 'aselye', 'betlitsa', 'podpisnaya'];
  if (loopIds.includes(fromId) || loopIds.includes(toId)) {
    if (ids.includes('valutino') || ids.includes('dobromino')) {
      return '#f59e0b'; // Amber
    }
    if (loopIds.includes(fromId) && loopIds.includes(toId)) {
      return '#f59e0b'; // Amber
    }
  }

  // Roslavl Meridian Line (Vertical)
  const meridianIds = ['novosmolenskaya', 'valutino', 'tychinino', 'ryabtsevo', 'peresna', 'pochinok', 'engelgardtovskaya', 'stodolishche', 'kozlovka', 'roslavl_1'];
  if (meridianIds.includes(fromId) || meridianIds.includes(toId)) {
    if (ids.includes('smolensk') || ids.includes('smolensk_sort')) {
      return '#10b981'; // Green connecting to hub
    }
    if (meridianIds.includes(fromId) && meridianIds.includes(toId)) {
      return '#10b981'; // Green
    }
  }
  
  // Main Smolensk Line (RZD Mainline)
  return '#e21a1a'; // Red
};

const getNumTracks = (fromId: string, toId: string): number => {
  const ids = [fromId, toId];
  
  // Smolensk to Vyazma (now double track as per user request)
  const mainDoubleTrackIds = [
    'smolensk_sort', 'dukhovskaya', 'kardymovo', 'yartsevo', 'milokhovo', 
    'safonovo', 'durovo', 'izdeshkovo', 'semlevo', 'vyazma', 'smolensk'
  ];
  if (mainDoubleTrackIds.includes(fromId) && mainDoubleTrackIds.includes(toId)) {
    return 2;
  }

  // Smolensk to Rakitnaya via Krasny Bor (double track as per user request)
  const smolenskRakitnayaIds = ['smolensk', 'krasny_bor', 'rakitnaya'];
  if (smolenskRakitnayaIds.includes(fromId) && smolenskRakitnayaIds.includes(toId)) {
    return 2;
  }
  
  // 2. Double track: Krasnoe to Smolensk
  const doubleTrackWest = ['krasnoe', 'gusino', 'gnezdovo', 'smolensk'];
  if (doubleTrackWest.includes(fromId) && doubleTrackWest.includes(toId)) {
    return 2;
  }
  
  // Double track: Vyazma to Borodino
  const doubleTrackEast = [
    'vyazma', 'meshcherskaya', 'tumanovo', 'gagarin', 'putevoy_post_161', 
    'uvarovka', 'borodino'
  ];
  if (doubleTrackEast.includes(fromId) && doubleTrackEast.includes(toId)) {
    return 2;
  }
  
  return 1;
};

const getTrackOffsetLines = (from: { x: number; y: number }, to: { x: number; y: number }, numTracks: number) => {
  if (numTracks === 1) {
    return [{ from, to }];
  }
  
  // Calculate direction and normal vector
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return [{ from, to }];
  
  // Perpendicular normalized vector
  const nx = -dy / len;
  const ny = dx / len;
  
  // Track spacing
  const spacing = 3.2;
  
  if (numTracks === 2) {
    const offset = spacing / 2;
    return [
      {
        from: { x: from.x + nx * offset, y: from.y + ny * offset },
        to: { x: to.x + nx * offset, y: to.y + ny * offset }
      },
      {
        from: { x: from.x - nx * offset, y: from.y - ny * offset },
        to: { x: to.x - nx * offset, y: to.y - ny * offset }
      }
    ];
  } else if (numTracks === 3) {
    return [
      {
        from: { x: from.x + nx * spacing, y: from.y + ny * spacing },
        to: { x: to.x + nx * spacing, y: to.y + ny * spacing }
      },
      {
        from,
        to
      },
      {
        from: { x: from.x - nx * spacing, y: from.y - ny * spacing },
        to: { x: to.x - nx * spacing, y: to.y - ny * spacing }
      }
    ];
  }
  
  return [{ from, to }];
};

export default function InteractiveMap({ 
  stations = STATIONS, 
  onSelectStation, 
  selectedStationId,
  isEditMode = false,
  onUpdateStations
}: InteractiveMapProps) {
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedClasses, setSelectedClasses] = useState<StationClass[]>(Object.values(StationClass));
  const [hoveredStation, setHoveredStation] = useState<StationData | null>(null);
  const [activeDragStationId, setActiveDragStationId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Default coordinate boundaries
  const mapWidth = 1200;
  const mapHeight = 900;

  // Zoom and pan functions
  const handleZoomIn = () => setZoom((prev) => Math.min(prev * 1.2, 5));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev / 1.2, 0.5));
  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Center on a specific station
  const centerOnStation = (station: StationData) => {
    if (!containerRef.current) return;
    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;

    // We want the station coordinates (station.x, station.y) to be centered in the container.
    // Container coordinates: target_x = containerWidth / 2, target_y = containerHeight / 2
    // SVG coordinates scaled: scaled_x = station.x * zoom, scaled_y = station.y * zoom
    // We need pan to be: target - scaled
    const targetZoom = 1.8;
    setZoom(targetZoom);
    setPan({
      x: containerWidth / 2 - station.x * targetZoom,
      y: containerHeight / 2 - station.y * targetZoom,
    });
  };

  const handleStationMouseDown = (e: React.MouseEvent, stationId: string) => {
    if (!isEditMode) return;
    e.stopPropagation();
    setActiveDragStationId(stationId);
    const selected = stations.find(s => s.id === stationId);
    if (selected) {
      onSelectStation(selected);
    }
  };

  const handleStationTouchStart = (e: React.TouchEvent, stationId: string) => {
    if (!isEditMode) return;
    e.stopPropagation();
    setActiveDragStationId(stationId);
    const selected = stations.find(s => s.id === stationId);
    if (selected) {
      onSelectStation(selected);
    }
  };

  // Mouse drag handlers for panning and node dragging
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    // Only drag on left click
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (activeDragStationId && svgRef.current && onUpdateStations) {
      const rect = svgRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const svgX = Math.round(mouseX / zoom);
      const svgY = Math.round(mouseY / zoom);
      
      const clampedX = Math.max(10, Math.min(mapWidth - 10, svgX));
      const clampedY = Math.max(10, Math.min(mapHeight - 10, svgY));
      
      onUpdateStations(stations.map(s => {
        if (s.id === activeDragStationId) {
          return { ...s, x: clampedX, y: clampedY };
        }
        return s;
      }));
      return;
    }

    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setActiveDragStationId(null);
  };

  // Touch handlers for mobile panning and node dragging
  const handleTouchStart = (e: React.TouchEvent<SVGSVGElement>) => {
    if (e.touches.length !== 1) return;
    setIsDragging(true);
    const touch = e.touches[0];
    setDragStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
  };

  const handleTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
    if (activeDragStationId && svgRef.current && onUpdateStations && e.touches.length === 1) {
      const touch = e.touches[0];
      const rect = svgRef.current.getBoundingClientRect();
      const mouseX = touch.clientX - rect.left;
      const mouseY = touch.clientY - rect.top;
      
      const svgX = Math.round(mouseX / zoom);
      const svgY = Math.round(mouseY / zoom);
      
      const clampedX = Math.max(10, Math.min(mapWidth - 10, svgX));
      const clampedY = Math.max(10, Math.min(mapHeight - 10, svgY));
      
      onUpdateStations(stations.map(s => {
        if (s.id === activeDragStationId) {
          return { ...s, x: clampedX, y: clampedY };
        }
        return s;
      }));
      return;
    }

    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setPan({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setActiveDragStationId(null);
  };

  // Scroll zoom handler
  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const zoomFactor = 1.1;
    const newZoom = e.deltaY < 0 ? Math.min(zoom * zoomFactor, 5) : Math.max(zoom / zoomFactor, 0.5);
    
    if (svgRef.current && containerRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Translate pan to zoom towards mouse position
      const svgMouseX = mouseX / zoom;
      const svgMouseY = mouseY / zoom;

      setZoom(newZoom);
      setPan({
        x: e.clientX - containerRef.current.getBoundingClientRect().left - svgMouseX * newZoom,
        y: e.clientY - containerRef.current.getBoundingClientRect().top - svgMouseY * newZoom,
      });
    }
  };

  // Filter stations based on class selection
  const visibleStations = useMemo(() => {
    return stations.filter((station) => selectedClasses.includes(station.classType));
  }, [stations, selectedClasses]);

  // Compute rail paths (connections)
  const railLines = useMemo(() => {
    const lines: Array<{ from: StationData; to: StationData; key: string }> = [];
    const visited = new Set<string>();

    stations.forEach((station) => {
      station.connections.forEach((connId) => {
        const target = stations.find((s) => s.id === connId);
        if (target) {
          const key1 = `${station.id}_${target.id}`;
          const key2 = `${target.id}_${station.id}`;
          if (!visited.has(key1) && !visited.has(key2)) {
            lines.push({ from: station, to: target, key: key1 });
            visited.add(key1);
          }
        }
      });
    });
    return lines;
  }, [stations]);

  // Filter search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return stations.filter((s) => s.name.toLowerCase().includes(query));
  }, [stations, searchQuery]);

  const handleSearchResultClick = (station: StationData) => {
    centerOnStation(station);
    onSelectStation(station);
    setSearchQuery('');
  };

  // Toggle class filters
  const toggleClass = (classType: StationClass) => {
    setSelectedClasses((prev) =>
      prev.includes(classType) ? prev.filter((c) => c !== classType) : [...prev, classType]
    );
  };

  // Label position helper
  const getLabelOffset = (position: StationData['labelPosition'] = 'top') => {
    const d = 16;
    switch (position) {
      case 'top': return { dx: 0, dy: -d, textAnchor: 'middle' };
      case 'bottom': return { dx: 0, dy: d + 4, textAnchor: 'middle' };
      case 'left': return { dx: -d, dy: 4, textAnchor: 'end' };
      case 'right': return { dx: d, dy: 4, textAnchor: 'start' };
      case 'top-left': return { dx: -d + 4, dy: -d + 4, textAnchor: 'end' };
      case 'top-right': return { dx: d - 4, dy: -d + 4, textAnchor: 'start' };
      case 'bottom-left': return { dx: -d + 4, dy: d, textAnchor: 'end' };
      case 'bottom-right': return { dx: d - 4, dy: d, textAnchor: 'start' };
      default: return { dx: 0, dy: -d, textAnchor: 'middle' };
    }
  };

  // Kilometer label position helper (placed opposite of the station name label)
  const getKmOffset = (position: StationData['labelPosition'] = 'top') => {
    const d = 16;
    switch (position) {
      case 'top': return { dx: 0, dy: d + 4, textAnchor: 'middle' };
      case 'bottom': return { dx: 0, dy: -d - 1, textAnchor: 'middle' };
      case 'left': return { dx: d, dy: 4, textAnchor: 'start' };
      case 'right': return { dx: -d, dy: 4, textAnchor: 'end' };
      case 'top-left': return { dx: d - 4, dy: d, textAnchor: 'start' };
      case 'top-right': return { dx: -d + 4, dy: d, textAnchor: 'end' };
      case 'bottom-left': return { dx: d - 4, dy: -d + 4, textAnchor: 'start' };
      case 'bottom-right': return { dx: -d + 4, dy: -d + 4, textAnchor: 'end' };
      default: return { dx: 0, dy: d + 4, textAnchor: 'middle' };
    }
  };

  return (
    <div className="relative w-full h-[620px] bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden flex flex-col shadow-lg animate-in fade-in duration-300" id="map-container-root">
      {/* Top Bar Controls */}
      <div className="absolute top-4 left-4 right-4 z-10 flex flex-wrap gap-3 items-center justify-between pointer-events-none" id="map-controls-panel">
        
        {/* Filter bar - interactive */}
        <div className="flex flex-wrap gap-1.5 bg-white/95 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-200 pointer-events-auto shadow-md" id="class-filter-bar">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mr-1.5 border-r border-slate-200 pr-2">
            <Filter size={13} className="text-slate-400" />
            Классы станций:
          </div>
          {Object.values(StationClass).map((cls) => {
            const info = STATION_CLASS_INFO[cls];
            const isSelected = selectedClasses.includes(cls);
            return (
              <button
                key={cls}
                id={`filter-btn-${cls}`}
                onClick={() => toggleClass(cls)}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all flex items-center gap-1 border cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                <span className="w-2 h-2 rounded-full border border-black/10" style={{ backgroundColor: info.bg }} />
                <span>{cls} класс</span>
              </button>
            );
          })}
        </div>

        {/* Search Input - interactive */}
        <div className="relative pointer-events-auto min-w-[240px] md:min-w-[300px]" id="map-search-wrapper">
          <div className="relative flex items-center">
            <Search className="absolute left-3 text-slate-400" size={16} />
            <input
              type="text"
              id="station-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск станции (напр., Смоленск)..."
              className="w-full pl-9 pr-4 py-2 bg-white/95 backdrop-blur-md border border-slate-200 text-slate-800 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all placeholder-slate-400 shadow-md"
            />
          </div>

          {/* Search Dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute top-full mt-1.5 left-0 right-0 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-2xl z-20 divide-y divide-slate-100 scrollbar-thin scrollbar-thumb-slate-200" id="search-results-dropdown">
              {searchResults.map((station) => {
                const classInfo = STATION_CLASS_INFO[station.classType];
                return (
                  <button
                    key={station.id}
                    id={`search-result-${station.id}`}
                    onClick={() => handleSearchResultClick(station)}
                    className="w-full px-4 py-2.5 text-left hover:bg-slate-50 transition-all flex items-center justify-between cursor-pointer group"
                  >
                    <div>
                      <div className="text-sm font-medium text-slate-800 group-hover:text-red-600 transition-all">{station.name}</div>
                      <div className="text-xs text-slate-400">км {station.km}</div>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded border border-slate-100" style={{ color: classInfo.bg, backgroundColor: `${classInfo.bg}15` }}>
                      {station.classType} класс
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Main Interactive Map Viewer */}
      <div 
        ref={containerRef}
        className="w-full flex-1 overflow-hidden cursor-grab active:cursor-grabbing relative"
        id="map-canvas-container"
      >
        <svg
          ref={svgRef}
          width={mapWidth}
          height={mapHeight}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onWheel={handleWheel}
          className="transition-transform duration-75 select-none bg-[#ffffff]"
          id="railway-svg"
        >
          {/* Main White Map Canvas Backing */}
          <rect width={mapWidth} height={mapHeight} fill="#ffffff" />

          {/* Railway Tracks (Underlay Glow) */}
          <g id="tracks-glow">
            {railLines.map((line) => {
              const isHighlighted = 
                (hoveredStation && (hoveredStation.id === line.from.id || hoveredStation.id === line.to.id)) ||
                (selectedStationId && (selectedStationId === line.from.id || selectedStationId === line.to.id));
              if (!isHighlighted) return null;

              const numTracks = getNumTracks(line.from.id, line.to.id);
              const tracks = getTrackOffsetLines(line.from, line.to, numTracks);

              return tracks.map((track, idx) => (
                <line
                  key={`glow-${line.key}-${idx}`}
                  x1={track.from.x}
                  y1={track.from.y}
                  x2={track.to.x}
                  y2={track.to.y}
                  stroke="#ef4444"
                  strokeWidth={6}
                  strokeOpacity={0.4}
                  strokeLinecap="round"
                  className="transition-all duration-300"
                />
              ));
            })}
          </g>

          {/* Railway Tracks (Main Line Styling) */}
          <g id="tracks-base">
            {railLines.map((line) => {
              const isHighlighted = 
                (hoveredStation && (hoveredStation.id === line.from.id || hoveredStation.id === line.to.id)) ||
                (selectedStationId && (selectedStationId === line.from.id || selectedStationId === line.to.id));
              const numTracks = getNumTracks(line.from.id, line.to.id);
              const tracks = getTrackOffsetLines(line.from, line.to, numTracks);

              return tracks.map((track, idx) => (
                <line
                  key={`base-${line.key}-${idx}`}
                  x1={track.from.x}
                  y1={track.from.y}
                  x2={track.to.x}
                  y2={track.to.y}
                  stroke={isHighlighted ? '#ef4444' : '#1e293b'}
                  strokeWidth={isHighlighted ? 2.5 : 1.6}
                  strokeLinecap="round"
                  className="transition-all duration-300"
                />
              ));
            })}
          </g>

          {/* Dead Ends (Blue terminal line bars matching the schematic) */}
          <g id="dead-ends">
            {stations.map((station) => {
              if (station.connections.length !== 1) return null;
              const connId = station.connections[0];
              const neighbor = stations.find((s) => s.id === connId);
              if (!neighbor) return null;
              
              const dx = station.x - neighbor.x;
              const dy = station.y - neighbor.y;
              const len = Math.sqrt(dx * dx + dy * dy);
              if (len === 0) return null;
              
              const nx = -dy / len;
              const ny = dx / len;
              const size = 11; // size of the stop bar half-length
              
              return (
                <line
                  key={`de-${station.id}`}
                  x1={station.x - nx * size}
                  y1={station.y - ny * size}
                  x2={station.x + nx * size}
                  y2={station.y + ny * size}
                  stroke="#0044ff"
                  strokeWidth={4.5}
                  strokeLinecap="square"
                />
              );
            })}
          </g>

          {/* Station Labels */}
          <g id="station-labels">
            {visibleStations.map((station) => {
              const { dx, dy, textAnchor } = getLabelOffset(station.labelPosition);
              const isSelected = selectedStationId === station.id;
              const isHovered = hoveredStation?.id === station.id;
              
              // Apply labelAngle rotation if specified
              const angle = station.labelAngle || 0;
              const transform = angle !== 0 
                ? `rotate(${angle}, ${station.x + dx}, ${station.y + dy})`
                : undefined;

              return (
                <text
                  key={`label-${station.id}`}
                  x={station.x + dx}
                  y={station.y + dy}
                  textAnchor={textAnchor}
                  transform={transform}
                  className={`font-sans select-none pointer-events-none transition-all duration-200 ${
                    isSelected 
                      ? 'text-[11px] fill-red-600 font-extrabold' 
                      : isHovered 
                        ? 'text-[10px] fill-slate-900 font-bold' 
                        : 'text-[10px] fill-slate-800 font-semibold'
                  }`}
                  style={{
                    textShadow: '0 1px 2px rgba(255,255,255,1), 0 0 2px rgba(255,255,255,1), -1px -1px 0 rgba(255,255,255,1), 1px -1px 0 rgba(255,255,255,1), -1px 1px 0 rgba(255,255,255,1), 1px 1px 0 rgba(255,255,255,1)'
                  }}
                >
                  {station.name}
                </text>
              );
            })}
          </g>

          {/* Station Nodes / Circles */}
          <g id="station-nodes">
            {visibleStations.map((station) => {
              const classInfo = STATION_CLASS_INFO[station.classType];
              const isSelected = selectedStationId === station.id;
              const isHovered = hoveredStation?.id === station.id;

              // Size based on station importance / class matching the schematic scale
              let r = 7;
              if (station.classType === StationClass.EXTRA) r = 11.5;
              else if (station.classType === StationClass.CLASS_1) r = 9.5;
              else if (station.classType === StationClass.CLASS_2) r = 8.5;
              else if (station.classType === StationClass.CLASS_3) r = 8;
              else if (station.classType === StationClass.CLASS_4) r = 7.5;

              // Choose matching text color for high contrast & accessibility
              const isLightBg = station.classType === StationClass.CLASS_3 || station.classType === StationClass.CLASS_5;
              const textColor = isLightBg ? '#000000' : '#ffffff';

              return (
                <g
                  key={`node-group-${station.id}`}
                  onMouseEnter={() => setHoveredStation(station)}
                  onMouseLeave={() => setHoveredStation(null)}
                  onMouseDown={(e) => handleStationMouseDown(e, station.id)}
                  onTouchStart={(e) => handleStationTouchStart(e, station.id)}
                  onClick={() => {
                    if (!isEditMode) {
                      onSelectStation(station);
                    }
                  }}
                  className={`cursor-pointer group ${isEditMode ? 'select-none' : ''}`}
                >
                  {/* Click/Hover Target (Larger transparent circle for easy clicking) */}
                  <circle
                    cx={station.x}
                    cy={station.y}
                    r={r + 10}
                    fill="transparent"
                  />

                  {/* Outer Selection/Hover Glow */}
                  {(isSelected || isHovered) && (
                    <circle
                      cx={station.x}
                      cy={station.y}
                      r={(isSelected ? r * 1.25 : isHovered ? r * 1.15 : r) + (isSelected ? 6 : 4)}
                      fill="none"
                      stroke={isSelected ? '#ef4444' : '#475569'}
                      strokeWidth="1.5"
                      strokeOpacity={isSelected ? 0.8 : 0.5}
                      className="animate-pulse"
                    />
                  )}

                  {/* Core Station Circle */}
                  <circle
                    cx={station.x}
                    cy={station.y}
                    r={isSelected ? r * 1.25 : isHovered ? r * 1.15 : r}
                    fill={classInfo.bg}
                    stroke={isSelected ? '#ef4444' : '#000000'}
                    strokeWidth={isSelected ? '1.8' : '1.2'}
                    className="transition-all duration-200"
                  />

                  {/* Inner Class indicator for ALL stations with correct contrast */}
                  <text
                    x={station.x}
                    y={station.y + (r <= 7.5 ? 2 : 2.5)}
                    textAnchor="middle"
                    className="font-sans font-extrabold pointer-events-none select-none transition-all duration-200"
                    style={{
                      fontSize: isSelected
                        ? (r <= 7 ? '6.5px' : r <= 8.5 ? '7.5px' : '8px')
                        : isHovered
                          ? (r <= 7 ? '6px' : r <= 8.5 ? '7px' : '7.5px')
                          : (r <= 7 ? '5.5px' : r <= 8.5 ? '6.5px' : '7px'),
                      fill: textColor
                    }}
                  >
                    {station.classType === StationClass.EXTRA ? 'ВН' : station.classType}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Dynamic Hover Tooltip inside SVG Container */}
        {hoveredStation && (
          <div
            className="absolute bg-white/95 border border-slate-200 text-slate-800 px-3 py-2 rounded-xl text-xs flex flex-col pointer-events-none shadow-xl z-30"
            style={{
              left: `${hoveredStation.x * zoom + pan.x + 15}px`,
              top: `${hoveredStation.y * zoom + pan.y - 45}px`,
            }}
            id="station-hover-tooltip"
          >
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full border border-black/10" style={{ backgroundColor: STATION_CLASS_INFO[hoveredStation.classType].bg }} />
              {hoveredStation.name}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">{STATION_CLASS_INFO[hoveredStation.classType].label} класс • км {hoveredStation.km}</div>
          </div>
        )}
      </div>

      {/* Floating Zoom & Map Controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-10 bg-white/95 backdrop-blur-md p-1.5 rounded-xl border border-slate-200 shadow-lg" id="map-zoom-buttons">
        <button
          onClick={handleZoomIn}
          className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
          title="Приблизить"
          id="zoom-in-btn"
        >
          <ZoomIn size={18} />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
          title="Отдалить"
          id="zoom-out-btn"
        >
          <ZoomOut size={18} />
        </button>
        <div className="h-px bg-slate-200 my-0.5" />
        <button
          onClick={handleReset}
          className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
          title="Сбросить карту"
          id="zoom-reset-btn"
        >
          <RotateCcw size={18} />
        </button>
      </div>

      {/* Map Footer Info */}
      <div className="bg-slate-50 border-t border-slate-200 px-4 py-2.5 flex items-center justify-between text-xs text-slate-500 z-10" id="map-footer-status">
        <div className="flex items-center gap-2">
          <Navigation size={12} className="text-red-600 animate-pulse" />
          <span className="font-medium text-slate-700">Схема Смоленского территориального управления МЖД</span>
        </div>
        <div className="hidden sm:block text-slate-400">
          <span>Прокрутка мыши для масштабирования • Зажмите для перетаскивания</span>
        </div>
      </div>
    </div>
  );
}

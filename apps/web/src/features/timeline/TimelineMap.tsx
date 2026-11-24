import React, { useState, useEffect, useRef } from 'react';
import { getTowerTimeline } from '../../lib/api/client';
import { TowerTimelineEvent } from '../../types';
import { MapPin, Navigation, Clock, AlertTriangle, ShieldAlert } from 'lucide-react';

interface Props {
  caseId: string;
  suggestedSuspects: string[];
}

export const TimelineMap: React.FC<Props> = ({ caseId, suggestedSuspects }) => {
  const [selectedNumber, setSelectedNumber] = useState<string>(suggestedSuspects[0] || '');
  const [timeline, setTimeline] = useState<TowerTimelineEvent[]>([]);
  const [unmatchedCells, setUnmatchedCells] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<TowerTimelineEvent | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    loadTimeline();
  }, [caseId, selectedNumber]);

  const loadTimeline = async () => {
    setLoading(true);
    try {
      const res = await getTowerTimeline(caseId, selectedNumber || undefined);
      if (res.status === 'success') {
        setTimeline(res.data.timeline || []);
        setUnmatchedCells(res.data.unmatched_cell_ids || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Initialize and update Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Check if Leaflet L is loaded from CDN/window
    const L = (window as any).L;
    if (!L) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current).setView([28.6139, 77.2090], 11);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors & CartoDB',
        maxZoom: 18,
      }).addTo(map);
      mapInstanceRef.current = map;
    }

    // Clear old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const map = mapInstanceRef.current;
    const latlngs: any[] = [];

    // Add unique towers and sequence lines
    timeline.forEach((item, idx) => {
      if (item.latitude && item.longitude) {
        const pt = [item.latitude, item.longitude];
        latlngs.push(pt);

        const circle = L.circleMarker(pt, {
          radius: 9,
          fillColor: '#0ea5e9',
          color: '#ffffff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.8
        }).addTo(map);

        circle.bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px; color: #0f172a;">
            <strong>${item.site_name}</strong><br/>
            Cell ID: ${item.cell_id}<br/>
            Event: ${item.timestamp || 'N/A'}<br/>
            <small style="color: #64748b;">Serving BTS sector coverage</small>
          </div>
        `);

        circle.on('click', () => setSelectedEvent(item));
        markersRef.current.push(circle);
      }
    });

    if (latlngs.length > 1) {
      const polyline = L.polyline(latlngs, {
        color: '#38bdf8',
        weight: 2,
        dashArray: '5, 8',
        opacity: 0.7
      }).addTo(map);
      markersRef.current.push(polyline);
      map.fitBounds(polyline.getBounds(), { padding: [40, 40] });
    } else if (latlngs.length === 1) {
      map.setView(latlngs[0], 12);
    }
  }, [timeline]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Selector */}
      <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
              Module: Tower Timeline & BTS Site Map
            </span>
            <span className="text-xs text-slate-400">Serving Cell Spatial Analysis</span>
          </div>
          <h2 className="text-xl font-bold text-white">Chronological Cell-Tower Association</h2>
        </div>

        {/* Suspect Filter */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-400">Filter Target:</label>
          <select
            value={selectedNumber}
            onChange={(e) => setSelectedNumber(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-sky-500"
          >
            <option value="">All Case Events</option>
            {suggestedSuspects.map(num => (
              <option key={num} value={num}>{num}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Mandatory Disclaimer (Blueprint Section 14.4) */}
      <div className="p-3.5 bg-sky-950/20 border border-sky-500/20 rounded-xl flex items-center gap-3 text-xs text-sky-300">
        <Navigation className="w-4 h-4 shrink-0 text-sky-400" />
        <span>
          <strong>Engineering & Legal Standard:</strong> Events indicate association with serving cell/site antenna sectors at call time. Never represent cell tower metadata as continuous GPS track or precise movement routes.
        </span>
      </div>

      {/* Map & Timeline Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leaflet Map */}
        <div className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden relative min-h-[500px]">
          <div ref={mapContainerRef} className="w-full h-[520px] z-0" />
          {unmatchedCells.length > 0 && (
            <div className="absolute bottom-4 left-4 z-10 p-2.5 bg-slate-900/90 border border-amber-500/30 rounded-lg text-xs text-amber-300 flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>{unmatchedCells.length} cell ID(s) without metadata coordinates</span>
            </div>
          )}
        </div>

        {/* Chronological Event Stream */}
        <div className="lg:col-span-1 bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col h-[520px]">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
            <span>Tower Events Stream</span>
            <span className="font-mono text-sky-400">{timeline.length} events</span>
          </h3>

          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            {timeline.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No cell site records found for selected filter.
              </div>
            ) : (
              timeline.map((ev, i) => (
                <div
                  key={ev.record_id}
                  onClick={() => setSelectedEvent(ev)}
                  className={`p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                    selectedEvent?.record_id === ev.record_id
                      ? 'bg-slate-800 border-sky-500 shadow-sm'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between font-mono text-[11px] text-slate-400 mb-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-sky-400" />
                      {ev.timestamp ? ev.timestamp.replace('T', ' ').substring(0, 19) : 'N/A'}
                    </span>
                    <span className="px-1.5 py-0.2 bg-slate-800 text-slate-300 rounded text-[10px]">
                      Row #{ev.source_row}
                    </span>
                  </div>
                  <div className="font-semibold text-white flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <span>{ev.site_name}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>Cell: {ev.cell_id}</span>
                    <span>{ev.a_party} ➔ {ev.b_party}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

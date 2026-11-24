import React, { useState, useEffect } from 'react';
import { getTowerTimeline } from '../../lib/api/client';
import { TowerTimelineEvent } from '../../types';
import { Play, Pause, RotateCcw, FastForward, SkipForward, Clock, MapPin, Radio } from 'lucide-react';

interface Props {
  caseId: string;
}

export const InvestigationReplay: React.FC<Props> = ({ caseId }) => {
  const [events, setEvents] = useState<TowerTimelineEvent[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1500); // ms per step

  useEffect(() => {
    loadEvents();
  }, [caseId]);

  const loadEvents = async () => {
    try {
      const res = await getTowerTimeline(caseId);
      if (res.status === 'success' && res.data.timeline) {
        setEvents(res.data.timeline);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    let timer: any;
    if (isPlaying) {
      timer = setInterval(() => {
        setCurrentIndex(prev => {
          if (prev >= events.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, speed);
    }
    return () => clearInterval(timer);
  }, [isPlaying, events.length, speed]);

  const currentEvent = events[currentIndex];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 text-xs font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded">
              Signature Differentiator: Investigation Replay
            </span>
            <span className="text-xs text-slate-400">Chronological Event Simulation</span>
          </div>
          <h2 className="text-xl font-bold text-white">Chronological Incident Player</h2>
        </div>

        {/* Player Controls */}
        <div className="flex items-center gap-2 bg-slate-950 p-2 border border-slate-800 rounded-xl">
          <button
            onClick={() => { setIsPlaying(false); setCurrentIndex(0); }}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
            title="Reset"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            disabled={events.length === 0}
            className="p-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg transition-colors shadow"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setCurrentIndex(i => Math.min(i + 1, events.length - 1))}
            disabled={events.length === 0 || currentIndex >= events.length - 1}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
            title="Step Forward"
          >
            <SkipForward className="w-4 h-4" />
          </button>
          <select
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="bg-slate-900 text-xs text-slate-300 border border-slate-800 rounded px-2 py-1 focus:outline-none"
          >
            <option value={2500}>1x Speed</option>
            <option value={1500}>2x Speed</option>
            <option value={800}>4x Speed</option>
          </select>
        </div>
      </div>

      {/* Progress Scrubber */}
      <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2">
        <div className="flex justify-between text-xs font-mono text-slate-400">
          <span>Event {events.length > 0 ? currentIndex + 1 : 0} of {events.length}</span>
          <span className="text-sky-400 font-bold">
            {currentEvent?.timestamp ? currentEvent.timestamp.replace('T', ' ') : 'No Event'}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={Math.max(0, events.length - 1)}
          value={currentIndex}
          onChange={(e) => { setIsPlaying(false); setCurrentIndex(Number(e.target.value)); }}
          className="w-full accent-sky-500 cursor-pointer"
        />
      </div>

      {/* Active Event Display */}
      {currentEvent ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 bg-slate-950 border border-sky-500/40 rounded-xl space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 text-xs font-bold rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 font-mono">
                {currentEvent.record_id}
              </span>
              <span className="text-xs text-slate-400 font-mono">Row #{currentEvent.source_row}</span>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center p-3 bg-slate-900 rounded-lg">
                <span className="text-slate-400">Calling Party (A):</span>
                <span className="text-emerald-400 font-bold text-sm">{currentEvent.a_party}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-900 rounded-lg">
                <span className="text-slate-400">Called Party (B):</span>
                <span className="text-sky-400 font-bold text-sm">{currentEvent.b_party}</span>
              </div>
            </div>
          </div>

          <div className="p-6 bg-slate-950 border border-emerald-500/40 rounded-xl space-y-4 shadow-xl">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
              <MapPin className="w-4 h-4" />
              <span>Cell Site Serving Sector</span>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center p-3 bg-slate-900 rounded-lg">
                <span className="text-slate-400">Site Name:</span>
                <span className="text-white font-bold">{currentEvent.site_name}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-900 rounded-lg">
                <span className="text-slate-400">Cell ID:</span>
                <span className="text-amber-400 font-bold">{currentEvent.cell_id}</span>
              </div>
              <p className="text-[11px] text-slate-500 font-sans italic">
                {currentEvent.disclaimer}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center text-slate-500 bg-slate-900/40 border border-slate-800 rounded-xl">
          <Clock className="w-8 h-8 mx-auto mb-2 text-slate-600" />
          <p className="text-xs">No events loaded in replay sequence.</p>
        </div>
      )}
    </div>
  );
};

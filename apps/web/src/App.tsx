import React, { useState, useEffect } from 'react';
import { fetchCases, createCase, getCaseDetails, seedDemoCase } from './lib/api/client';
import { CaseItem, CaseDetail } from './types';
import { CaseDashboard } from './features/cases/CaseDashboard';
import { ImportStudio } from './features/ingestion/ImportStudio';
import { NetworkExplorer } from './features/network/NetworkExplorer';
import { TimelineMap } from './features/timeline/TimelineMap';
import { IPDRAnalysis } from './features/ipdr/IPDRAnalysis';
import { AICopilot } from './features/copilot/AICopilot';
import { EvidenceReports } from './features/reports/EvidenceReports';
import { InvestigationReplay } from './features/timeline/InvestigationReplay';

import {
  Shield,
  Layers,
  UploadCloud,
  Share2,
  MapPin,
  Globe,
  Bot,
  FileCheck,
  PlayCircle,
  ChevronDown,
  Database
} from 'lucide-react';

export const App: React.FC = () => {
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [caseDetail, setCaseDetail] = useState<CaseDetail | null>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    loadCases();
  }, []);

  useEffect(() => {
    if (activeCaseId) {
      loadCaseDetail(activeCaseId);
    } else {
      setCaseDetail(null);
    }
  }, [activeCaseId]);

  const loadCases = async () => {
    setLoading(true);
    try {
      const res = await fetchCases();
      if (res.status === 'success') {
        setCases(res.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadCaseDetail = async (id: string) => {
    try {
      const res = await getCaseDetails(id);
      if (res.status === 'success') {
        setCaseDetail(res.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectCase = (id: string) => {
    setActiveCaseId(id);
    setActiveTab('network');
  };

  const handleCreateCase = async (title: string, desc: string) => {
    try {
      const res = await createCase(title, desc);
      if (res.status === 'success') {
        await loadCases();
        setActiveCaseId(res.data.id);
        setActiveTab('ingestion');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSeedDemo = async () => {
    setLoading(true);
    try {
      const res = await seedDemoCase();
      if (res.status === 'success') {
        await loadCases();
        setActiveCaseId(res.data.case_id);
        setActiveTab('network');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Cases Console', icon: Layers },
    { id: 'ingestion', label: 'Import Studio', icon: UploadCloud, disabled: !activeCaseId },
    { id: 'network', label: 'Network Graph', icon: Share2, disabled: !activeCaseId },
    { id: 'timeline', label: 'Timeline & Map', icon: MapPin, disabled: !activeCaseId },
    { id: 'ipdr', label: 'IPDR & Devices', icon: Globe, disabled: !activeCaseId },
    { id: 'copilot', label: 'AI Copilot', icon: Bot, disabled: !activeCaseId },
    { id: 'reports', label: 'Evidence Reports', icon: FileCheck, disabled: !activeCaseId },
    { id: 'replay', label: 'Incident Replay', icon: PlayCircle, disabled: !activeCaseId },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#090d16] text-slate-100 font-sans">
      {/* Top Navigation Bar */}
      <header className="h-16 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-sky-500/20">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-wider text-white">TRACEPOINT</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 font-bold">
                  PS03
                </span>
              </div>
              <span className="text-[10px] text-slate-400 block -mt-0.5">Telecom Investigation Intelligence</span>
            </div>
          </div>

          {/* Active Case Selector Pill */}
          {activeCaseId && caseDetail && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs">
              <span className="text-slate-500">Case:</span>
              <span className="font-mono font-bold text-sky-400">{activeCaseId}</span>
              <span className="text-slate-400 truncate max-w-xs">{caseDetail.title}</span>
            </div>
          )}
        </div>

        {/* Right Header Status */}
        <div className="flex items-center gap-3">
          {activeCaseId && (
            <button
              onClick={() => setActiveTab('dashboard')}
              className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors"
            >
              Switch Case
            </button>
          )}
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Deterministic Engine Active</span>
          </div>
        </div>
      </header>

      {/* Workspace Body */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Sidebar Nav */}
        <aside className="w-full md:w-64 border-r border-slate-800/80 bg-slate-950/40 p-4 space-y-1.5 shrink-0">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-3 py-2">
            Workbench Navigation
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                disabled={item.disabled}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-sky-600 text-white shadow-lg shadow-sky-900/30 font-bold'
                    : item.disabled
                    ? 'text-slate-600 opacity-50 cursor-not-allowed'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/70'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}

          {activeCaseId && caseDetail && (
            <div className="pt-6 mt-6 border-t border-slate-800/60 px-3 space-y-2">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block">
                Case Records Loaded
              </span>
              <div className="text-xs font-mono text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>CDR Events:</span>
                  <span className="font-bold text-white">{caseDetail.summary.cdr_count}</span>
                </div>
                <div className="flex justify-between">
                  <span>IPDR Sessions:</span>
                  <span className="font-bold text-purple-400">{caseDetail.summary.ipdr_count}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cell Sites:</span>
                  <span className="font-bold text-emerald-400">{caseDetail.summary.tower_count}</span>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Content Pane */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
          {activeTab === 'dashboard' && (
            <CaseDashboard
              cases={cases}
              onSelectCase={handleSelectCase}
              onCreateCase={handleCreateCase}
              onSeedDemo={handleSeedDemo}
              loading={loading}
            />
          )}

          {activeTab === 'ingestion' && activeCaseId && (
            <ImportStudio
              caseId={activeCaseId}
              onRefreshCase={() => loadCaseDetail(activeCaseId)}
            />
          )}

          {activeTab === 'network' && activeCaseId && caseDetail && (
            <NetworkExplorer
              caseId={activeCaseId}
              suggestedSuspects={caseDetail.summary.suggested_suspects}
            />
          )}

          {activeTab === 'timeline' && activeCaseId && caseDetail && (
            <TimelineMap
              caseId={activeCaseId}
              suggestedSuspects={caseDetail.summary.suggested_suspects}
            />
          )}

          {activeTab === 'ipdr' && activeCaseId && (
            <IPDRAnalysis caseId={activeCaseId} />
          )}

          {activeTab === 'copilot' && activeCaseId && (
            <AICopilot caseId={activeCaseId} />
          )}

          {activeTab === 'reports' && activeCaseId && caseDetail && (
            <EvidenceReports caseDetail={caseDetail} />
          )}

          {activeTab === 'replay' && activeCaseId && (
            <InvestigationReplay caseId={activeCaseId} />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;

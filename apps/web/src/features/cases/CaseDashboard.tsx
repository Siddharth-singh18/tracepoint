import React, { useState } from 'react';
import { CaseItem } from '../../types';
import { Plus, Shield, Database, Radio, PlayCircle, Clock, ChevronRight } from 'lucide-react';

interface Props {
  cases: CaseItem[];
  onSelectCase: (caseId: string) => void;
  onCreateCase: (title: string, desc: string) => Promise<void>;
  onSeedDemo: () => Promise<void>;
  loading: boolean;
}

export const CaseDashboard: React.FC<Props> = ({
  cases,
  onSelectCase,
  onCreateCase,
  onSeedDemo,
  loading
}) => {
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    await onCreateCase(title, desc);
    setSubmitting(false);
    setShowModal(false);
    setTitle('');
    setDesc('');
  };

  const totalCDR = cases.reduce((acc, c) => acc + (c.cdr_count || 0), 0);
  const totalIPDR = cases.reduce((acc, c) => acc + (c.ipdr_count || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-slate-900/80 border border-slate-800 rounded-xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded">
              PS03 Standard
            </span>
            <span className="text-xs text-slate-400">Provenance-First Telecom Workspace</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Investigation Cases Console</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Ingest heterogeneous CDR/IPDR files, execute deterministic analytics, and query evidence-grounded AI Copilot.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onSeedDemo}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-medium rounded-lg shadow-lg shadow-emerald-900/30 transition-all border border-emerald-500/30"
          >
            <PlayCircle className="w-4 h-4" />
            <span>Load PS03 Demo Case</span>
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium rounded-lg shadow-lg shadow-sky-900/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Investigation</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs uppercase tracking-wider font-semibold">Active Cases</span>
            <Shield className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-white">{cases.length}</div>
          <div className="text-xs text-slate-500 mt-1">Multi-operator files supported</div>
        </div>
        <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs uppercase tracking-wider font-semibold">Total CDR Rows</span>
            <Database className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">{totalCDR.toLocaleString()}</div>
          <div className="text-xs text-slate-500 mt-1">Normalized canonical schema</div>
        </div>
        <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs uppercase tracking-wider font-semibold">IPDR Sessions</span>
            <Radio className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-purple-400">{totalIPDR.toLocaleString()}</div>
          <div className="text-xs text-slate-500 mt-1">NAT & Port correlation ready</div>
        </div>
        <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs uppercase tracking-wider font-semibold">Integrity Protocol</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-sm font-semibold text-amber-300">SHA-256 Chain</div>
          <div className="text-xs text-slate-500 mt-1">Every finding linked to row ID</div>
        </div>
      </div>

      {/* Cases List */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">Investigation Workspace Repository</h2>
          <span className="text-xs text-slate-400">{cases.length} investigations initialized</span>
        </div>
        <div className="divide-y divide-slate-800/60">
          {cases.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Database className="w-10 h-10 mx-auto mb-3 text-slate-600" />
              <p className="text-base font-medium text-slate-300">No active cases found</p>
              <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                Click "Load PS03 Demo Case" to immediately inspect synthetic CDR, IPDR, and cell tower datasets.
              </p>
            </div>
          ) : (
            cases.map((c) => (
              <div
                key={c.id}
                onClick={() => onSelectCase(c.id)}
                className="p-5 flex items-center justify-between hover:bg-slate-800/40 cursor-pointer transition-colors group"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono px-2 py-0.5 bg-slate-800 text-sky-400 rounded border border-slate-700">
                      {c.id}
                    </span>
                    <h3 className="text-base font-semibold text-white group-hover:text-sky-400 transition-colors">
                      {c.title}
                    </h3>
                    <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {c.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 max-w-2xl line-clamp-1">{c.description || 'No description provided.'}</p>
                  <div className="flex items-center gap-4 text-xs text-slate-500 pt-1 font-mono">
                    <span>Files: <strong className="text-slate-300">{c.file_count || 0}</strong></span>
                    <span>•</span>
                    <span>CDR: <strong className="text-slate-300">{c.cdr_count || 0}</strong></span>
                    <span>•</span>
                    <span>IPDR: <strong className="text-slate-300">{c.ipdr_count || 0}</strong></span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-sky-400 font-medium">
                  <span>Open Case</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Initialize New Investigation Case</h3>
            <p className="text-xs text-slate-400 mb-4">
              Create an isolated case workspace with strict evidence provenance and audit tracking.
            </p>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Case Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Operation DeepTrace - Cyber Syndicate"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Investigation Objective / Brief</label>
                <textarea
                  rows={3}
                  placeholder="Summary of targets, suspected phone numbers, incident timeframe..."
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg"
                >
                  {submitting ? 'Creating...' : 'Create Case Workspace'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { askCopilot } from '../../lib/api/client';
import { CopilotResponse } from '../../types';
import { Bot, Send, ShieldCheck, Sparkles, Terminal, FileText, ExternalLink, HelpCircle } from 'lucide-react';

interface Props {
  caseId: string;
}

export const AICopilot: React.FC<Props> = ({ caseId }) => {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string; data?: CopilotResponse }>>([
    {
      role: 'assistant',
      text: 'Hello Investigator. I am TRACEPOINT AI Copilot. I execute deterministic analytics tools on your ingested CDR/IPDR records and explain the findings with strict evidence citations and forensic boundary disclaimers.'
    }
  ]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeEvidenceModal, setActiveEvidenceModal] = useState<any | null>(null);

  const samplePrompts = [
    { label: "Common Contacts", prompt: "Find common contacts between 9000000001 and 9000000002" },
    { label: "Hindi / Hinglish", prompt: "9000000001 aur 9000000002 ke beech common numbers kaun se hain?" },
    { label: "Top Contacts", prompt: "Who are the top contacts for 9000000001?" },
    { label: "Device Switching", prompt: "Show device and IMEI SIM links for this case" },
    { label: "Tower Timeline", prompt: "Show cell tower locations for 9000000001" },
    { label: "IPDR Attribution", prompt: "Search IPDR sessions for IP 103.21.144.12" }
  ];

  const handleSend = async (textToSend?: string) => {
    const q = textToSend || query;
    if (!q.trim() || loading) return;

    setMessages(prev => [...prev, { role: 'user', text: q }]);
    setQuery('');
    setLoading(true);

    try {
      const res = await askCopilot(caseId, q);
      if (res.status === 'success') {
        setMessages(prev => [
          ...prev,
          { role: 'assistant', text: res.data.answer, data: res.data }
        ]);
      } else {
        setMessages(prev => [
          ...prev,
          { role: 'assistant', text: `Error: ${res.detail || 'Could not process query.'}` }
        ]);
      }
    } catch (e: any) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', text: `Communication failure: ${e.message}` }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 text-xs font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded">
              Architecture: Deterministic Backend Tool Routing
            </span>
            <span className="text-xs text-slate-400">Zero-Hallucination Evidence Guarantee</span>
          </div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Bot className="w-5 h-5 text-sky-400" />
            AI Investigation Copilot
          </h2>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Every statement backed by source row & record ID</span>
        </div>
      </div>

      {/* Suggested Prompt Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-xs font-semibold text-slate-500 shrink-0 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-sky-400" /> Quick Queries:
        </span>
        {samplePrompts.map((p, i) => (
          <button
            key={i}
            onClick={() => handleSend(p.prompt)}
            disabled={loading}
            className="px-3 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-sky-500/40 rounded-full text-xs text-slate-300 hover:text-white whitespace-nowrap transition-colors"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Chat Messages Log */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 min-h-[460px] max-h-[560px] overflow-y-auto space-y-4">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex gap-3 text-xs ${
              m.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {m.role === 'assistant' && (
              <div className="w-7 h-7 rounded-lg bg-sky-600/20 border border-sky-500/30 flex items-center justify-center shrink-0 text-sky-400">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`max-w-2xl rounded-xl p-4 space-y-3 ${
                m.role === 'user'
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-900/90 border border-slate-800 text-slate-200 shadow-lg'
              }`}
            >
              <div className="text-sm font-sans leading-relaxed">{m.text}</div>

              {/* Tool Execution Badge */}
              {m.data?.tool_invocations && m.data.tool_invocations.length > 0 && (
                <div className="p-2 bg-slate-950 border border-slate-800 rounded-lg flex items-center gap-2 font-mono text-[11px] text-cyan-300">
                  <Terminal className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Executed Tool: <strong>{m.data.tool_invocations[0].tool}</strong></span>
                  <span className="text-slate-500">({m.data.tool_invocations[0].result_summary})</span>
                </div>
              )}

              {/* Structured Findings & Evidence Citations */}
              {m.data?.findings && m.data.findings.length > 0 && (
                <div className="space-y-2 pt-1 border-t border-slate-800/80">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    Discovered Evidence Findings & Source Provenance:
                  </span>
                  {m.data.findings.map((f, fi) => (
                    <div key={fi} className="p-3 bg-slate-950/80 border border-slate-800/80 rounded-lg space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-emerald-400 font-mono">{f.type}: {f.entity}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 font-mono">
                          {f.evidence?.length || 0} Source Records
                        </span>
                      </div>

                      {/* Evidence Citations Badges */}
                      {f.evidence && f.evidence.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {f.evidence.map((ev) => (
                            <button
                              key={ev.id}
                              onClick={() => setActiveEvidenceModal(ev)}
                              className="px-2 py-0.5 bg-sky-950/60 hover:bg-sky-900/80 border border-sky-500/30 text-sky-300 rounded text-[10px] font-mono flex items-center gap-1 transition-colors"
                            >
                              <FileText className="w-2.5 h-2.5" />
                              <span>[{ev.id}] Row #{ev.source_row}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Technical Limitation Notice */}
                      {f.limitations && f.limitations.length > 0 && (
                        <div className="text-[10px] text-slate-500 italic pt-1 border-t border-slate-900">
                          <strong>Forensic Note:</strong> {f.limitations[0]}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 text-xs justify-start items-center text-slate-400">
            <div className="w-7 h-7 rounded-lg bg-sky-600/20 border border-sky-500/30 flex items-center justify-center text-sky-400 animate-pulse">
              <Bot className="w-4 h-4" />
            </div>
            <span>Validating case authorization and executing deterministic tools...</span>
          </div>
        )}
      </div>

      {/* Query Input Bar */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Ask an investigative question (e.g. Find common contacts, top callers, or Hindi 'common numbers batao')..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          className="flex-1 px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500 shadow-inner"
        />
        <button
          onClick={() => handleSend()}
          disabled={!query.trim() || loading}
          className="px-5 py-3 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold rounded-xl text-xs flex items-center gap-2 shadow-lg transition-all"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Ask Copilot</span>
        </button>
      </div>

      {/* Evidence Provenance Modal */}
      {activeEvidenceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-sky-400" />
                Evidence Citation Details [{activeEvidenceModal.id}]
              </h3>
              <button
                onClick={() => setActiveEvidenceModal(null)}
                className="text-xs text-slate-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between p-2 bg-slate-950 rounded">
                <span className="text-slate-500">Record ID:</span>
                <span className="text-white font-bold">{activeEvidenceModal.record_id}</span>
              </div>
              <div className="flex justify-between p-2 bg-slate-950 rounded">
                <span className="text-slate-500">Source File:</span>
                <span className="text-sky-300">{activeEvidenceModal.source_file_id}</span>
              </div>
              <div className="flex justify-between p-2 bg-slate-950 rounded">
                <span className="text-slate-500">Raw File Line / Row:</span>
                <span className="text-emerald-400 font-bold">Line #{activeEvidenceModal.source_row}</span>
              </div>
              <div className="flex justify-between p-2 bg-slate-950 rounded">
                <span className="text-slate-500">Timestamp:</span>
                <span className="text-slate-300">{activeEvidenceModal.timestamp || 'N/A'}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
              This citation directly maps to the original uploaded file line. The checksum and row pointer verify chain-of-custody for human audit.
            </p>

            <button
              onClick={() => setActiveEvidenceModal(null)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg"
            >
              Close Citation
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

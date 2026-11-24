import React, { useState, useEffect, useRef } from 'react';
import { getGraphData, getCommonContacts } from '../../lib/api/client';
import { GraphNode, GraphEdge, CommonContact } from '../../types';
import { Network, Users, ZoomIn, ZoomOut, Filter, Info, PhoneCall } from 'lucide-react';

interface Props {
  caseId: string;
  suggestedSuspects: string[];
}

export const NetworkExplorer: React.FC<Props> = ({ caseId, suggestedSuspects }) => {
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; edges: GraphEdge[] }>({ nodes: [], edges: [] });
  const [selectedSuspects, setSelectedSuspects] = useState<string[]>(
    suggestedSuspects.slice(0, 2)
  );
  const [commonContacts, setCommonContacts] = useState<CommonContact[]>([]);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<GraphEdge | null>(null);
  const [loading, setLoading] = useState(false);
  const [minCalls, setMinCalls] = useState(1);
  const [zoom, setZoom] = useState(1);

  // Fetch graph & common contacts
  useEffect(() => {
    loadGraph();
  }, [caseId, minCalls]);

  useEffect(() => {
    if (selectedSuspects.length >= 2) {
      loadCommon();
    } else {
      setCommonContacts([]);
    }
  }, [selectedSuspects, caseId]);

  const loadGraph = async () => {
    setLoading(true);
    try {
      const res = await getGraphData(caseId, selectedSuspects.length > 0 ? selectedSuspects : undefined);
      if (res.status === 'success') {
        setGraphData(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadCommon = async () => {
    try {
      const res = await getCommonContacts(caseId, selectedSuspects);
      if (res.status === 'success') {
        setCommonContacts(res.data.common_contacts || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleSuspect = (num: string) => {
    setSelectedSuspects(prev =>
      prev.includes(num) ? prev.filter(x => x !== num) : [...prev, num]
    );
  };

  const commonNumbersSet = new Set(commonContacts.map(c => c.number));

  // Visual layout calculation for nodes
  const width = 800;
  const height = 550;
  const centerX = width / 2;
  const centerY = height / 2;

  const nodePositions: Record<string, { x: number; y: number }> = {};
  const totalNodes = graphData.nodes.length;

  graphData.nodes.forEach((node, i) => {
    const isSuspect = selectedSuspects.includes(node.id);
    const isCommon = commonNumbersSet.has(node.id);

    if (isSuspect) {
      // Place suspects left & right
      const suspectIdx = selectedSuspects.indexOf(node.id);
      const angle = (suspectIdx / Math.max(1, selectedSuspects.length)) * Math.PI * 2;
      nodePositions[node.id] = {
        x: centerX + Math.cos(angle) * 220,
        y: centerY + Math.sin(angle) * 160
      };
    } else if (isCommon) {
      // Place common contacts in the center cluster
      const commIdx = Array.from(commonNumbersSet).indexOf(node.id);
      nodePositions[node.id] = {
        x: centerX + (commIdx % 2 === 0 ? -40 : 40),
        y: centerY - 40 + commIdx * 50
      };
    } else {
      // Circle exterior
      const angle = (i / Math.max(1, totalNodes)) * Math.PI * 2;
      const radius = 260 + (i % 3) * 25;
      nodePositions[node.id] = {
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * (radius * 0.75)
      };
    }
  });

  return (
    <div className="space-y-6">
      {/* Header & Suspect Filter */}
      <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 text-xs font-mono bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded">
              Graph Engine: NetworkX DiGraph
            </span>
            <span className="text-xs text-slate-400">Cross-Suspect Intersection & Centrality</span>
          </div>
          <h2 className="text-xl font-bold text-white">Telecom Contact Graph & Link Analysis</h2>
        </div>

        {/* Suspect Selector Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
            <Users className="w-3.5 h-3.5" /> Target Suspects:
          </span>
          {suggestedSuspects.map(num => {
            const isSelected = selectedSuspects.includes(num);
            return (
              <button
                key={num}
                onClick={() => toggleSuspect(num)}
                className={`px-2.5 py-1 text-xs font-mono font-medium rounded-lg transition-all border ${
                  isSelected
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm shadow-rose-900/20'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                {num}
              </button>
            );
          })}
        </div>
      </div>

      {/* Caution Banner (Blueprint Section 14.4) */}
      <div className="p-3.5 bg-amber-950/20 border border-amber-500/20 rounded-xl flex items-center gap-3 text-xs text-amber-300">
        <Info className="w-4 h-4 shrink-0 text-amber-400" />
        <span>
          <strong>Investigative Caution:</strong> Network degree, betweenness centrality, and graph clusters represent structural communication traffic in uploaded files, not guilt or criminal conspiracy.
        </span>
      </div>

      {/* Main Graph Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Graph Canvas */}
        <div className="lg:col-span-3 bg-slate-950 border border-slate-800 rounded-xl relative overflow-hidden flex flex-col items-center justify-center min-h-[580px]">
          {/* Zoom Controls */}
          <div className="absolute top-4 right-4 z-10 flex items-center gap-1 bg-slate-900/90 border border-slate-800 rounded-lg p-1">
            <button
              onClick={() => setZoom(z => Math.min(z + 0.15, 1.8))}
              className="p-1.5 hover:bg-slate-800 rounded text-slate-300"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoom(1)}
              className="px-2 py-1 text-[11px] font-mono text-slate-400 hover:text-white"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              onClick={() => setZoom(z => Math.max(z - 0.15, 0.5))}
              className="p-1.5 hover:bg-slate-800 rounded text-slate-300"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
          </div>

          {/* Legend */}
          <div className="absolute top-4 left-4 z-10 flex items-center gap-3 text-[11px] bg-slate-900/90 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-300">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-500 border border-rose-300 block"></span>
              Primary Suspect
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500 border border-emerald-300 block"></span>
              Shared Common Contact
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-600 block"></span>
              Counterpart
            </span>
          </div>

          {/* SVG Graph Visualization */}
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-full cursor-grab active:cursor-grabbing transition-transform"
            style={{ transform: `scale(${zoom})` }}
          >
            <defs>
              <marker
                id="arrowhead"
                markerWidth="8"
                markerHeight="6"
                refX="18"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 8 3, 0 6" fill="#38bdf8" />
              </marker>
            </defs>

            {/* Edges */}
            {graphData.edges.map((edge) => {
              const src = nodePositions[edge.source];
              const tgt = nodePositions[edge.target];
              if (!src || !tgt) return null;

              const isHighlighted =
                selectedSuspects.includes(edge.source) ||
                selectedSuspects.includes(edge.target) ||
                commonNumbersSet.has(edge.source) ||
                commonNumbersSet.has(edge.target);

              return (
                <g key={edge.id} onClick={() => { setSelectedEdge(edge); setSelectedNode(null); }}>
                  <line
                    x1={src.x}
                    y1={src.y}
                    x2={tgt.x}
                    y2={tgt.y}
                    stroke={isHighlighted ? '#0ea5e9' : '#334155'}
                    strokeWidth={Math.min(1 + edge.call_count * 0.8, 5)}
                    strokeOpacity={isHighlighted ? 0.9 : 0.4}
                    markerEnd="url(#arrowhead)"
                    className="hover:stroke-cyan-400 cursor-pointer"
                  />
                </g>
              );
            })}

            {/* Nodes */}
            {graphData.nodes.map((node) => {
              const pos = nodePositions[node.id];
              if (!pos) return null;

              const isSuspect = selectedSuspects.includes(node.id);
              const isCommon = commonNumbersSet.has(node.id);
              const isSelected = selectedNode?.id === node.id;

              let fillColor = '#0284c7';
              let strokeColor = '#38bdf8';
              let radius = 16;

              if (isSuspect) {
                fillColor = '#e11d48';
                strokeColor = '#fda4af';
                radius = 22;
              } else if (isCommon) {
                fillColor = '#059669';
                strokeColor = '#6ee7b7';
                radius = 20;
              }

              return (
                <g
                  key={node.id}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  className="cursor-pointer group"
                  onClick={() => { setSelectedNode(node); setSelectedEdge(null); }}
                >
                  <circle
                    r={radius}
                    fill={fillColor}
                    stroke={isSelected ? '#ffffff' : strokeColor}
                    strokeWidth={isSelected ? 3 : 1.5}
                    className="transition-transform group-hover:scale-110"
                  />
                  <text
                    y={radius + 12}
                    textAnchor="middle"
                    fill="#f1f5f9"
                    fontSize="9.5"
                    fontFamily="monospace"
                    fontWeight={isSuspect || isCommon ? 'bold' : 'normal'}
                  >
                    {node.label}
                  </text>
                  <text
                    y={3}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="9"
                    fontWeight="bold"
                  >
                    {node.degree}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Drilldown Panel */}
        <div className="lg:col-span-1 space-y-4">
          {/* Common Contacts List */}
          <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center justify-between">
              <span>Shared Intersection</span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px]">
                {commonContacts.length} Found
              </span>
            </h3>

            {commonContacts.length === 0 ? (
              <p className="text-xs text-slate-500">
                Select 2 or more suspects above to compute set intersection.
              </p>
            ) : (
              <div className="space-y-2">
                {commonContacts.map(c => (
                  <div
                    key={c.number}
                    className="p-2.5 bg-slate-950 border border-emerald-500/20 rounded-lg space-y-1"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-bold text-white">{c.number}</span>
                      <span className="text-[10px] text-emerald-400 font-semibold">
                        {c.total_shared_events} events
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 space-y-0.5">
                      {Object.entries(c.counts_by_suspect).map(([s, count]) => (
                        <div key={s} className="flex justify-between">
                          <span className="font-mono text-slate-500">{s}:</span>
                          <span className="font-semibold text-slate-300">{count} calls</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Node / Edge Details Panel */}
          {selectedNode && (
            <div className="p-4 bg-slate-900/90 border border-sky-500/30 rounded-xl space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-sky-400">Node Properties</h4>
              <div className="font-mono text-sm font-bold text-white">{selectedNode.label}</div>
              <div className="space-y-1 text-xs text-slate-300 pt-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Degree:</span>
                  <span className="font-mono font-bold">{selectedNode.degree}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">In / Out Degree:</span>
                  <span className="font-mono">{selectedNode.in_degree} in / {selectedNode.out_degree} out</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Betweenness:</span>
                  <span className="font-mono">{selectedNode.betweenness_centrality}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Cluster Community:</span>
                  <span className="font-mono">#{selectedNode.community_id}</span>
                </div>
              </div>
            </div>
          )}

          {selectedEdge && (
            <div className="p-4 bg-slate-900/90 border border-sky-500/30 rounded-xl space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-sky-400">Call Link Properties</h4>
              <div className="font-mono text-xs font-bold text-white">
                {selectedEdge.source} ➔ {selectedEdge.target}
              </div>
              <div className="space-y-1 text-xs text-slate-300 pt-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Call Count:</span>
                  <span className="font-mono font-bold text-emerald-400">{selectedEdge.call_count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Duration:</span>
                  <span className="font-mono">{selectedEdge.total_duration}s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Linked Records:</span>
                  <span className="font-mono text-sky-300">{selectedEdge.record_ids.length} records</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

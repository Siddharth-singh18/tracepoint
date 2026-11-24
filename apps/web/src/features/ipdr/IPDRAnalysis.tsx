import React, { useState, useEffect } from 'react';
import { correlateIPDR, getDeviceLinks } from '../../lib/api/client';
import { IPDRSession, DeviceLink } from '../../types';
import { Globe, Smartphone, ShieldAlert, Cpu, HardDrive } from 'lucide-react';

interface Props {
  caseId: string;
}

export const IPDRAnalysis: React.FC<Props> = ({ caseId }) => {
  const [activeTab, setActiveTab] = useState<'ipdr' | 'devices'>('ipdr');
  const [ipdrSessions, setIpdrSessions] = useState<IPDRSession[]>([]);
  const [deviceLinks, setDeviceLinks] = useState<{ shared_devices: DeviceLink[]; handset_changes: any[] }>({
    shared_devices: [],
    handset_changes: []
  });
  const [loading, setLoading] = useState(false);
  const [searchTarget, setSearchTarget] = useState('');

  useEffect(() => {
    loadData();
  }, [caseId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ipRes, devRes] = await Promise.all([
        correlateIPDR(caseId),
        getDeviceLinks(caseId)
      ]);
      if (ipRes.status === 'success') {
        setIpdrSessions(ipRes.data.sessions || []);
      }
      if (devRes.status === 'success') {
        setDeviceLinks({
          shared_devices: devRes.data.shared_devices || [],
          handset_changes: devRes.data.handset_changes || []
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await correlateIPDR(caseId, searchTarget || undefined);
      if (res.status === 'success') {
        setIpdrSessions(res.data.sessions || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 text-xs font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded">
              Module: IPDR & Device-SIM Associations
            </span>
            <span className="text-xs text-slate-400">Layer-3 / Hardware Provenance</span>
          </div>
          <h2 className="text-xl font-bold text-white">Internet Sessions & Handset Linkages</h2>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 border border-slate-800 rounded-lg">
          <button
            onClick={() => setActiveTab('ipdr')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
              activeTab === 'ipdr'
                ? 'bg-sky-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>IPDR Sessions ({ipdrSessions.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('devices')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
              activeTab === 'devices'
                ? 'bg-sky-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Device / SIM Links ({deviceLinks.shared_devices.length})</span>
          </button>
        </div>
      </div>

      {activeTab === 'ipdr' ? (
        <div className="space-y-4">
          {/* IPDR Disclaimer */}
          <div className="p-3.5 bg-amber-950/20 border border-amber-500/20 rounded-xl flex items-center gap-3 text-xs text-amber-300">
            <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />
            <span>
              <strong>Crucial Forensic Boundary:</strong> A public IP is not a person. Shared NAT, dynamic Carrier-Grade NAT (CGNAT), and missing source ports make attribution ambiguous without ISP session correlation.
            </span>
          </div>

          {/* Search Filter */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              placeholder="Filter by IP address or Subscriber Ref (e.g. 103.21.144.12, SUB-9000000001)..."
              value={searchTarget}
              onChange={(e) => setSearchTarget(e.target.value)}
              className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-sky-500"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg"
            >
              Search Sessions
            </button>
          </form>

          {/* IPDR Session Table */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3">Subscriber Ref</th>
                    <th className="p-3">Public IP</th>
                    <th className="p-3">Src Port</th>
                    <th className="p-3">Dest IP : Port</th>
                    <th className="p-3">Session Start</th>
                    <th className="p-3">Bytes (In / Out)</th>
                    <th className="p-3">Match Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {ipdrSessions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        No IPDR records found in this case.
                      </td>
                    </tr>
                  ) : (
                    ipdrSessions.map((s) => (
                      <tr key={s.record_id} className="hover:bg-slate-800/40">
                        <td className="p-3 font-semibold text-white">{s.subscriber_ref || 'UNMAPPED'}</td>
                        <td className="p-3 text-sky-400">{s.public_ip}</td>
                        <td className="p-3 text-slate-400">{s.source_port || 'N/A'}</td>
                        <td className="p-3 text-slate-400">{s.destination_ip}:{s.destination_port}</td>
                        <td className="p-3 text-slate-400">{s.start_time.replace('T', ' ').substring(0, 19)}</td>
                        <td className="p-3 text-slate-300">{s.bytes_in.toLocaleString()} / {s.bytes_out.toLocaleString()}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            s.match_status === 'EXACT_SUBSCRIBER'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {s.match_status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Device / SIM Links */}
          <div className="p-3.5 bg-sky-950/20 border border-sky-500/20 rounded-xl text-xs text-sky-300">
            <strong>Observed Hardware Links:</strong> Analysis detects cases where one physical device (IMEI) was used across multiple subscriptions (SIM/IMSI/MSISDN) or where a suspect switched handsets.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Shared Devices Box */}
            <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-xl space-y-4">
              <div className="flex items-center gap-2 text-rose-400 font-semibold text-sm">
                <Cpu className="w-4 h-4" />
                <span>Devices Observed with Multiple Numbers / SIMs</span>
              </div>

              {deviceLinks.shared_devices.length === 0 ? (
                <p className="text-xs text-slate-500">No shared device anomalies detected.</p>
              ) : (
                deviceLinks.shared_devices.map((d) => (
                  <div key={d.imei} className="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-2 font-mono text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Hardware IMEI:</span>
                      <span className="text-rose-400 font-bold">{d.imei}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Associated MSISDNs:</span>
                      <span className="text-emerald-400 font-bold">{d.associated_numbers.join(', ')}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Associated IMSIs:</span>
                      <span className="text-slate-300">{d.associated_imsis.join(', ') || 'N/A'}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 pt-1 font-sans italic border-t border-slate-800/60">
                      {d.note}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Handset Changes Box */}
            <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-xl space-y-4">
              <div className="flex items-center gap-2 text-sky-400 font-semibold text-sm">
                <HardDrive className="w-4 h-4" />
                <span>Subscribers Observed Across Multiple Devices</span>
              </div>

              {deviceLinks.handset_changes.length === 0 ? (
                <p className="text-xs text-slate-500">No handset swapping patterns observed.</p>
              ) : (
                deviceLinks.handset_changes.map((h: any) => (
                  <div key={h.number} className="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-2 font-mono text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Target Number:</span>
                      <span className="text-sky-400 font-bold">{h.number}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Observed IMEIs:</span>
                      <span className="text-amber-400 font-bold">{h.associated_imeis.join(', ')}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 pt-1 font-sans italic border-t border-slate-800/60">
                      {h.note}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

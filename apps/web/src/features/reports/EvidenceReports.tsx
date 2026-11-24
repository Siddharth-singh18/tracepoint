import React, { useState } from 'react';
import { generateReport } from '../../lib/api/client';
import { CaseDetail } from '../../types';
import { FileDown, FileSpreadsheet, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';

interface Props {
  caseDetail: CaseDetail;
}

export const EvidenceReports: React.FC<Props> = ({ caseDetail }) => {
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [loadingExcel, setLoadingExcel] = useState(false);
  const [lastDownloadUrl, setLastDownloadUrl] = useState<string | null>(null);

  const handleGeneratePdf = async () => {
    setLoadingPdf(true);
    try {
      const res = await generateReport(caseDetail.id, 'pdf');
      if (res.status === 'success' && res.data.download_url) {
        setLastDownloadUrl(res.data.download_url);
        window.open(res.data.download_url, '_blank');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPdf(false);
    }
  };

  const handleGenerateExcel = async () => {
    setLoadingExcel(true);
    try {
      const res = await generateReport(caseDetail.id, 'excel');
      if (res.status === 'success' && res.data.download_url) {
        setLastDownloadUrl(res.data.download_url);
        window.open(res.data.download_url, '_blank');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingExcel(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
              Module: Evidence Dossier & Reports
            </span>
            <span className="text-xs text-slate-400">Court-Admissible Provenance Standard</span>
          </div>
          <h2 className="text-xl font-bold text-white">Investigation Evidence & Export Center</h2>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleGenerateExcel}
            disabled={loadingExcel}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 text-xs font-semibold rounded-lg border border-slate-700 shadow flex items-center gap-2 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{loadingExcel ? 'Building XLSX...' : 'Export Excel Dossier'}</span>
          </button>
          <button
            onClick={handleGeneratePdf}
            disabled={loadingPdf}
            className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-sky-900/30 flex items-center gap-2 transition-all"
          >
            <FileDown className="w-4 h-4" />
            <span>{loadingPdf ? 'Generating PDF...' : 'Download Intelligence PDF'}</span>
          </button>
        </div>
      </div>

      {/* Case Provenance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Source Files Inventory & Cryptographic Hashes
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-2.5">Filename</th>
                  <th className="p-2.5">Type</th>
                  <th className="p-2.5">Status</th>
                  <th className="p-2.5">SHA-256 Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {caseDetail.files.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-800/40">
                    <td className="p-2.5 font-semibold text-white">{f.filename}</td>
                    <td className="p-2.5 text-sky-400">{f.file_type}</td>
                    <td className="p-2.5">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                        {f.import_status}
                      </span>
                    </td>
                    <td className="p-2.5 text-slate-400 font-mono text-[11px]">
                      {f.checksum ? f.checksum.substring(0, 16) + '...' : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Legal & Forensic Safeguards Box */}
        <div className="md:col-span-1 bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4" /> Mandatory Report Safeguards
          </h3>
          <div className="text-xs text-slate-400 space-y-2 leading-relaxed">
            <p>
              • <strong>Serving Cell Only:</strong> Reports state antenna sector association at event timestamp; never claim exact GPS coordinates.
            </p>
            <p>
              • <strong>Public IP Caveat:</strong> Emphasizes NAT dynamic allocation; requires port translation confirmation before attributing to a subscriber.
            </p>
            <p>
              • <strong>Human Authority:</strong> ReportLab generated PDF explicitly requires officer signature and verification.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { uploadFile, triggerIngest } from '../../lib/api/client';
import { UploadCloud, CheckCircle2, AlertTriangle, XCircle, FileText, ArrowRight } from 'lucide-react';

interface Props {
  caseId: string;
  onRefreshCase: () => void;
}

export const ImportStudio: React.FC<Props> = ({ caseId, onRefreshCase }) => {
  const [file, setFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState('CDR');
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [ingestReport, setIngestReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setUploadResult(null);
      setIngestReport(null);
      setError(null);
    }
  };

  const handleUploadAndPreview = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const res = await uploadFile(caseId, file, fileType);
      if (res.status === 'success') {
        setUploadResult(res.data);
      } else {
        setError(res.detail || 'Upload failed');
      }
    } catch (err: any) {
      setError(err.message || 'File upload network error');
    } finally {
      setLoading(false);
    }
  };

  const handleRunIngest = async () => {
    if (!uploadResult?.file_id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await triggerIngest(uploadResult.file_id);
      if (res.status === 'success') {
        setIngestReport(res.data);
        onRefreshCase();
      } else {
        setError(res.detail || 'Ingestion failed');
      }
    } catch (err: any) {
      setError(err.message || 'Ingestion execution error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Studio Banner */}
      <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-xl">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2 py-0.5 text-xs font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded">
            Module: Data Import Studio
          </span>
          <span className="text-xs text-slate-400">Heterogeneous Format Normalization</span>
        </div>
        <h2 className="text-xl font-bold text-white">Import & Schema Validation Engine</h2>
        <p className="text-xs text-slate-400 mt-1 max-w-2xl">
          Automated operator template detection, SHA-256 evidence hashing, timestamp timezone parsing, and row-level quality validation.
        </p>
      </div>

      {/* Upload Box */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 p-6 bg-slate-900/80 border border-slate-800 rounded-xl space-y-4">
          <h3 className="text-sm font-semibold text-white">1. Select Telecom File</h3>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Record Type</label>
            <select
              value={fileType}
              onChange={(e) => setFileType(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            >
              <option value="CDR">CDR (Call Detail Records - Voice/SMS)</option>
              <option value="IPDR">IPDR (Internet Protocol Detail Records)</option>
              <option value="TOWER">Tower Site Coordinates / Metadata</option>
            </select>
          </div>

          <div className="border-2 border-dashed border-slate-700 hover:border-sky-500/50 rounded-xl p-6 text-center cursor-pointer transition-colors bg-slate-950/40">
            <input
              type="file"
              accept=".csv,.xlsx,.xls,.txt"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload-input"
            />
            <label htmlFor="file-upload-input" className="cursor-pointer block">
              <UploadCloud className="w-8 h-8 text-sky-400 mx-auto mb-2" />
              <span className="text-xs font-semibold text-slate-200 block">
                {file ? file.name : 'Choose CSV or XLSX file'}
              </span>
              <span className="text-[11px] text-slate-500 block mt-1">
                Supports Operator A, Operator B, IPDR, and Towers
              </span>
            </label>
          </div>

          <button
            onClick={handleUploadAndPreview}
            disabled={!file || loading}
            className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-md transition-all flex items-center justify-center gap-2"
          >
            {loading ? 'Processing Preview...' : 'Upload & Inspect Schema'}
          </button>

          {error && (
            <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-lg text-xs text-red-300">
              {error}
            </div>
          )}
        </div>

        {/* Preview & Detected Template */}
        <div className="lg:col-span-2 space-y-4">
          {uploadResult ? (
            <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    File Integrity & Schema Detection
                  </h3>
                  <p className="text-xs font-mono text-slate-400 mt-0.5">
                    SHA-256: {uploadResult.checksum}
                  </p>
                </div>
                <button
                  onClick={handleRunIngest}
                  disabled={loading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow flex items-center gap-1.5 transition-all"
                >
                  <span>Validate & Ingest File</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Detected Template Card */}
              <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-lg flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-500 uppercase tracking-wider block">Detected Operator Template</span>
                  <span className="text-xs font-bold text-sky-400">
                    {uploadResult.preview?.detected_template?.name || 'Custom Column Mapping Required'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-500 uppercase tracking-wider block">Timezone</span>
                  <span className="text-xs font-mono text-slate-300">Asia/Kolkata (+05:30)</span>
                </div>
              </div>

              {/* Sample Rows Preview */}
              <div>
                <h4 className="text-xs font-semibold text-slate-300 mb-2">Raw File Header & Preview (Top 5 Rows)</h4>
                <div className="overflow-x-auto border border-slate-800 rounded-lg bg-slate-950">
                  <table className="w-full text-left text-[11px] font-mono">
                    <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                      <tr>
                        {uploadResult.preview?.headers?.slice(0, 7).map((h: string) => (
                          <th key={h} className="p-2 font-semibold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      {uploadResult.preview?.sample_rows?.slice(0, 5).map((row: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-900/50">
                          {uploadResult.preview?.headers?.slice(0, 7).map((h: string) => (
                            <td key={h} className="p-2 whitespace-nowrap">{String(row[h] || '')}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 bg-slate-900/40 border border-slate-800 rounded-xl text-center text-slate-500">
              <FileText className="w-8 h-8 mx-auto mb-2 text-slate-600" />
              <p className="text-xs">Select and upload a telecom file to inspect schema preview.</p>
            </div>
          )}

          {/* Ingestion Report ReportLab/Schema Results */}
          {ingestReport && (
            <div className="p-6 bg-slate-900/90 border border-emerald-500/30 rounded-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Import Validation Report ({ingestReport.run_id})
                </h3>
                <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
                  COMPLETED
                </span>
              </div>

              {/* Status Counters */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-lg text-center">
                  <span className="text-[10px] text-emerald-400 uppercase tracking-wider block font-semibold">Accepted Records</span>
                  <span className="text-xl font-bold text-emerald-400">{ingestReport.accepted_count}</span>
                </div>
                <div className="p-3 bg-rose-950/20 border border-rose-500/20 rounded-lg text-center">
                  <span className="text-[10px] text-rose-400 uppercase tracking-wider block font-semibold">Rejected Rows</span>
                  <span className="text-xl font-bold text-rose-400">{ingestReport.rejected_count}</span>
                </div>
                <div className="p-3 bg-amber-950/20 border border-amber-500/20 rounded-lg text-center">
                  <span className="text-[10px] text-amber-400 uppercase tracking-wider block font-semibold">Warnings</span>
                  <span className="text-xl font-bold text-amber-400">{ingestReport.warning_count}</span>
                </div>
              </div>

              {/* Rejected Rows Breakdown */}
              {ingestReport.report?.rejected_details?.length > 0 && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-rose-400">
                    <XCircle className="w-4 h-4" />
                    <span>Rejected Row Audit Trail (Never Silently Discarded):</span>
                  </div>
                  <div className="overflow-x-auto border border-rose-900/40 rounded-lg bg-slate-950 max-h-48 overflow-y-auto">
                    <table className="w-full text-left text-[11px] font-mono">
                      <thead className="bg-rose-950/40 text-rose-300 border-b border-rose-900/40">
                        <tr>
                          <th className="p-2">Row #</th>
                          <th className="p-2">Reason Code</th>
                          <th className="p-2">Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-rose-950/20 text-slate-300">
                        {ingestReport.report.rejected_details.map((rej: any, i: number) => (
                          <tr key={i} className="hover:bg-rose-950/10">
                            <td className="p-2 font-bold text-rose-400">#{rej.row}</td>
                            <td className="p-2 font-bold text-amber-400">{rej.reason_code}</td>
                            <td className="p-2 text-slate-400">{rej.details}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

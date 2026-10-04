import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  FileSpreadsheet,
  FileCode,
  CheckCircle2,
  XCircle,
  Percent,
  Layers,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { MetricsSummary } from '../types';
import { MetricCard } from '../components/MetricCard';
import { formatPercent } from '../utils/format';

interface ReportsPageProps {
  metrics: MetricsSummary | null;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({ metrics }) => {
  const [reportSummary, setReportSummary] = useState<any>(null);

  useEffect(() => {
    apiClient.getReportSummary()
      .then(setReportSummary)
      .catch((err) => console.error('Failed loading report summary:', err));
  }, []);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Panel */}
      <div className="white-panel p-6 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-sky-600" />
            <h2 className="text-lg font-black text-slate-900 uppercase tracking-wider">
              Validation Reports & Data Export
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Generate, inspect, and export comprehensive JSON and formatted Excel (.xlsx) test reports.
          </p>
        </div>

        {/* Download Action Triggers */}
        <div className="flex items-center space-x-3">
          <a
            href={apiClient.getExcelReportUrl()}
            download
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs tracking-wider uppercase flex items-center space-x-2 transition-all shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 fill-white" />
            <span>Download Excel Report (.xlsx)</span>
          </a>

          <a
            href={apiClient.getJsonReportUrl()}
            download
            className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-black text-xs tracking-wider uppercase flex items-center space-x-2 transition-all shadow-sm"
          >
            <FileCode className="w-4 h-4 fill-white" />
            <span>Download JSON Report</span>
          </a>
        </div>
      </div>

      {/* Summary KPI Cards */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <MetricCard
            title="Total Pairs Evaluated"
            value={metrics.processed_pairs}
            subtitle={`Out of ${metrics.total_pairs} pairs`}
            icon={<Layers className="w-4 h-4 text-sky-600" />}
            variant="cyan"
          />
          <MetricCard
            title="PASS Rate"
            value={formatPercent(metrics.pass_rate)}
            subtitle={`${metrics.pass_count} Passed / ${metrics.fail_count} Failed`}
            icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
            variant="emerald"
          />
          <MetricCard
            title="Mean Similarity"
            value={formatPercent(metrics.average_similarity)}
            subtitle="Overall dataset average"
            icon={<Percent className="w-4 h-4 text-sky-600" />}
            variant="cyan"
          />
          <MetricCard
            title="Decision Threshold"
            value={`${metrics.threshold}%`}
            subtitle="Configurable PASS rule"
            icon={<ShieldCheck className="w-4 h-4 text-amber-600" />}
            variant="amber"
          />
        </div>
      )}

      {/* Category Results Table Preview */}
      {metrics && metrics.category_results.length > 0 && (
        <div className="white-panel rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
              Evaluation Performance Summary by Category
            </h3>
            <span className="text-[10px] font-mono font-bold text-sky-700">10 Benchmark Categories</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200 font-bold">
                <tr>
                  <th className="py-3 px-4">Evaluation Category</th>
                  <th className="py-3 px-4">Total Pairs</th>
                  <th className="py-3 px-4">PASS Count</th>
                  <th className="py-3 px-4">FAIL Count</th>
                  <th className="py-3 px-4">Pass Rate</th>
                  <th className="py-3 px-4">Avg Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {metrics.category_results.map((c, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-sans font-bold text-slate-800">{c.category}</td>
                    <td className="py-3 px-4 text-slate-600">{c.total}</td>
                    <td className="py-3 px-4 text-emerald-700 font-black">{c.pass}</td>
                    <td className="py-3 px-4 text-rose-700 font-black">{c.fail}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${
                          c.pass_rate >= 90
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                            : c.pass_rate === 0
                            ? 'bg-rose-50 text-rose-700 border-rose-300'
                            : 'bg-amber-50 text-amber-800 border-amber-300'
                        }`}
                      >
                        {c.pass_rate}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sky-800 font-black">{c.avg_score}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* JSON Structure Spec Preview */}
      <div className="white-panel p-6 rounded-2xl border border-slate-200 space-y-3 shadow-sm">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
          Standard Export Schema Preview
        </h3>
        <pre className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-mono text-sky-300 overflow-x-auto shadow-inner">
{`{
  "title": "Precipitation Rendering Functional Equivalence Validation Report",
  "summary": {
    "total_pairs_evaluated": 100,
    "pass_count": 50,
    "fail_count": 50,
    "pass_rate_percent": 50.0,
    "average_similarity_percent": 86.5,
    "threshold_percent": 90.0
  },
  "results": [
    {
      "pair_id": "pair_001",
      "expected_image": "expected/pair_001.png",
      "actual_image": "actual/pair_001.png",
      "constraints": {
        "text_excluded": true,
        "icons_excluded": true,
        "arc_lines_excluded": true,
        "legend_excluded": true
      },
      "similarity_score": 98.4,
      "threshold": 90.0,
      "result": "PASS",
      "metrics": {
        "iou": 0.984,
        "pixel_agreement": 0.9987,
        "area_similarity": 0.9846,
        "intensity_agreement": 0.9838,
        "spatial_similarity": 0.988
      },
      "shift_dx": 0,
      "shift_dy": 0,
      "processing_time_ms": 142.5
    }
  ]
}`}
        </pre>
      </div>
    </div>
  );
};

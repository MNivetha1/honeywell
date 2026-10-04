import React, { useState } from 'react';
import {
  Activity,
  CheckCircle2,
  XCircle,
  Percent,
  Clock,
  Layers,
  BarChart3,
  PieChart,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  Eye,
  RefreshCw,
  X,
} from 'lucide-react';
import { MetricCard } from '../components/MetricCard';
import { Badge } from '../components/Badge';
import { PassFailDonut } from '../charts/PassFailDonut';
import { ScoreDistribution } from '../charts/ScoreDistribution';
import { CategoryPerformance } from '../charts/CategoryPerformance';
import { ProcessingTimeline } from '../charts/ProcessingTimeline';
import { MetricsSummary } from '../types';
import { formatPercent, formatMs, formatDateTime } from '../utils/format';

interface DashboardPageProps {
  metrics: MetricsSummary | null;
  onInspectPair: (pairId: string) => void;
  onNavigateToBatch: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  metrics,
  onInspectPair,
  onNavigateToBatch,
}) => {
  const [showChartModal, setShowChartModal] = useState<boolean>(false);
  const [selectedChartTab, setSelectedChartTab] = useState<'donut' | 'distribution' | 'categories' | 'timeline'>('donut');
  const [searchTerm, setSearchTerm] = useState<string>('');

  if (!metrics) {
    return (
      <div className="p-12 flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-3 text-sky-600 font-mono text-sm">
          <Activity className="w-5 h-5 animate-spin" />
          <span>Connecting to live verification telemetry...</span>
        </div>
      </div>
    );
  }

  const {
    total_pairs,
    processed_pairs,
    pass_count,
    fail_count,
    pass_rate,
    average_similarity,
    average_processing_time_ms,
    threshold,
    score_distribution,
    category_results,
    recent_comparisons,
    confusion_matrix,
  } = metrics;

  const filteredRecent = recent_comparisons.filter(
    (c) =>
      c.pair_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.category_name && c.category_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner & Analytics Trigger */}
      <div className="white-panel p-6 rounded-2xl border border-slate-200 bg-gradient-to-r from-sky-50/70 via-white to-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <h2 className="text-lg font-black text-slate-900 tracking-wide uppercase">
              Radar Functional Equivalence Dashboard
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Quantitative computer-vision validation across paired meteorological radar renderings.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Button to View Graph / Visual Analytics Modal */}
          <button
            onClick={() => setShowChartModal(true)}
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-sky-700 border border-sky-300 hover:border-sky-400 text-xs font-bold tracking-wider uppercase flex items-center space-x-2 transition-all shadow-sm"
          >
            <BarChart3 className="w-4 h-4 text-sky-600" />
            <span>View Analytics & Graphs</span>
          </button>

          <button
            onClick={onNavigateToBatch}
            className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs tracking-wider uppercase flex items-center space-x-2 transition-all shadow-sm"
          >
            <span>Execute Batch Run</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <MetricCard
          title="Total Pairs"
          value={total_pairs}
          subtitle="Registered in DB"
          icon={<Layers className="w-4 h-4 text-sky-600" />}
          variant="cyan"
        />
        <MetricCard
          title="Evaluated"
          value={`${processed_pairs}/${total_pairs}`}
          subtitle="Processed"
          icon={<Activity className="w-4 h-4 text-sky-600" />}
          variant="default"
        />
        <MetricCard
          title="PASS Count"
          value={pass_count}
          subtitle="Equivalent"
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
          variant="emerald"
        />
        <MetricCard
          title="FAIL Count"
          value={fail_count}
          subtitle="Discrepant"
          icon={<XCircle className="w-4 h-4 text-rose-600" />}
          variant="rose"
        />
        <MetricCard
          title="Pass Rate"
          value={formatPercent(pass_rate)}
          subtitle={`Threshold: ${threshold}%`}
          icon={<Percent className="w-4 h-4 text-emerald-600" />}
          variant={pass_rate >= 50 ? 'emerald' : 'rose'}
        />
        <MetricCard
          title="Avg Similarity"
          value={formatPercent(average_similarity)}
          subtitle="Composite Score"
          icon={<Percent className="w-4 h-4 text-sky-600" />}
          variant="cyan"
        />
        <MetricCard
          title="Avg Latency"
          value={formatMs(average_processing_time_ms)}
          subtitle="Per image pair"
          icon={<Clock className="w-4 h-4 text-amber-600" />}
          variant="amber"
        />
      </div>

      {/* Ground Truth Validation Benchmark Summary */}
      {confusion_matrix && confusion_matrix.total_evaluated > 0 && (
        <div className="white-panel rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-4">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                Ground-Truth Benchmark Accuracy (100-Pair Evaluation)
              </h3>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="text-slate-500">
                Accuracy: <strong className="text-emerald-700 font-extrabold text-sm">{confusion_matrix.accuracy}%</strong>
              </span>
              <span className="text-slate-500">
                Evaluated: <strong className="text-slate-900 font-bold">{confusion_matrix.total_evaluated} pairs</strong>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <div className="text-[10px] uppercase font-bold text-emerald-700">True PASS (TP)</div>
              <div className="text-xl font-mono font-black text-emerald-800 mt-0.5">
                {confusion_matrix.true_pass} / 50
              </div>
              <div className="text-[10px] text-emerald-600 mt-0.5">Cosmetic & Micro-shifts</div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <div className="text-[10px] uppercase font-bold text-emerald-700">True FAIL (TN)</div>
              <div className="text-xl font-mono font-black text-emerald-800 mt-0.5">
                {confusion_matrix.true_fail} / 50
              </div>
              <div className="text-[10px] text-emerald-600 mt-0.5">Functional Discrepancies</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] uppercase font-bold text-slate-600">False PASS (FP)</div>
              <div className="text-xl font-mono font-black text-slate-800 mt-0.5">{confusion_matrix.false_pass}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">False Acceptance</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] uppercase font-bold text-slate-600">False FAIL (FN)</div>
              <div className="text-xl font-mono font-black text-slate-800 mt-0.5">{confusion_matrix.false_fail}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">False Rejection</div>
            </div>

            <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 col-span-2 sm:col-span-1">
              <div className="text-[10px] uppercase font-bold text-sky-700">CV Precision</div>
              <div className="text-xl font-mono font-black text-sky-800 mt-0.5">{confusion_matrix.pass_precision}%</div>
              <div className="text-[10px] text-sky-600 mt-0.5">Cosmetic Invariance</div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Comparisons Table */}
      <div className="white-panel rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
              Live Comparison Results Stream
            </h3>
            <p className="text-xs text-slate-500">Click on any row to open the complete Computer Vision Pair Inspector</p>
          </div>

          <div className="flex items-center space-x-3">
            <input
              type="text"
              placeholder="Search pair ID or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500 w-56 shadow-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/80 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200 font-bold">
              <tr>
                <th className="py-3 px-4">Pair ID</th>
                <th className="py-3 px-4">Variation Category</th>
                <th className="py-3 px-4">Similarity Score</th>
                <th className="py-3 px-4">Result</th>
                <th className="py-3 px-4">IoU Overlap</th>
                <th className="py-3 px-4">Intensity Agr.</th>
                <th className="py-3 px-4">Latency</th>
                <th className="py-3 px-4">Processed At</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecent.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 font-mono">
                    No matching comparison records found.
                  </td>
                </tr>
              ) : (
                filteredRecent.map((item) => (
                  <tr
                    key={item.pair_id}
                    onClick={() => onInspectPair(item.pair_id)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-black text-sky-700">{item.pair_id}</td>
                    <td className="py-3 px-4 text-slate-700 font-medium">{item.category_name || 'General'}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900">
                          {formatPercent(item.similarity_score)}
                        </span>
                        <div className="w-16 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              item.result === 'PASS' ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                            style={{ width: `${item.similarity_score}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={item.result === 'PASS' ? 'pass' : 'fail'} showIcon size="sm">
                        {item.result}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">{item.metrics.iou.toFixed(3)}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{item.metrics.intensity_agreement.toFixed(3)}</td>
                    <td className="py-3 px-4 font-mono text-amber-700 font-semibold">{formatMs(item.processing_time_ms)}</td>
                    <td className="py-3 px-4 font-mono text-slate-500">{formatDateTime(item.created_at)}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onInspectPair(item.pair_id);
                        }}
                        className="px-2.5 py-1 rounded bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-[11px] font-bold transition-all"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: VIEW GRAPHS & VISUAL ANALYTICS (When user clicks 'View Analytics & Graphs') */}
      {showChartModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-2xl">
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-5 h-5 text-sky-600" />
                <h3 className="text-base font-black uppercase tracking-wide text-slate-900">
                  Visual Analytics & Distribution Graphs
                </h3>
              </div>
              <button
                onClick={() => setShowChartModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="p-4 border-b border-slate-200 flex flex-wrap gap-2 bg-slate-50/50 text-xs">
              {[
                { id: 'donut', label: '1. Pass vs Fail Breakdown', icon: <PieChart className="w-4 h-4" /> },
                { id: 'distribution', label: '2. Similarity Score Distribution', icon: <BarChart3 className="w-4 h-4" /> },
                { id: 'categories', label: '3. Variation Category Results', icon: <TrendingUp className="w-4 h-4" /> },
                { id: 'timeline', label: '4. Latency Timeline', icon: <Clock className="w-4 h-4" /> },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedChartTab(tab.id as any)}
                  className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl font-bold tracking-wide transition-all ${
                    selectedChartTab === tab.id
                      ? 'bg-sky-600 text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Modal Chart Content */}
            <div className="p-6">
              {selectedChartTab === 'donut' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Equivalence Outcome Distribution ({processed_pairs} total pairs evaluated)
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-700">Pass Rate: {pass_rate}%</span>
                  </div>
                  <PassFailDonut passCount={pass_count} failCount={fail_count} total={processed_pairs} />
                </div>
              )}

              {selectedChartTab === 'distribution' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Score Bins (0% to 100% Similarity)
                    </span>
                    <span className="text-xs font-mono font-bold text-sky-700">Threshold: {threshold}%</span>
                  </div>
                  <ScoreDistribution data={score_distribution} />
                </div>
              )}

              {selectedChartTab === 'categories' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      PASS / FAIL Breakdown by Variation Category
                    </span>
                    <span className="text-xs font-mono font-bold text-sky-700">10 Benchmark Types</span>
                  </div>
                  <CategoryPerformance data={category_results} />
                </div>
              )}

              {selectedChartTab === 'timeline' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Execution Latency Timeline per Pair (ms)
                    </span>
                    <span className="text-xs font-mono font-bold text-amber-700">
                      Average: {average_processing_time_ms} ms
                    </span>
                  </div>
                  <ProcessingTimeline recentComparisons={recent_comparisons} />
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl flex justify-end">
              <button
                onClick={() => setShowChartModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold uppercase tracking-wider transition-colors"
              >
                Close Analytics
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  FolderArchive,
  UploadCloud,
  Search,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  RefreshCw,
  Eye,
  Filter,
  Play,
  Layers,
  PlusCircle,
  Trash2,
  Zap,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { DatasetStatistics, ImagePair, ComparisonResult } from '../types';
import { Badge } from '../components/Badge';
import { MetricCard } from '../components/MetricCard';
import { SinglePairUploadModal } from '../components/SinglePairUploadModal';
import { DatasetUploadModal } from '../components/DatasetUploadModal';

interface DatasetPageProps {
  onInspectPair: (pairId: string) => void;
  onNavigateToBatch: () => void;
}

export const DatasetPage: React.FC<DatasetPageProps> = ({ onInspectPair, onNavigateToBatch }) => {
  const [stats, setStats] = useState<DatasetStatistics | null>(null);
  const [pairs, setPairs] = useState<ImagePair[]>([]);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(true);

  const [isSinglePairModalOpen, setIsSinglePairModalOpen] = useState<boolean>(false);
  const [isDatasetZipModalOpen, setIsDatasetZipModalOpen] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [testingPairId, setTestingPairId] = useState<string | null>(null);
  const [deletingPairId, setDeletingPairId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, pairsData] = await Promise.all([
        apiClient.getDatasetStats(),
        apiClient.getDatasetPairs({
          search: search || undefined,
          status: statusFilter || undefined,
          category_id: categoryFilter,
        }),
      ]);
      setStats(statsData);
      setPairs(pairsData);
    } catch (err) {
      console.error('Failed loading dataset:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, statusFilter, categoryFilter]);

  const handleTestSinglePair = async (pairId: string) => {
    setTestingPairId(pairId);
    setNotification(null);
    try {
      const res = await apiClient.runSingleCompare(pairId);
      setNotification({
        type: 'success',
        message: `Evaluated ${pairId}: ${res.result} (${res.similarity_score.toFixed(1)}% similarity, margin: ${res.margin > 0 ? '+' : ''}${res.margin.toFixed(1)}%)`,
      });
      await loadData();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: `Failed to test pair ${pairId}: ${err.message}`,
      });
    } finally {
      setTestingPairId(null);
    }
  };

  const handleDeletePair = async (pairId: string) => {
    if (!window.confirm(`Are you sure you want to delete pair '${pairId}' and its diagnostic data?`)) {
      return;
    }
    setDeletingPairId(pairId);
    try {
      await apiClient.deletePair(pairId);
      setNotification({
        type: 'success',
        message: `Pair '${pairId}' was deleted successfully.`,
      });
      await loadData();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: `Failed deleting pair: ${err.message}`,
      });
    } finally {
      setDeletingPairId(null);
    }
  };

  const handleSinglePairSuccess = (pair: ImagePair, result?: ComparisonResult) => {
    loadData();
    if (result) {
      setNotification({
        type: 'success',
        message: `Pair '${pair.pair_id}' uploaded and evaluated: ${result.result} (${result.similarity_score.toFixed(1)}%)`,
      });
    } else {
      setNotification({
        type: 'success',
        message: `Pair '${pair.pair_id}' uploaded successfully and added to dataset.`,
      });
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header & Upload Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 white-panel p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <FolderArchive className="w-5 h-5 text-sky-600" />
            <h2 className="text-lg font-black text-slate-900 uppercase tracking-wider">
              Dataset Repository Management
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Upload single radar pairs for instant testing or ingest full dataset archives with automatic pairing.
          </p>
        </div>

        {/* Dual Upload Options + Batch Run */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Option 1: Upload Single Pair */}
          <button
            onClick={() => setIsSinglePairModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black tracking-wider uppercase flex items-center space-x-2 transition-all shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Upload Single Pair & Test</span>
          </button>

          {/* Option 2: Upload Whole Dataset (ZIP) */}
          <button
            onClick={() => setIsDatasetZipModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-bold tracking-wider uppercase flex items-center space-x-2 transition-all shadow-sm"
          >
            <FolderArchive className="w-4 h-4 text-sky-600" />
            <span>Upload Dataset (ZIP)</span>
          </button>

          {/* Run All Pairs */}
          <button
            onClick={onNavigateToBatch}
            className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-extrabold tracking-wider uppercase flex items-center space-x-2 transition-all shadow-sm"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Run All Pairs</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {notification && (
        <div
          className={`p-4 rounded-xl border text-xs font-semibold flex items-center justify-between animate-fade-in ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
              : 'bg-rose-50 border-rose-300 text-rose-800'
          }`}
        >
          <div className="flex items-center space-x-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-700 font-bold ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Dataset Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <MetricCard
            title="Matched Pairs"
            value={stats.matched_pairs}
            subtitle="Ready for Analysis"
            icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
            variant="emerald"
          />
          <MetricCard
            title="Expected Images"
            value={stats.total_expected}
            subtitle="Benchmark Renders"
            icon={<Layers className="w-4 h-4 text-sky-600" />}
            variant="cyan"
          />
          <MetricCard
            title="Actual Images"
            value={stats.total_actual}
            subtitle="Candidate Renders"
            icon={<Layers className="w-4 h-4 text-slate-600" />}
            variant="default"
          />
          <MetricCard
            title="Missing Pairs"
            value={stats.missing_pairs}
            subtitle="Unpaired Files"
            icon={<AlertTriangle className="w-4 h-4 text-rose-600" />}
            variant={stats.missing_pairs > 0 ? 'rose' : 'default'}
          />
          <MetricCard
            title="GT PASS Pairs"
            value={stats.pass_ground_truth}
            subtitle="Cosmetic / Minor"
            icon={<FileCheck className="w-4 h-4 text-emerald-600" />}
            variant="emerald"
          />
          <MetricCard
            title="GT FAIL Pairs"
            value={stats.fail_ground_truth}
            subtitle="Functional Discrepancy"
            icon={<AlertTriangle className="w-4 h-4 text-rose-600" />}
            variant="rose"
          />
        </div>
      )}

      {/* Search and Filters Toolbar */}
      <div className="white-panel p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row gap-3 items-center justify-between shadow-sm">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search pair ID (e.g. pair_042)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500 font-mono shadow-inner"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-700 font-medium focus:outline-none focus:border-sky-500 shadow-sm"
          >
            <option value="">All Pairing Statuses</option>
            <option value="Matched">Matched (Ready)</option>
            <option value="Missing Expected">Missing Expected</option>
            <option value="Missing Actual">Missing Actual</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter === undefined ? '' : categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value ? Number(e.target.value) : undefined)}
            className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-700 font-medium focus:outline-none focus:border-sky-500 shadow-sm"
          >
            <option value="">All Categories</option>
            <option value="1">1. Cosmetic text differences</option>
            <option value="2">2. Cosmetic icon differences</option>
            <option value="3">3. Cosmetic arc-line differences</option>
            <option value="4">4. All cosmetic differences</option>
            <option value="5">5. Small precipitation shifts</option>
            <option value="6">6. Medium precipitation shifts</option>
            <option value="7">7. Precipitation intensity changes</option>
            <option value="8">8. Removed precipitation regions</option>
            <option value="9">9. Added precipitation regions</option>
            <option value="10">10. Precipitation shape changes</option>
            <option value="11">11. Custom / Single Pair</option>
          </select>

          <button
            onClick={loadData}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg transition-colors shadow-sm"
            title="Refresh Table"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Image Pairs Data Table */}
      <div className="white-panel rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/80 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200 font-bold">
              <tr>
                <th className="py-3 px-4">Pair ID</th>
                <th className="py-3 px-4">Expected Image</th>
                <th className="py-3 px-4">Actual Image</th>
                <th className="py-3 px-4">Variation Category</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Ground Truth</th>
                <th className="py-3 px-4">Latest Result</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {pairs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-mono">
                    No image pairs found matching criteria.
                  </td>
                </tr>
              ) : (
                pairs.map((p) => {
                  const isTesting = testingPairId === p.pair_id;
                  const isDeleting = deletingPairId === p.pair_id;
                  return (
                    <tr key={p.pair_id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono font-black text-sky-700">{p.pair_id}</td>
                      <td className="py-3 px-4 font-mono text-slate-500">{p.expected_image || '-'}</td>
                      <td className="py-3 px-4 font-mono text-slate-500">{p.actual_image || '-'}</td>
                      <td className="py-3 px-4 text-slate-800">{p.category_name || 'General'}</td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={p.status === 'Matched' ? 'pass' : 'warn'}
                          size="sm"
                          showIcon={p.status === 'Matched'}
                        >
                          {p.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        {p.ground_truth_label ? (
                          <span
                            className={`font-mono font-bold px-2 py-0.5 rounded text-[10px] border ${
                              p.ground_truth_label === 'PASS'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                : 'bg-rose-50 text-rose-700 border-rose-300'
                            }`}
                          >
                            {p.ground_truth_label} (REF)
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {p.latest_result ? (
                          <Badge variant={p.latest_result === 'PASS' ? 'pass' : 'fail'} size="sm">
                            {p.latest_result} ({p.latest_similarity?.toFixed(1)}%)
                          </Badge>
                        ) : (
                          <span className="text-slate-400 font-mono text-[11px]">Pending</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center space-x-1.5">
                          {/* Run Test Button */}
                          <button
                            onClick={() => handleTestSinglePair(p.pair_id)}
                            disabled={isTesting || p.status !== 'Matched'}
                            className="px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[11px] font-bold transition-all inline-flex items-center gap-1 shadow-sm disabled:opacity-40"
                            title="Run Functional Equivalence Test"
                          >
                            <Play className={`w-3 h-3 fill-emerald-600 ${isTesting ? 'animate-spin' : ''}`} />
                            <span>{isTesting ? 'Testing...' : p.latest_result ? 'Re-Test' : 'Test'}</span>
                          </button>

                          {/* Inspect Button */}
                          <button
                            onClick={() => onInspectPair(p.pair_id)}
                            className="px-2.5 py-1 rounded bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-[11px] font-bold transition-all inline-flex items-center gap-1 shadow-sm"
                            title="Inspect in Pair Inspector"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Inspect</span>
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => handleDeletePair(p.pair_id)}
                            disabled={isDeleting}
                            className="p-1 rounded bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition-all shadow-sm"
                            title="Delete Image Pair"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <SinglePairUploadModal
        isOpen={isSinglePairModalOpen}
        onClose={() => setIsSinglePairModalOpen(false)}
        onSuccess={handleSinglePairSuccess}
        onInspectPair={onInspectPair}
      />

      <DatasetUploadModal
        isOpen={isDatasetZipModalOpen}
        onClose={() => setIsDatasetZipModalOpen(false)}
        onSuccess={() => {
          loadData();
          setNotification({
            type: 'success',
            message: 'Dataset archive uploaded and pairs refreshed successfully.',
          });
        }}
      />
    </div>
  );
};

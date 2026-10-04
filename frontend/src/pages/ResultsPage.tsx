import React, { useState, useEffect } from 'react';
import {
  Table,
  Search,
  Filter,
  Download,
  FileSpreadsheet,
  FileCode,
  Eye,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  RefreshCw,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { ComparisonResult } from '../types';
import { Badge } from '../components/Badge';
import { formatPercent, formatMs, formatDateTime } from '../utils/format';

interface ResultsPageProps {
  onInspectPair: (pairId: string) => void;
}

export const ResultsPage: React.FC<ResultsPageProps> = ({ onInspectPair }) => {
  const [results, setResults] = useState<ComparisonResult[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [search, setSearch] = useState<string>('');
  const [resultFilter, setResultFilter] = useState<string>('');
  const [minScore, setMinScore] = useState<number | undefined>(undefined);
  const [maxScore, setMaxScore] = useState<number | undefined>(undefined);
  const [sortBy, setSortBy] = useState<string>('id');
  const [sortOrder, setSortOrder] = useState<string>('asc');
  const [loading, setLoading] = useState<boolean>(true);

  const fetchResults = async () => {
    setLoading(true);
    try {
      const data = await apiClient.getResultsTable({
        search: search || undefined,
        result: resultFilter || undefined,
        min_score: minScore,
        max_score: maxScore,
        sort_by: sortBy,
        sort_order: sortOrder,
        page,
        page_size: pageSize,
      });
      setResults(data.items);
      setTotal(data.total);
      setTotalPages(data.total_pages);
    } catch (err) {
      console.error('Failed to fetch results table:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, [page, pageSize, search, resultFilter, minScore, maxScore, sortBy, sortOrder]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header & Export Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 white-panel p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <Table className="w-5 h-5 text-sky-600" />
            <h2 className="text-lg font-black text-slate-900 uppercase tracking-wider">
              Analysis Verification Results Table
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Browse, sort, search, and export quantitative radar functional equivalence metrics.
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center space-x-3">
          <a
            href={apiClient.getExcelReportUrl()}
            download
            className="px-4 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold tracking-wider uppercase flex items-center space-x-2 transition-all shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>Export Excel (.xlsx)</span>
          </a>

          <a
            href={apiClient.getJsonReportUrl()}
            download
            className="px-4 py-2.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-300 text-xs font-bold tracking-wider uppercase flex items-center space-x-2 transition-all shadow-sm"
          >
            <FileCode className="w-4 h-4 text-sky-700" />
            <span>Export JSON</span>
          </a>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="white-panel p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row gap-3 items-center justify-between shadow-sm">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search pair ID..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500 font-mono shadow-inner"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Result Filter */}
          <select
            value={resultFilter}
            onChange={(e) => {
              setResultFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-700 font-medium focus:outline-none focus:border-sky-500 shadow-sm"
          >
            <option value="">All Outcomes</option>
            <option value="PASS">PASS Only (Equivalence Verified)</option>
            <option value="FAIL">FAIL Only (Functional Discrepancy)</option>
          </select>

          {/* Page Size */}
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-700 font-medium focus:outline-none focus:border-sky-500 shadow-sm"
          >
            <option value="20">20 per page</option>
            <option value="50">50 per page</option>
            <option value="100">100 per page (All)</option>
          </select>

          <button
            onClick={fetchResults}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg transition-colors shadow-sm"
            title="Refresh Table"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Results Table */}
      <div className="white-panel rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/80 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200 font-bold">
              <tr>
                <th
                  onClick={() => handleSort('pair_id')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Pair ID</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4">Variation Category</th>
                <th
                  onClick={() => handleSort('similarity_score')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Similarity</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4">Threshold</th>
                <th className="py-3 px-4">Result</th>
                <th className="py-3 px-4">IoU Overlap</th>
                <th className="py-3 px-4">Intensity Agr.</th>
                <th className="py-3 px-4">Area Sim.</th>
                <th
                  onClick={() => handleSort('processing_time_ms')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Latency</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4">Ground Truth</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {results.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-400 font-mono">
                    {loading ? 'Fetching comparison data...' : 'No results found.'}
                  </td>
                </tr>
              ) : (
                results.map((item) => (
                  <tr
                    key={item.pair_id}
                    onClick={() => onInspectPair(item.pair_id)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-black text-sky-700">{item.pair_id}</td>
                    <td className="py-3 px-4 text-slate-800">{item.category_name || 'General'}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900">
                          {formatPercent(item.similarity_score)}
                        </span>
                        <div className="w-14 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              item.result === 'PASS' ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                            style={{ width: `${item.similarity_score}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">{item.threshold}%</td>
                    <td className="py-3 px-4">
                      <Badge variant={item.result === 'PASS' ? 'pass' : 'fail'} size="sm" showIcon>
                        {item.result}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">{item.metrics.iou.toFixed(3)}</td>
                    <td className="py-3 px-4 font-mono text-slate-700">
                      {item.metrics.intensity_agreement.toFixed(3)}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">
                      {item.metrics.area_similarity.toFixed(3)}
                    </td>
                    <td className="py-3 px-4 font-mono text-amber-700 font-semibold">{formatMs(item.processing_time_ms)}</td>
                    <td className="py-3 px-4">
                      {item.ground_truth_label ? (
                        <span
                          className={`font-mono text-[10px] px-1.5 py-0.5 rounded border font-bold ${
                            item.ground_truth_label === 'PASS'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : 'bg-rose-50 text-rose-700 border-rose-300'
                          }`}
                        >
                          {item.ground_truth_label} (REF)
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onInspectPair(item.pair_id);
                        }}
                        className="px-2.5 py-1 rounded bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-[11px] font-bold transition-all inline-flex items-center gap-1 shadow-sm"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs bg-slate-50/60 font-medium">
          <div className="text-slate-600 font-mono">
            Showing <strong className="text-slate-900">{results.length}</strong> of{' '}
            <strong className="text-slate-900">{total}</strong> comparisons
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page <= 1}
              className="p-1.5 rounded bg-white hover:bg-slate-100 text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed border border-slate-300 shadow-sm"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 bg-white rounded font-mono text-sky-700 font-bold border border-slate-300 shadow-sm">
              Page {page} / {totalPages || 1}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page >= totalPages}
              className="p-1.5 rounded bg-white hover:bg-slate-100 text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed border border-slate-300 shadow-sm"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

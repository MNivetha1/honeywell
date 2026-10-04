import React, { useState, useEffect } from 'react';
import {
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  Sparkles,
  ArrowRight,
  Activity,
  Filter,
  Check,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { BatchJobStatus, ComparisonResult } from '../types';
import { Badge } from '../components/Badge';
import { formatPercent } from '../utils/format';

interface BatchComparisonPageProps {
  onNavigateToResults: () => void;
  onInspectPair: (pairId: string) => void;
}

export const BatchComparisonPage: React.FC<BatchComparisonPageProps> = ({
  onNavigateToResults,
  onInspectPair,
}) => {
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<BatchJobStatus | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>(undefined);
  const [isStarting, setIsStarting] = useState<boolean>(false);

  // Poll active batch job
  useEffect(() => {
    if (!activeJobId) return;

    const interval = setInterval(async () => {
      try {
        const status = await apiClient.getBatchJobStatus(activeJobId);
        setJobStatus(status);

        if (status.status === 'completed' || status.status === 'failed') {
          clearInterval(interval);
        }
      } catch (err) {
        console.error('Error polling batch job:', err);
      }
    }, 400);

    return () => clearInterval(interval);
  }, [activeJobId]);

  const handleStartBatch = async () => {
    setIsStarting(true);
    try {
      const res = await apiClient.triggerBatchCompare({
        category_id: selectedCategory,
      });
      setActiveJobId(res.job_id);
    } catch (err) {
      console.error('Failed to start batch:', err);
    } finally {
      setIsStarting(false);
    }
  };

  const isRunning = jobStatus?.status === 'running';
  const isCompleted = jobStatus?.status === 'completed';

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Panel */}
      <div className="white-panel p-6 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <Layers className="w-5 h-5 text-sky-600" />
            <h2 className="text-lg font-black text-slate-900 uppercase tracking-wider">
              Automated Batch Comparison Engine
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Execute high-throughput functional equivalence verification across all paired radar images.
          </p>
        </div>

        {/* Configuration Filters & Trigger */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedCategory === undefined ? '' : selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value ? Number(e.target.value) : undefined)}
            disabled={isRunning}
            className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-sky-500 font-medium disabled:opacity-50 shadow-sm"
          >
            <option value="">Full Dataset (All 100 Pairs)</option>
            <option value="1">Cat 1: Cosmetic text (12 pairs)</option>
            <option value="2">Cat 2: Cosmetic icons (10 pairs)</option>
            <option value="3">Cat 3: Cosmetic arc lines (10 pairs)</option>
            <option value="4">Cat 4: All cosmetic diffs (8 pairs)</option>
            <option value="5">Cat 5: Small shifts (10 pairs)</option>
            <option value="6">Cat 6: Medium shifts (12 pairs)</option>
            <option value="7">Cat 7: Intensity changes (12 pairs)</option>
            <option value="8">Cat 8: Removed regions (8 pairs)</option>
            <option value="9">Cat 9: Added regions (8 pairs)</option>
            <option value="10">Cat 10: Shape changes (10 pairs)</option>
          </select>

          <button
            onClick={handleStartBatch}
            disabled={isRunning || isStarting}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center space-x-2 transition-all shadow-sm ${
              isRunning
                ? 'bg-blue-100 text-blue-700 border border-blue-300 cursor-not-allowed'
                : 'bg-sky-600 hover:bg-sky-700 text-white border border-sky-700'
            }`}
          >
            <Play className={`w-4 h-4 ${isRunning ? 'animate-spin' : 'fill-white'}`} />
            <span>{isRunning ? 'Processing Batch...' : 'Start Comparison'}</span>
          </button>
        </div>
      </div>

      {/* Progress & Live Telemetry Card */}
      {jobStatus && (
        <div className="white-panel p-6 rounded-2xl border border-slate-200 space-y-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Job Identifier:</span>
                <span className="font-mono text-xs font-black text-sky-700">{jobStatus.job_id}</span>
                <Badge
                  variant={
                    jobStatus.status === 'completed'
                      ? 'pass'
                      : jobStatus.status === 'running'
                      ? 'processing'
                      : 'neutral'
                  }
                  size="sm"
                >
                  {jobStatus.status}
                </Badge>
              </div>
              <div className="text-xs text-slate-500 mt-1 font-medium">
                {isRunning
                  ? `Currently evaluating: ${jobStatus.current_pair_id || 'Starting...'}`
                  : isCompleted
                  ? 'Batch execution completed successfully.'
                  : 'Batch initialized.'}
              </div>
            </div>

            <div className="flex items-center space-x-4 font-mono text-xs">
              <div className="flex items-center space-x-1.5 text-slate-700 font-semibold">
                <Clock className="w-4 h-4 text-sky-600" />
                <span>Elapsed: {jobStatus.elapsed_seconds.toFixed(1)}s</span>
              </div>
              {jobStatus.estimated_remaining_seconds !== null &&
                jobStatus.estimated_remaining_seconds !== undefined &&
                isRunning && (
                  <div className="text-amber-700 font-bold">
                    Est. Remaining: {jobStatus.estimated_remaining_seconds.toFixed(1)}s
                  </div>
                )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-800 font-bold">
                Processing {jobStatus.processed_items} / {jobStatus.total_items} pairs
              </span>
              <span className="text-sky-700 font-black">{jobStatus.progress_percent}%</span>
            </div>
            <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200 p-0.5 shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-sky-500 to-emerald-500 rounded-full transition-all duration-300 shadow-sm"
                style={{ width: `${jobStatus.progress_percent}%` }}
              ></div>
            </div>
          </div>

          {/* Running Telemetry Counter Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <div className="text-[10px] uppercase font-bold text-slate-500">Total Progress</div>
              <div className="text-2xl font-mono font-black text-slate-900 mt-0.5">
                {jobStatus.processed_items} / {jobStatus.total_items}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
              <div className="text-[10px] uppercase font-bold text-emerald-700">PASS Count</div>
              <div className="text-2xl font-mono font-black text-emerald-800 mt-0.5">{jobStatus.pass_count}</div>
            </div>
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-center">
              <div className="text-[10px] uppercase font-bold text-rose-700">FAIL Count</div>
              <div className="text-2xl font-mono font-black text-rose-800 mt-0.5">{jobStatus.fail_count}</div>
            </div>
            <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-200 text-center">
              <div className="text-[10px] uppercase font-bold text-sky-700">Running Average</div>
              <div className="text-2xl font-mono font-black text-sky-800 mt-0.5">
                {formatPercent(jobStatus.average_similarity)}
              </div>
            </div>
          </div>

          {/* Action on Complete */}
          {isCompleted && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center space-x-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                <div>
                  <div className="text-sm font-black text-slate-900">All {jobStatus.total_items} Pairs Processed!</div>
                  <div className="text-xs text-slate-700 mt-0.5">
                    Results: <strong className="text-emerald-700 font-bold">{jobStatus.pass_count} PASS</strong>,{' '}
                    <strong className="text-rose-700 font-bold">{jobStatus.fail_count} FAIL</strong> (Average Similarity:{' '}
                    {jobStatus.average_similarity}%)
                  </div>
                </div>
              </div>
              <button
                onClick={onNavigateToResults}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider flex items-center space-x-2 transition-all shadow-sm shrink-0"
              >
                <span>View Full Results Table</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* CV Engine Pipeline Explanation Card */}
      <div className="white-panel p-6 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
        <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
          Computer Vision Functional Pipeline Workflow
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="font-mono text-sky-700 font-black text-xs mb-1">01. INGESTION</div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Normalized to 512x512 resolution with Gaussian anti-aliasing filter.
              </p>
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="font-mono text-sky-700 font-black text-xs mb-1">02. EXCLUSION</div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Cosmetic text, flight icons, radar range arcs & legends masked out.
              </p>
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="font-mono text-sky-700 font-black text-xs mb-1">03. SEGMENTATION</div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Precipitation extracted into 4 multi-class intensity layers (0..4 dBZ).
              </p>
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="font-mono text-sky-700 font-black text-xs mb-1">04. ALIGNMENT</div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Phase-correlation computes translation shift within ±8px tolerance.
              </p>
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="font-mono text-sky-700 font-black text-xs mb-1">05. DECISION</div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Weighted scoring (IoU 40%, Intensity 30%, Area 20%, Spatial 10%). PASS &ge; 90%.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

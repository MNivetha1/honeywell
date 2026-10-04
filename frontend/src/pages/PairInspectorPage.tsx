import React, { useState, useEffect } from 'react';
import {
  Search,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Layers,
  Sliders,
  Eye,
  ShieldCheck,
  Zap,
  Activity,
  ArrowRight,
  RefreshCw,
  Info,
  PlusCircle,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { ComparisonResult, ImagePair } from '../types';
import { Badge } from '../components/Badge';
import { ImageViewer } from '../components/ImageViewer';
import { formatPercent, formatMs } from '../utils/format';
import { SinglePairUploadModal } from '../components/SinglePairUploadModal';

interface PairInspectorPageProps {
  initialPairId?: string;
  onNavigatePair?: (pairId: string) => void;
}

export const PairInspectorPage: React.FC<PairInspectorPageProps> = ({
  initialPairId = 'pair_001',
}) => {
  const [currentPairId, setCurrentPairId] = useState<string>(initialPairId);
  const [pairData, setPairData] = useState<ComparisonResult | null>(null);
  const [allPairs, setAllPairs] = useState<ImagePair[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'expected' | 'actual' | 'masks' | 'metrics' | 'alignment'>('overview');
  const [loading, setLoading] = useState<boolean>(true);
  const [recalculating, setRecalculating] = useState<boolean>(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);

  const fetchPairsList = async () => {
    try {
      const data = await apiClient.getDatasetPairs();
      setAllPairs(data);
    } catch (err) {
      console.error('Failed fetching pairs list:', err);
    }
  };

  const loadPair = async (pId: string) => {
    setLoading(true);
    try {
      const res = await apiClient.getSingleResult(pId);
      setPairData(res);
      setCurrentPairId(pId);
    } catch (err) {
      console.error('Failed loading pair detail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPairsList();
  }, []);

  useEffect(() => {
    loadPair(initialPairId);
  }, [initialPairId]);

  const currentIndex = allPairs.findIndex((p) => p.pair_id === currentPairId);

  const handlePrev = () => {
    if (currentIndex > 0) {
      loadPair(allPairs[currentIndex - 1].pair_id);
    } else {
      const num = parseInt(currentPairId.replace('pair_', '')) || 1;
      const prevNum = Math.max(1, num - 1);
      loadPair(`pair_${prevNum.toString().padStart(3, '0')}`);
    }
  };

  const handleNext = () => {
    if (currentIndex >= 0 && currentIndex < allPairs.length - 1) {
      loadPair(allPairs[currentIndex + 1].pair_id);
    } else {
      const num = parseInt(currentPairId.replace('pair_', '')) || 1;
      loadPair(`pair_${(num + 1).toString().padStart(3, '0')}`);
    }
  };

  const handleReanalyze = async () => {
    if (!pairData) return;
    setRecalculating(true);
    try {
      const res = await apiClient.runSingleCompare(currentPairId);
      setPairData(res);
      fetchPairsList();
    } catch (err) {
      console.error('Failed re-analyzing pair:', err);
    } finally {
      setRecalculating(false);
    }
  };

  const handleSinglePairSuccess = (pair: ImagePair, result?: ComparisonResult) => {
    fetchPairsList();
    if (result) {
      setPairData(result);
      setCurrentPairId(pair.pair_id);
    } else {
      loadPair(pair.pair_id);
    }
  };

  const isPrevDisabled = currentIndex === 0 || (currentIndex === -1 && parseInt(currentPairId.replace('pair_', '')) <= 1);
  const isNextDisabled = currentIndex >= 0 && currentIndex === allPairs.length - 1;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Inspector Header Card */}
      <div className="white-panel p-6 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Pair Selector & Prev/Next */}
          <div className="flex flex-wrap items-center space-x-3">
            <button
              onClick={handlePrev}
              disabled={isPrevDisabled}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-30 border border-slate-200 transition-colors shadow-sm"
              title="Previous Pair"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Pair Selector Dropdown */}
            {allPairs.length > 0 ? (
              <select
                value={currentPairId}
                onChange={(e) => loadPair(e.target.value)}
                className="text-lg font-black font-mono text-sky-700 bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 focus:outline-none focus:border-sky-500 shadow-inner"
              >
                {allPairs.map((p) => (
                  <option key={p.pair_id} value={p.pair_id}>
                    {p.pair_id} {p.latest_result ? `(${p.latest_result})` : ''} - {p.category_name || 'General'}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-2xl font-black font-mono text-sky-700">{currentPairId}</span>
            )}

            {pairData && (
              <Badge variant={pairData.result === 'PASS' ? 'pass' : 'fail'} showIcon size="md">
                {pairData.result}
              </Badge>
            )}

            {pairData?.ground_truth_label && (
              <span
                className={`font-mono text-xs px-2 py-0.5 rounded border font-bold ${
                  pairData.ground_truth_label === 'PASS'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : 'bg-rose-50 text-rose-700 border-rose-300'
                }`}
              >
                GT: {pairData.ground_truth_label}
              </span>
            )}

            <button
              onClick={handleNext}
              disabled={isNextDisabled}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-30 border border-slate-200 transition-colors shadow-sm"
              title="Next Pair"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Score, Margin, and Actions */}
          <div className="flex flex-wrap items-center gap-3">
            {pairData && (
              <div className="flex items-center space-x-4 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 text-xs shadow-inner">
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-500">Similarity Score</div>
                  <div className="text-lg font-black font-mono text-sky-800">
                    {formatPercent(pairData.similarity_score)}
                  </div>
                </div>
                <div className="h-8 w-px bg-slate-200"></div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-500">Threshold</div>
                  <div className="text-base font-black font-mono text-slate-800">{pairData.threshold}%</div>
                </div>
                <div className="h-8 w-px bg-slate-200"></div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-500">Decision Margin</div>
                  <div
                    className={`text-base font-black font-mono ${
                      pairData.margin >= 0 ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {pairData.margin >= 0 ? `+${pairData.margin}%` : `${pairData.margin}%`}
                  </div>
                </div>
              </div>
            )}

            {/* Upload New Single Pair Quick Action */}
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black tracking-wider uppercase flex items-center space-x-1.5 transition-all shadow-sm"
              title="Upload and Test a Single Pair"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Upload Pair</span>
            </button>

            {/* Re-analyze Pair */}
            <button
              onClick={handleReanalyze}
              disabled={recalculating}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-bold tracking-wider uppercase flex items-center space-x-2 transition-all shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${recalculating ? 'animate-spin' : ''}`} />
              <span>{recalculating ? 'Re-analyzing...' : 'Re-analyze'}</span>
            </button>
          </div>
        </div>

        {/* Diagnostic Description Banner */}
        {pairData?.description && (
          <div className="p-3.5 rounded-xl bg-sky-50/70 border border-sky-200 text-xs text-slate-700 flex items-center space-x-2 font-medium">
            <Info className="w-4 h-4 text-sky-600 shrink-0" />
            <span>
              <strong className="text-slate-900">Variation Description:</strong> {pairData.description}
            </span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3 text-xs">
          {[
            { id: 'overview', label: '1. Overview & Wipe Slider', icon: <Eye className="w-3.5 h-3.5" /> },
            { id: 'masks', label: '2. Difference & Extracted Masks', icon: <Layers className="w-3.5 h-3.5" /> },
            { id: 'metrics', label: '3. Metrics & Scoring Math', icon: <Activity className="w-3.5 h-3.5" /> },
            { id: 'alignment', label: '4. Alignment & Exclusions', icon: <Sliders className="w-3.5 h-3.5" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl font-bold tracking-wide transition-all ${
                activeTab === tab.id
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Tab Content */}
      {pairData && (
        <div className="space-y-6">
          {/* TAB 1: OVERVIEW & COMPARISON SLIDER */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <ImageViewer
                title={`Visual Functional Comparison: ${pairData.pair_id}`}
                expectedUrl={pairData.expected_image_url}
                actualUrl={pairData.actual_image_url}
                diffUrl={pairData.diff_mask_url}
              />

              {/* Quick Diagnostic Callout */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="white-panel p-4.5 rounded-2xl border border-slate-200 text-center shadow-sm">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Precipitation Overlap (IoU)</span>
                  <div className="text-2xl font-mono font-black text-sky-700 mt-1">
                    {(pairData.metrics.iou * 100).toFixed(1)}%
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">Weight: 40%</span>
                </div>
                <div className="white-panel p-4.5 rounded-2xl border border-slate-200 text-center shadow-sm">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Intensity Agreement</span>
                  <div className="text-2xl font-mono font-black text-amber-700 mt-1">
                    {(pairData.metrics.intensity_agreement * 100).toFixed(1)}%
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">Weight: 30%</span>
                </div>
                <div className="white-panel p-4.5 rounded-2xl border border-slate-200 text-center shadow-sm">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Area Footprint Match</span>
                  <div className="text-2xl font-mono font-black text-emerald-700 mt-1">
                    {(pairData.metrics.area_similarity * 100).toFixed(1)}%
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">Weight: 20%</span>
                </div>
                <div className="white-panel p-4.5 rounded-2xl border border-slate-200 text-center shadow-sm">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Spatial Correlation</span>
                  <div className="text-2xl font-mono font-black text-slate-800 mt-1">
                    {(pairData.metrics.spatial_similarity * 100).toFixed(1)}%
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">Weight: 10%</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MASKS & VISUAL DIAGNOSTICS */}
          {activeTab === 'masks' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Expected Extracted Mask */}
                <div className="white-panel p-4.5 rounded-2xl border border-slate-200 flex flex-col items-center shadow-sm">
                  <span className="text-xs font-black uppercase tracking-wider text-sky-700 mb-2">
                    1. Expected Precipitation Mask
                  </span>
                  <div className="rounded-xl border border-slate-800 bg-[#070d18] p-1 w-full aspect-square flex items-center justify-center overflow-hidden shadow-inner">
                    <img
                      src={pairData.expected_mask_url}
                      alt="Expected Precipitation Mask"
                      className="w-full h-full object-contain rounded-lg"
                    />
                  </div>
                  <span className="text-[11px] text-slate-500 mt-2.5 text-center font-medium">
                    Isolated multi-level precipitation layers with cosmetic features excluded.
                  </span>
                </div>

                {/* Actual Extracted Mask */}
                <div className="white-panel p-4.5 rounded-2xl border border-slate-200 flex flex-col items-center shadow-sm">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-700 mb-2">
                    2. Actual Precipitation Mask
                  </span>
                  <div className="rounded-xl border border-slate-800 bg-[#070d18] p-1 w-full aspect-square flex items-center justify-center overflow-hidden shadow-inner">
                    <img
                      src={pairData.actual_mask_url}
                      alt="Actual Precipitation Mask"
                      className="w-full h-full object-contain rounded-lg"
                    />
                  </div>
                  <span className="text-[11px] text-slate-500 mt-2.5 text-center font-medium">
                    Candidate precipitation mask aligned via phase correlation.
                  </span>
                </div>

                {/* Exclusion Mask */}
                <div className="white-panel p-4.5 rounded-2xl border border-slate-200 flex flex-col items-center shadow-sm">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700 mb-2">
                    3. Cosmetic Exclusion Mask
                  </span>
                  <div className="rounded-xl border border-slate-800 bg-[#070d18] p-1 w-full aspect-square flex items-center justify-center overflow-hidden shadow-inner">
                    <img
                      src={pairData.exclusion_mask_url}
                      alt="Exclusion Mask"
                      className="w-full h-full object-contain rounded-lg"
                    />
                  </div>
                  <span className="text-[11px] text-slate-500 mt-2.5 text-center font-medium">
                    Masked non-meteorological UI pixels (text, flight icons, range rings).
                  </span>
                </div>

                {/* Difference Heatmap */}
                <div className="white-panel p-4.5 rounded-2xl border border-slate-200 flex flex-col items-center shadow-sm">
                  <span className="text-xs font-black uppercase tracking-wider text-rose-700 mb-2">
                    4. Difference Heatmap
                  </span>
                  <div className="rounded-xl border border-slate-800 bg-[#070d18] p-1 w-full aspect-square flex items-center justify-center overflow-hidden shadow-inner">
                    <img
                      src={pairData.diff_mask_url}
                      alt="Difference Heatmap"
                      className="w-full h-full object-contain rounded-lg"
                    />
                  </div>
                  <span className="text-[11px] text-slate-500 mt-2.5 text-center font-medium">
                    False-color overlay indicating matches, under/over-precip, and intensity errors.
                  </span>
                </div>
              </div>

              {/* Difference Heatmap Legend */}
              <div className="white-panel p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="text-xs font-black uppercase tracking-wider text-slate-800 mb-3">
                  Difference Heatmap Color Coding Reference
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div className="flex items-center space-x-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="w-3.5 h-3.5 rounded-md bg-[#00dc5a] shrink-0 shadow-sm"></span>
                    <div>
                      <div className="font-bold text-slate-800">Matching Precipitation</div>
                      <div className="text-[10px] text-slate-500">Identical dBZ category & location</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="w-3.5 h-3.5 rounded-md bg-[#00beff] shrink-0 shadow-sm"></span>
                    <div>
                      <div className="font-bold text-slate-800">Under-Precipitation</div>
                      <div className="text-[10px] text-slate-500">Missing storm cell in Actual</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="w-3.5 h-3.5 rounded-md bg-[#ff3c3c] shrink-0 shadow-sm"></span>
                    <div>
                      <div className="font-bold text-slate-800">Over-Precipitation</div>
                      <div className="text-[10px] text-slate-500">False ghost artifact in Actual</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="w-3.5 h-3.5 rounded-md bg-[#ffc81e] shrink-0 shadow-sm"></span>
                    <div>
                      <div className="font-bold text-slate-800">Intensity Discrepancy</div>
                      <div className="text-[10px] text-slate-500">Level mismatch (e.g. Low vs Severe)</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: METRICS & SCORING MATH */}
          {activeTab === 'metrics' && (
            <div className="space-y-6">
              <div className="white-panel p-6 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
                    Weighted Equivalence Scoring Breakdown
                  </h3>
                  <div className="font-mono text-xs text-sky-700 font-extrabold">
                    Composite Score: {formatPercent(pairData.similarity_score)}
                  </div>
                </div>

                <div className="space-y-3.5">
                  {/* Metric 1: IoU */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="font-bold text-sky-800">1. Intersection over Union (IoU) — 40% Weight</span>
                      <span className="font-mono text-slate-700 font-bold">
                        {(pairData.metrics.iou * 100).toFixed(2)}% &times; 0.40 ={' '}
                        <strong className="text-sky-700">{(pairData.metrics.iou * 40).toFixed(2)} pts</strong>
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-sky-500 rounded-full" style={{ width: `${pairData.metrics.iou * 100}%` }}></div>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Evaluates spatial overlap between precipitation masks within valid non-excluded domain: (Expected &cap; Actual) / (Expected &cup; Actual).
                    </p>
                  </div>

                  {/* Metric 2: Intensity Agreement */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="font-bold text-amber-800">2. Intensity Agreement — 30% Weight</span>
                      <span className="font-mono text-slate-700 font-bold">
                        {(pairData.metrics.intensity_agreement * 100).toFixed(2)}% &times; 0.30 ={' '}
                        <strong className="text-amber-700">{(pairData.metrics.intensity_agreement * 30).toFixed(2)} pts</strong>
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full"
                        style={{ width: `${pairData.metrics.intensity_agreement * 100}%` }}
                      ></div>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Evaluates multi-class meteorological reflectivity consistency across Low (1), Moderate (2), Heavy (3), and Extreme (4) dBZ levels.
                    </p>
                  </div>

                  {/* Metric 3: Area Similarity */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="font-bold text-emerald-800">3. Precipitation Area Similarity — 20% Weight</span>
                      <span className="font-mono text-slate-700 font-bold">
                        {(pairData.metrics.area_similarity * 100).toFixed(2)}% &times; 0.20 ={' '}
                        <strong className="text-emerald-700">{(pairData.metrics.area_similarity * 20).toFixed(2)} pts</strong>
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${pairData.metrics.area_similarity * 100}%` }}
                      ></div>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Measures storm footprint coverage equivalence: 1.0 - (|Area_exp - Area_act| / max(Area_exp, Area_act)).
                    </p>
                  </div>

                  {/* Metric 4: Spatial Correlation */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="font-bold text-slate-800">4. Spatial Distribution Similarity — 10% Weight</span>
                      <span className="font-mono text-slate-700 font-bold">
                        {(pairData.metrics.spatial_similarity * 100).toFixed(2)}% &times; 0.10 ={' '}
                        <strong className="text-slate-900">{(pairData.metrics.spatial_similarity * 10).toFixed(2)} pts</strong>
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-slate-400 rounded-full"
                        style={{ width: `${pairData.metrics.spatial_similarity * 100}%` }}
                      ></div>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Calculates normalized cross-correlation and centroid proximity of storm distribution.
                    </p>
                  </div>
                </div>

                {/* Final Decision Equation */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-slate-100 via-sky-50 to-slate-100 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                  <div>
                    <div className="text-xs font-black uppercase text-slate-800">PASS/FAIL Decision Rule:</div>
                    <div className="text-xs font-mono text-slate-600 mt-0.5">
                      Score ({pairData.similarity_score}%) &ge; Threshold ({pairData.threshold}%) &rarr;{' '}
                      <strong className={pairData.result === 'PASS' ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
                        {pairData.result}
                      </strong>
                    </div>
                  </div>
                  <Badge variant={pairData.result === 'PASS' ? 'pass' : 'fail'} size="lg" showIcon>
                    {pairData.result} DECISION
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ALIGNMENT & EXCLUSION CONSTRAINTS */}
          {activeTab === 'alignment' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Alignment Card */}
                <div className="white-panel p-6 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
                  <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
                    <Sliders className="w-4 h-4 text-sky-600" />
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
                      Image Registration & Alignment Telemetry
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                      <div className="text-[10px] uppercase font-bold text-slate-500">Horizontal Shift (dx)</div>
                      <div className="text-2xl font-mono font-black text-sky-700 mt-1">
                        {pairData.shift_dx > 0 ? `+${pairData.shift_dx}` : pairData.shift_dx} px
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium">Tolerance: ±8 px</div>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                      <div className="text-[10px] uppercase font-bold text-slate-500">Vertical Shift (dy)</div>
                      <div className="text-2xl font-mono font-black text-sky-700 mt-1">
                        {pairData.shift_dy > 0 ? `+${pairData.shift_dy}` : pairData.shift_dy} px
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium">Tolerance: ±8 px</div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
                    <div className="font-bold text-slate-800">Phase Correlation Status:</div>
                    <p className="text-[11px] leading-relaxed">
                      {Math.abs(pairData.shift_dx) <= 8 && Math.abs(pairData.shift_dy) <= 8
                        ? 'Alignment within subpixel tolerance. Micro-shifts automatically corrected before comparison.'
                        : 'Shift exceeds maximum alignment tolerance. Discrepancy penalized as functional misalignment.'}
                    </p>
                  </div>
                </div>

                {/* Exclusions Card */}
                <div className="white-panel p-6 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
                  <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
                      Active Cosmetic Feature Exclusions
                    </h3>
                  </div>

                  <div className="space-y-2.5">
                    {[
                      { key: 'text_excluded', label: 'Cosmetic Text & Timestamps', desc: 'Station labels, flight altitude, coordinates' },
                      { key: 'icons_excluded', label: 'Weather & Flight Icons', desc: 'Lightning bolts, aircraft symbols, waypoints' },
                      { key: 'arc_lines_excluded', label: 'Radar Range Rings & Azimuth Radials', desc: 'Concentric grid rings and radials' },
                      { key: 'legend_excluded', label: 'dBZ Legend Bar', desc: 'Color bar and calibration scale' },
                    ].map((item) => {
                      const isExcluded = pairData.constraints_applied[item.key] !== false;
                      return (
                        <div
                          key={item.key}
                          className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200"
                        >
                          <div>
                            <div className="text-xs font-bold text-slate-800">{item.label}</div>
                            <div className="text-[11px] text-slate-500">{item.desc}</div>
                          </div>
                          <span
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase border ${
                              isExcluded
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-sm'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            {isExcluded ? '✓ Excluded' : 'Included'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Single Pair Upload Modal */}
      <SinglePairUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={handleSinglePairSuccess}
        onInspectPair={(pId) => loadPair(pId)}
      />
    </div>
  );
};

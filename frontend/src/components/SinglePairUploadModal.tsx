import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  Play,
  Layers,
  ArrowRight,
  RefreshCw,
  Eye,
  FileCheck,
  Zap,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { ComparisonResult, ImagePair } from '../types';
import { Badge } from './Badge';
import { formatPercent, formatMs } from '../utils/format';

interface SinglePairUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (pair: ImagePair, result?: ComparisonResult) => void;
  onInspectPair?: (pairId: string) => void;
}

export const SinglePairUploadModal: React.FC<SinglePairUploadModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onInspectPair,
}) => {
  const [expectedFile, setExpectedFile] = useState<File | null>(null);
  const [actualFile, setActualFile] = useState<File | null>(null);
  const [expectedPreview, setExpectedPreview] = useState<string | null>(null);
  const [actualPreview, setActualPreview] = useState<string | null>(null);

  const [pairId, setPairId] = useState<string>('');
  const [categoryId, setCategoryId] = useState<number>(11);
  const [categoryName, setCategoryName] = useState<string>('Custom Single Pair');
  const [groundTruth, setGroundTruth] = useState<'PASS' | 'FAIL' | ''>('');
  const [description, setDescription] = useState<string>('');
  const [autoCompare, setAutoCompare] = useState<boolean>(true);

  const [uploading, setUploading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<ComparisonResult | null>(null);
  const [createdPair, setCreatedPair] = useState<ImagePair | null>(null);

  const expectedInputRef = useRef<HTMLInputElement>(null);
  const actualInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleExpectedSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setExpectedFile(file);
      setExpectedPreview(URL.createObjectURL(file));
      setErrorMessage(null);
    }
  };

  const handleActualSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setActualFile(file);
      setActualPreview(URL.createObjectURL(file));
      setErrorMessage(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, type: 'expected' | 'actual') => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (type === 'expected') {
        setExpectedFile(file);
        setExpectedPreview(URL.createObjectURL(file));
      } else {
        setActualFile(file);
        setActualPreview(URL.createObjectURL(file));
      }
      setErrorMessage(null);
    }
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = Number(e.target.value);
    setCategoryId(val);
    const names: Record<number, string> = {
      1: 'Cosmetic text differences',
      2: 'Cosmetic icon differences',
      3: 'Cosmetic arc-line differences',
      4: 'All cosmetic differences',
      5: 'Small precipitation shifts',
      6: 'Medium precipitation shifts',
      7: 'Precipitation intensity changes',
      8: 'Removed precipitation regions',
      9: 'Added precipitation regions',
      10: 'Precipitation shape changes',
      11: 'Custom Single Pair',
    };
    setCategoryName(names[val] || 'Custom Single Pair');
  };

  const handleResetForm = () => {
    setExpectedFile(null);
    setActualFile(null);
    setExpectedPreview(null);
    setActualPreview(null);
    setPairId('');
    setGroundTruth('');
    setDescription('');
    setErrorMessage(null);
    setAnalysisResult(null);
    setCreatedPair(null);
    if (expectedInputRef.current) expectedInputRef.current.value = '';
    if (actualInputRef.current) actualInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expectedFile || !actualFile) {
      setErrorMessage('Please select both the Expected reference image and the Actual candidate image.');
      return;
    }

    setUploading(true);
    setErrorMessage(null);
    try {
      const res = await apiClient.uploadSinglePair({
        expectedFile,
        actualFile,
        pairId: pairId.trim() || undefined,
        categoryId,
        categoryName,
        groundTruthLabel: (groundTruth as 'PASS' | 'FAIL') || undefined,
        description: description.trim() || undefined,
        autoCompare,
      });

      setCreatedPair(res.pair);
      if (res.comparison_result) {
        setAnalysisResult(res.comparison_result);
      }
      onSuccess(res.pair, res.comparison_result);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to upload and analyze image pair');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl overflow-hidden my-8">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-50 via-sky-50/50 to-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-sky-600 text-white rounded-xl shadow-sm">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 tracking-wide uppercase">
                Single Pair Upload & Functional Test
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Upload paired radar images to test meteorological functional equivalence.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[calc(85vh-100px)] overflow-y-auto">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs font-semibold flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success / Result Display Card */}
          {analysisResult && createdPair ? (
            <div className="space-y-4 p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-sky-50/40 border border-slate-200 shadow-sm animate-fade-in">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-lg font-black text-sky-700">{createdPair.pair_id}</span>
                    <Badge variant={analysisResult.result === 'PASS' ? 'pass' : 'fail'} showIcon size="md">
                      {analysisResult.result}
                    </Badge>
                    {createdPair.ground_truth_label && (
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                          createdPair.ground_truth_label === 'PASS'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                            : 'bg-rose-50 text-rose-700 border-rose-300'
                        }`}
                      >
                        GT: {createdPair.ground_truth_label}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 font-medium mt-0.5">
                    {createdPair.category_name} &bull; Processed in {formatMs(analysisResult.processing_time_ms)}
                  </div>
                </div>

                <div className="flex items-baseline space-x-2 bg-white px-3.5 py-1.5 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Similarity:</span>
                  <span className="text-xl font-black font-mono text-sky-700">
                    {formatPercent(analysisResult.similarity_score)}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    (Threshold: {analysisResult.threshold}%)
                  </span>
                </div>
              </div>

              {/* Metric Breakdown Progress Bars */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-inner">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Precipitation Mask IoU</div>
                  <div className="text-sm font-mono font-black text-sky-700 mt-0.5">
                    {formatPercent(analysisResult.metrics.iou * 100)}
                  </div>
                  <div className="text-[10px] text-slate-400">40% Weight</div>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-inner">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Intensity Agreement</div>
                  <div className="text-sm font-mono font-black text-sky-700 mt-0.5">
                    {formatPercent(analysisResult.metrics.intensity_agreement * 100)}
                  </div>
                  <div className="text-[10px] text-slate-400">30% Weight</div>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-inner">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Area Similarity</div>
                  <div className="text-sm font-mono font-black text-sky-700 mt-0.5">
                    {formatPercent(analysisResult.metrics.area_similarity * 100)}
                  </div>
                  <div className="text-[10px] text-slate-400">20% Weight</div>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-inner">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Spatial Correlation</div>
                  <div className="text-sm font-mono font-black text-sky-700 mt-0.5">
                    {formatPercent(analysisResult.metrics.spatial_similarity * 100)}
                  </div>
                  <div className="text-[10px] text-slate-400">10% Weight</div>
                </div>
              </div>

              {/* Post-Analysis Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-bold transition-all shadow-sm flex items-center space-x-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Upload Another Pair</span>
                </button>

                {onInspectPair && (
                  <button
                    type="button"
                    onClick={() => {
                      onInspectPair(createdPair.pair_id);
                      onClose();
                    }}
                    className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-all shadow-sm flex items-center space-x-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Inspect Full Diagnostics</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Dual Image Dropzones */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Expected Reference Dropzone */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center space-x-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                      <span>1. Expected Reference Image</span>
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">Required (PNG/JPG)</span>
                  </div>

                  <input
                    type="file"
                    ref={expectedInputRef}
                    onChange={handleExpectedSelect}
                    accept=".png,.jpg,.jpeg,.bmp,.tiff"
                    className="hidden"
                  />

                  <div
                    onClick={() => expectedInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(e, 'expected')}
                    className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[160px] ${
                      expectedPreview
                        ? 'border-emerald-400 bg-emerald-50/20'
                        : 'border-slate-300 hover:border-emerald-400 bg-slate-50 hover:bg-emerald-50/10'
                    }`}
                  >
                    {expectedPreview ? (
                      <div className="space-y-2 flex flex-col items-center">
                        <img
                          src={expectedPreview}
                          alt="Expected Preview"
                          className="h-28 w-28 object-contain rounded-lg border border-emerald-200 shadow-sm bg-slate-900"
                        />
                        <div className="text-[11px] font-mono font-bold text-slate-700 truncate max-w-[200px]">
                          {expectedFile?.name}
                        </div>
                        <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-100 px-2 py-0.5 rounded">
                          Click / drop to replace
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-2 text-slate-400 flex flex-col items-center">
                        <div className="p-3 bg-white rounded-full border border-slate-200 shadow-sm text-emerald-600">
                          <Upload className="w-6 h-6" />
                        </div>
                        <div className="text-xs font-bold text-slate-700">Choose Expected Reference Image</div>
                        <div className="text-[11px] text-slate-500">Drag & drop or click to browse</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actual Candidate Dropzone */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center space-x-1.5">
                      <span className="w-2 h-2 rounded-full bg-sky-500 inline-block"></span>
                      <span>2. Actual Candidate Image</span>
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">Required (PNG/JPG)</span>
                  </div>

                  <input
                    type="file"
                    ref={actualInputRef}
                    onChange={handleActualSelect}
                    accept=".png,.jpg,.jpeg,.bmp,.tiff"
                    className="hidden"
                  />

                  <div
                    onClick={() => actualInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(e, 'actual')}
                    className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[160px] ${
                      actualPreview
                        ? 'border-sky-400 bg-sky-50/20'
                        : 'border-slate-300 hover:border-sky-400 bg-slate-50 hover:bg-sky-50/10'
                    }`}
                  >
                    {actualPreview ? (
                      <div className="space-y-2 flex flex-col items-center">
                        <img
                          src={actualPreview}
                          alt="Actual Preview"
                          className="h-28 w-28 object-contain rounded-lg border border-sky-200 shadow-sm bg-slate-900"
                        />
                        <div className="text-[11px] font-mono font-bold text-slate-700 truncate max-w-[200px]">
                          {actualFile?.name}
                        </div>
                        <span className="text-[10px] text-sky-700 font-semibold bg-sky-100 px-2 py-0.5 rounded">
                          Click / drop to replace
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-2 text-slate-400 flex flex-col items-center">
                        <div className="p-3 bg-white rounded-full border border-slate-200 shadow-sm text-sky-600">
                          <Upload className="w-6 h-6" />
                        </div>
                        <div className="text-xs font-bold text-slate-700">Choose Actual Candidate Image</div>
                        <div className="text-[11px] text-slate-500">Drag & drop or click to browse</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Metadata Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Pair Identifier (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Auto-generated (e.g. pair_101)"
                    value={pairId}
                    onChange={(e) => setPairId(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500 shadow-inner"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Variation Category
                  </label>
                  <select
                    value={categoryId}
                    onChange={handleCategoryChange}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-sky-500 shadow-sm"
                  >
                    <option value="11">Custom / Single Pair</option>
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
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Ground Truth (Optional)
                  </label>
                  <select
                    value={groundTruth}
                    onChange={(e) => setGroundTruth(e.target.value as any)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-sky-500 shadow-sm"
                  >
                    <option value="">Unlabeled / Unknown</option>
                    <option value="PASS">PASS (Functionally Equivalent)</option>
                    <option value="FAIL">FAIL (Discrepancy Present)</option>
                  </select>
                </div>

                <div className="md:col-span-3">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Description / Verification Notes (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Flight radar candidate with modified waypoints & low-dBZ rain cell"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500 shadow-inner"
                  />
                </div>
              </div>

              {/* Auto-Compare Checkbox */}
              <div className="flex items-center justify-between px-1">
                <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoCompare}
                    onChange={(e) => setAutoCompare(e.target.checked)}
                    className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300"
                  />
                  <span>Run CV functional equivalence comparison immediately on upload</span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold transition-all"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={uploading || !expectedFile || !actualFile}
                  className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-black tracking-wider uppercase flex items-center space-x-2 shadow-sm transition-all"
                >
                  {uploading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{autoCompare ? 'Uploading & Analyzing...' : 'Uploading...'}</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 fill-white" />
                      <span>{autoCompare ? 'Upload & Test Pair' : 'Upload Pair'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

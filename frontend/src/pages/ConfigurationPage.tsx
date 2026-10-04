import React, { useState, useEffect } from 'react';
import {
  Settings,
  Sliders,
  ShieldCheck,
  Percent,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Save,
  Check,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { AnalyzerConfig } from '../types';

interface ConfigurationPageProps {
  onConfigUpdated?: () => void;
}

export const ConfigurationPage: React.FC<ConfigurationPageProps> = ({ onConfigUpdated }) => {
  const [config, setConfig] = useState<AnalyzerConfig | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const cfg = await apiClient.getConfig();
      setConfig(cfg);
    } catch (err) {
      console.error('Failed fetching configuration:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const calculateWeightSum = () => {
    if (!config) return 0;
    return Math.round(
      config.scoring.overlap_weight +
        config.scoring.intensity_weight +
        config.scoring.area_weight +
        config.scoring.spatial_weight
    );
  };

  const handleSave = async () => {
    if (!config) return;
    const sum = calculateWeightSum();
    if (sum !== 100) {
      setErrorMessage(`Scoring weights must sum to exactly 100% (Current sum: ${sum}%)`);
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    try {
      const updated = await apiClient.updateConfig(config);
      setConfig(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      if (onConfigUpdated) onConfigUpdated();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed saving configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset all configurations to default values?')) return;
    setSaving(true);
    setErrorMessage(null);
    try {
      const reset = await apiClient.resetConfig();
      setConfig(reset);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      if (onConfigUpdated) onConfigUpdated();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed resetting configuration');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !config) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-sky-700 font-mono text-sm font-semibold">Loading configuration parameters...</div>
      </div>
    );
  }

  const weightSum = calculateWeightSum();
  const isWeightValid = weightSum === 100;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header Card */}
      <div className="white-panel p-6 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-sky-600" />
            <h2 className="text-lg font-black text-slate-900 uppercase tracking-wider">System Pipeline Configuration</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Fine-tune computer vision preprocessing, cosmetic feature exclusions, alignment tolerances, and PASS/FAIL thresholds.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleReset}
            disabled={saving}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-bold tracking-wider uppercase flex items-center space-x-2 transition-all shadow-sm"
          >
            <RotateCcw className="w-4 h-4 text-amber-600" />
            <span>Reset Defaults</span>
          </button>

          <button
            onClick={handleSave}
            disabled={saving || !isWeightValid}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center space-x-2 transition-all shadow-sm ${
              isWeightValid
                ? 'bg-sky-600 hover:bg-sky-700 text-white border border-sky-700'
                : 'bg-slate-100 text-slate-400 border border-slate-300 cursor-not-allowed'
            }`}
          >
            {saveSuccess ? <Check className="w-4 h-4 text-white" /> : <Save className="w-4 h-4" />}
            <span>{saving ? 'Saving...' : saveSuccess ? 'Saved to DB!' : 'Save Configuration'}</span>
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs font-bold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. Feature Exclusion Configuration */}
        <div className="white-panel p-6 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <ShieldCheck className="w-4 h-4 text-sky-600" />
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
              1. Cosmetic Feature Exclusion Filter
            </h3>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Exclude non-meteorological UI layers to ensure equivalence is measured strictly on weather precipitation representation.
          </p>

          <div className="space-y-3">
            {[
              {
                id: 'exclude_text',
                label: 'Exclude Text & Timestamps',
                desc: 'Ignore flight headers, altitude tags, radar station IDs, and timestamps',
                val: config.feature_exclusion.exclude_text,
                setter: (v: boolean) =>
                  setConfig({
                    ...config,
                    feature_exclusion: { ...config.feature_exclusion, exclude_text: v },
                  }),
              },
              {
                id: 'exclude_icons',
                label: 'Exclude Weather & Flight Icons',
                desc: 'Ignore lightning bolts, aircraft arrows, waypoints, and cloud markers',
                val: config.feature_exclusion.exclude_icons,
                setter: (v: boolean) =>
                  setConfig({
                    ...config,
                    feature_exclusion: { ...config.feature_exclusion, exclude_icons: v },
                  }),
              },
              {
                id: 'exclude_arc_lines',
                label: 'Exclude Range Rings & Azimuth Lines',
                desc: 'Ignore radar concentric distance circles and azimuth radial sweep lines',
                val: config.feature_exclusion.exclude_arc_lines,
                setter: (v: boolean) =>
                  setConfig({
                    ...config,
                    feature_exclusion: { ...config.feature_exclusion, exclude_arc_lines: v },
                  }),
              },
              {
                id: 'exclude_legend',
                label: 'Exclude dBZ Color Legend Bar',
                desc: 'Ignore corner colorbar annotations and calibration boxes',
                val: config.feature_exclusion.exclude_legend,
                setter: (v: boolean) =>
                  setConfig({
                    ...config,
                    feature_exclusion: { ...config.feature_exclusion, exclude_legend: v },
                  }),
              },
            ].map((item) => (
              <label
                key={item.id}
                className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 cursor-pointer transition-colors shadow-sm"
              >
                <div>
                  <div className="text-xs font-bold text-slate-900">{item.label}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{item.desc}</div>
                </div>
                <input
                  type="checkbox"
                  checked={item.val}
                  onChange={(e) => item.setter(e.target.checked)}
                  className="w-5 h-5 rounded bg-white border-slate-300 text-sky-600 focus:ring-0 cursor-pointer accent-sky-600"
                />
              </label>
            ))}
          </div>
        </div>

        {/* 2. Decision Threshold & Scoring Weights */}
        <div className="white-panel p-6 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <Percent className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
              2. Decision Threshold & Scoring Weights
            </h3>
          </div>

          {/* PASS Threshold */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-800">PASS/FAIL Decision Threshold (%)</span>
              <span className="font-mono text-base font-black text-emerald-700">
                {config.decision.threshold_percent}%
              </span>
            </div>
            <input
              type="range"
              min="50"
              max="100"
              step="1"
              value={config.decision.threshold_percent}
              onChange={(e) =>
                setConfig({
                  ...config,
                  decision: { threshold_percent: Number(e.target.value) },
                })
              }
              className="w-full accent-emerald-600 cursor-pointer"
            />
            <p className="text-[10px] text-slate-500">
              Comparisons yielding a composite similarity &ge; {config.decision.threshold_percent}% pass verification.
            </p>
          </div>

          {/* Scoring Weights */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-800">Weighted Scoring Components</span>
              <span
                className={`text-xs font-mono font-black px-2 py-0.5 rounded border ${
                  isWeightValid
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : 'bg-rose-50 text-rose-700 border-rose-300'
                }`}
              >
                Sum: {weightSum}% {isWeightValid ? '✓ Valid' : '✗ Must equal 100%'}
              </span>
            </div>

            <div className="space-y-2.5">
              {[
                {
                  key: 'overlap_weight',
                  label: 'Precipitation Overlap (IoU)',
                  val: config.scoring.overlap_weight,
                  color: 'text-sky-800',
                  setter: (v: number) =>
                    setConfig({
                      ...config,
                      scoring: { ...config.scoring, overlap_weight: v },
                    }),
                },
                {
                  key: 'intensity_weight',
                  label: 'Intensity Level Agreement',
                  val: config.scoring.intensity_weight,
                  color: 'text-amber-800',
                  setter: (v: number) =>
                    setConfig({
                      ...config,
                      scoring: { ...config.scoring, intensity_weight: v },
                    }),
                },
                {
                  key: 'area_weight',
                  label: 'Area Footprint Similarity',
                  val: config.scoring.area_weight,
                  color: 'text-emerald-800',
                  setter: (v: number) =>
                    setConfig({
                      ...config,
                      scoring: { ...config.scoring, area_weight: v },
                    }),
                },
                {
                  key: 'spatial_weight',
                  label: 'Spatial Distribution Similarity',
                  val: config.scoring.spatial_weight,
                  color: 'text-slate-800',
                  setter: (v: number) =>
                    setConfig({
                      ...config,
                      scoring: { ...config.scoring, spatial_weight: v },
                    }),
                },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between gap-3 text-xs">
                  <span className={`font-bold ${item.color} w-48`}>{item.label}</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="5"
                    value={item.val}
                    onChange={(e) => item.setter(Number(e.target.value))}
                    className="w-20 px-2 py-1 bg-white border border-slate-300 rounded text-right font-mono text-slate-900 text-xs focus:outline-none focus:border-sky-500 shadow-sm"
                  />
                  <span className="font-mono text-slate-500 text-xs w-6 font-bold">%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 3. Image Preprocessing Parameters */}
        <div className="white-panel p-6 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <Sliders className="w-4 h-4 text-sky-600" />
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
              3. Image Preprocessing & Normalization
            </h3>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Target Width (px)</span>
                <input
                  type="number"
                  value={config.image_processing.width}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      image_processing: { ...config.image_processing, width: Number(e.target.value) },
                    })
                  }
                  className="w-full mt-1 px-2 py-1 bg-white border border-slate-300 rounded font-mono text-slate-900 text-xs shadow-sm"
                />
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Target Height (px)</span>
                <input
                  type="number"
                  value={config.image_processing.height}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      image_processing: { ...config.image_processing, height: Number(e.target.value) },
                    })
                  }
                  className="w-full mt-1 px-2 py-1 bg-white border border-slate-300 rounded font-mono text-slate-900 text-xs shadow-sm"
                />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-800">Gaussian Anti-Aliasing Blur (&sigma;)</span>
                <span className="font-mono text-sky-700 font-bold">{config.image_processing.blur.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="5"
                step="0.2"
                value={config.image_processing.blur}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    image_processing: { ...config.image_processing, blur: Number(e.target.value) },
                  })
                }
                className="w-full accent-sky-600 cursor-pointer"
              />
            </div>

            <label className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 cursor-pointer transition-colors shadow-sm">
              <div>
                <div className="text-xs font-bold text-slate-900">Morphological Opening/Closing</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Smooths subpixel raster artifacts</div>
              </div>
              <input
                type="checkbox"
                checked={config.image_processing.morphology}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    image_processing: { ...config.image_processing, morphology: e.target.checked },
                  })
                }
                className="w-5 h-5 rounded bg-white border-slate-300 text-sky-600 focus:ring-0 cursor-pointer accent-sky-600"
              />
            </label>
          </div>
        </div>

        {/* 4. Registration & Alignment Configuration */}
        <div className="white-panel p-6 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <Sliders className="w-4 h-4 text-sky-600" />
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
              4. Alignment & Registration Tolerance
            </h3>
          </div>

          <div className="space-y-3">
            <label className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 cursor-pointer transition-colors shadow-sm">
              <div>
                <div className="text-xs font-bold text-slate-900">Enable Translation Alignment</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Phase-correlation auto-corrects minor subpixel jitter
                </div>
              </div>
              <input
                type="checkbox"
                checked={config.alignment.alignment_enabled}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    alignment: { ...config.alignment, alignment_enabled: e.target.checked },
                  })
                }
                className="w-5 h-5 rounded bg-white border-slate-300 text-sky-600 focus:ring-0 cursor-pointer accent-sky-600"
              />
            </label>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-800">Max Shift Tolerance (&plusmn;px)</span>
                <span className="font-mono text-sky-700 font-bold">{config.alignment.max_shift_pixels} px</span>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                step="1"
                value={config.alignment.max_shift_pixels}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    alignment: { ...config.alignment, max_shift_pixels: Number(e.target.value) },
                  })
                }
                className="w-full accent-sky-600 cursor-pointer"
              />
              <p className="text-[10px] text-slate-500">
                Shifts beyond {config.alignment.max_shift_pixels}px are treated as genuine functional discrepancies.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

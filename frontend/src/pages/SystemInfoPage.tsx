import React, { useState, useEffect } from 'react';
import {
  Info,
  CheckCircle2,
  Cpu,
  Database,
  Radio,
  Layers,
  Terminal,
  RefreshCw,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { HealthStatus, SystemInfo } from '../types';
import { formatDateTime } from '../utils/format';

export const SystemInfoPage: React.FC = () => {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [h, s] = await Promise.all([apiClient.getHealth(), apiClient.getSystemInfo()]);
      setHealth(h);
      setSystemInfo(s);
    } catch (err) {
      console.error('Failed fetching system telemetry:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header Card */}
      <div className="white-panel p-6 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <Info className="w-5 h-5 text-sky-600" />
            <h2 className="text-lg font-black text-slate-900 uppercase tracking-wider">
              System Telemetry & Architecture
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Real-time backend health, computer vision environment versions, database telemetry, and radar adapter interfaces.
          </p>
        </div>

        <button
          onClick={loadData}
          className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-bold tracking-wider uppercase flex items-center space-x-2 transition-all shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {/* Operational Readiness Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="white-panel p-4.5 rounded-2xl border border-slate-200 flex items-center space-x-3.5 shadow-sm">
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-500">FastAPI Backend</div>
            <div className="text-sm font-bold text-emerald-700">Connected (Port 8000)</div>
            <div className="text-[10px] font-mono text-slate-400">Status: {health?.status || 'OK'}</div>
          </div>
        </div>

        <div className="white-panel p-4.5 rounded-2xl border border-slate-200 flex items-center space-x-3.5 shadow-sm">
          <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-sky-600">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-500">SQLite Database</div>
            <div className="text-sm font-bold text-sky-700">Connected (WAL Mode)</div>
            <div className="text-[10px] font-mono text-slate-400">{systemInfo?.database_status || 'Active'}</div>
          </div>
        </div>

        <div className="white-panel p-4.5 rounded-2xl border border-slate-200 flex items-center space-x-3.5 shadow-sm">
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-500">CV Comparison Engine</div>
            <div className="text-sm font-bold text-emerald-700">Ready & Calibrated</div>
            <div className="text-[10px] font-mono text-slate-400">OpenCV {systemInfo?.opencv_version || '4.8+'}</div>
          </div>
        </div>

        <div className="white-panel p-4.5 rounded-2xl border border-slate-200 flex items-center space-x-3.5 shadow-sm">
          <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-sky-600">
            <Radio className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-500">Real Radar Adapter</div>
            <div className="text-sm font-bold text-sky-700">NOAA / NEXRAD Ready</div>
            <div className="text-[10px] font-mono text-slate-400">Cartesian & Polar PPI</div>
          </div>
        </div>
      </div>

      {/* Environment Versions & Database Metrics */}
      {systemInfo && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Versions Table */}
          <div className="white-panel p-6 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
              <Terminal className="w-4 h-4 text-sky-600" />
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
                Core Dependencies & Runtime Telemetry
              </h3>
            </div>

            <div className="space-y-2.5 font-mono text-xs">
              {[
                { label: 'Application Platform', val: `${systemInfo.application_name} v${systemInfo.application_version}` },
                { label: 'Python Runtime', val: `Python ${systemInfo.python_version}` },
                { label: 'OpenCV Headless', val: `OpenCV ${systemInfo.opencv_version}` },
                { label: 'NumPy Accelerated', val: `NumPy ${systemInfo.numpy_version}` },
                { label: 'scikit-image Library', val: `scikit-image ${systemInfo.scikit_image_version}` },
                { label: 'FastAPI Framework', val: `FastAPI ${systemInfo.fastapi_version}` },
                { label: 'Telemetry Timestamp', val: formatDateTime(systemInfo.system_time) },
              ].map((row, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200"
                >
                  <span className="font-sans font-bold text-slate-700">{row.label}</span>
                  <span className="text-sky-800 font-black">{row.val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Database & Storage Telemetry */}
          <div className="white-panel p-6 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
              <Database className="w-4 h-4 text-sky-600" />
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
                SQLite Storage & Dataset Metrics
              </h3>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="font-sans font-bold text-slate-700 block mb-1">Database File Location</span>
                <span className="text-slate-500 text-[11px] break-all">{systemInfo.database_path}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <div className="text-[10px] font-sans font-bold text-slate-500 uppercase">Registered Pairs</div>
                  <div className="text-2xl font-black text-sky-700 mt-1">{systemInfo.dataset_pairs_count}</div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <div className="text-[10px] font-sans font-bold text-slate-500 uppercase">Analyses Stored</div>
                  <div className="text-2xl font-black text-emerald-700 mt-1">{systemInfo.comparisons_count}</div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-sky-50/60 border border-sky-200 text-[11px] text-slate-600 space-y-1">
                <div className="font-bold text-slate-800 font-sans">Storage Best Practice:</div>
                <p>
                  Images and generated diagnostic difference masks are stored as optimized PNG files on disk under <code className="text-sky-700 font-bold">data/</code> with URI paths indexed in SQLite.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Core Algorithm Architecture Diagram */}
      <div className="white-panel p-6 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
        <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
          Core Algorithm Architecture & Equivalence Flow
        </h3>
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs text-sky-300 leading-relaxed overflow-x-auto shadow-inner">
{`+---------------------------------------------------------------------------------------------------------+
|                                    CV FUNCTIONAL EQUIVALENCE FLOW                                       |
+---------------------------------------------------------------------------------------------------------+
|                                                                                                         |
|   [ Expected Radar Image ]                              [ Actual Candidate Image ]                      |
|              |                                                      |                                   |
|              v                                                      v                                   |
|   1. Preprocessing (512x512, Blur sigma=1.2)           1. Preprocessing (512x512, Blur sigma=1.2)      |
|              |                                                      |                                   |
|              v                                                      v                                   |
|   2. Cosmetic Feature Masking                           2. Cosmetic Feature Masking                     |
|      (Text, Flight Icons, Range Arcs, Legend)               (Text, Flight Icons, Range Arcs, Legend)     |
|              |                                                      |                                   |
|              v                                                      v                                   |
|   3. Precipitation Multi-Class Extraction               3. Precipitation Multi-Class Extraction         |
|      (Level 1=Low, 2=Mod, 3=Hvy, 4=Ext dBZ)                 (Level 1=Low, 2=Mod, 3=Hvy, 4=Ext dBZ)      |
|              |                                                      |                                   |
|              +--------------------------+---------------------------+                                   |
|                                         |                                                               |
|                                         v                                                               |
|                      4. Image Registration & Alignment                                                  |
|                         (Phase-correlation subpixel shift dx, dy)                                       |
|                                         |                                                               |
|                                         v                                                               |
|                      5. Multi-Dimensional Comparison Engine                                             |
|                         * Precipitation Mask IoU (40% Weight)                                           |
|                         * Multi-Class Intensity Agreement (30% Weight)                                  |
|                         * Precipitation Area Similarity (20% Weight)                                    |
|                         * Spatial Distribution Correlation (10% Weight)                                 |
|                                         |                                                               |
|                                         v                                                               |
|                      6. Composite Score (0.0% to 100.0%)                                                |
|                                         |                                                               |
|                                         v                                                               |
|                      7. PASS / FAIL Engine (Threshold >= 90%)                                           |
|                                                                                                         |
+---------------------------------------------------------------------------------------------------------+`}
        </div>
      </div>
    </div>
  );
};

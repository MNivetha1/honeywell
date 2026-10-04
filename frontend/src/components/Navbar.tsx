import React, { useEffect, useState } from 'react';
import { Activity, Play, Radio, RefreshCw, Layers } from 'lucide-react';
import { apiClient } from '../api/client';
import { HealthStatus } from '../types';

interface NavbarProps {
  onTriggerBatch: () => void;
  onRefreshData?: () => void;
  isProcessing?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onTriggerBatch, onRefreshData, isProcessing }) => {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const fetchHealth = () => {
      apiClient.getHealth()
        .then(setHealth)
        .catch(() => setHealth({ status: 'offline', backend_connected: false, database_connected: false, cv_engine_ready: false, version: '1.0.0', timestamp: '' }));
    };

    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);

    const timeInterval = setInterval(() => {
      const now = new Date();
      setTimeStr(now.toUTCString().slice(17, 25) + ' UTC');
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(timeInterval);
    };
  }, []);

  return (
    <header className="h-16 border-b border-slate-200 bg-white/95 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40 shadow-sm">
      {/* Brand & Project Identity */}
      <div className="flex items-center space-x-3">
        <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-sky-50 border border-sky-200 text-sky-600 shadow-sm">
          <Radio className="w-5 h-5 animate-pulse-subtle" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
        </div>
        <div>
          <h1 className="text-sm font-black text-slate-900 tracking-wide flex items-center gap-2">
            PRECIPITATION EQUIVALENCE ANALYZER
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-sky-100 text-sky-700 border border-sky-200">
              v1.0-CV
            </span>
          </h1>
          <p className="text-[11px] text-slate-500 font-medium">
            Radar Functional Equivalence & Weather Rendering QA Engine
          </p>
        </div>
      </div>

      {/* Right Controls & Telemetry */}
      <div className="flex items-center space-x-3">
        {/* System Health Status Pill */}
        <div className="hidden lg:flex items-center space-x-2.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-xs shadow-inner">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                health?.backend_connected ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]' : 'bg-rose-500'
              }`}
            ></span>
            <span className="text-slate-700 font-mono text-[11px] font-semibold">
              {health?.backend_connected ? 'API CONNECTED' : 'OFFLINE'}
            </span>
          </div>
          <span className="text-slate-300">|</span>
          <span className="text-[11px] font-mono text-sky-700 font-semibold">CV READY</span>
          <span className="text-slate-300">|</span>
          <span className="text-[11px] font-mono text-slate-500">{timeStr || '00:00:00 UTC'}</span>
        </div>

        {/* Quick Refresh Button */}
        {onRefreshData && (
          <button
            onClick={onRefreshData}
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors shadow-sm"
            title="Refresh All Data from DB"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}

        {/* Start Batch Run CTA Button */}
        <button
          onClick={onTriggerBatch}
          disabled={isProcessing}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-200 shadow-sm ${
            isProcessing
              ? 'bg-blue-100 text-blue-700 border border-blue-300 cursor-wait'
              : 'bg-sky-600 hover:bg-sky-700 text-white border border-sky-700 shadow-sky-600/20'
          }`}
        >
          <Play className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : 'fill-white'}`} />
          <span>{isProcessing ? 'Processing Batch...' : 'Run All 100 Pairs'}</span>
        </button>
      </div>
    </header>
  );
};

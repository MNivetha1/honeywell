import React, { useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Sliders, Eye, Layers } from 'lucide-react';
import { cn } from '../utils/cn';

interface ImageViewerProps {
  title: string;
  expectedUrl: string;
  actualUrl: string;
  diffUrl?: string;
  maskUrl?: string;
  className?: string;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({
  title,
  expectedUrl,
  actualUrl,
  diffUrl,
  maskUrl,
  className,
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [viewMode, setViewMode] = useState<'split' | 'slider' | 'diff' | 'overlay'>('split');
  const [sliderPos, setSliderPos] = useState<number>(50);
  const [diffOpacity, setDiffOpacity] = useState<number>(80);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.5, 3.5));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.5, 1));
  const handleReset = () => {
    setZoom(1);
    setSliderPos(50);
    setDiffOpacity(80);
  };

  return (
    <div className={cn('white-panel rounded-2xl border border-slate-200 p-5 shadow-sm', className)}>
      {/* Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-4">
        <div className="flex items-center space-x-2">
          <Layers className="w-4 h-4 text-sky-600" />
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">{title}</h3>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
          <button
            onClick={() => setViewMode('split')}
            className={cn(
              'px-3 py-1 rounded-lg transition-colors font-semibold',
              viewMode === 'split' ? 'bg-white text-sky-700 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
            )}
          >
            Side-by-Side
          </button>
          <button
            onClick={() => setViewMode('slider')}
            className={cn(
              'px-3 py-1 rounded-lg transition-colors font-semibold',
              viewMode === 'slider' ? 'bg-white text-sky-700 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
            )}
          >
            Wipe Slider
          </button>
          {diffUrl && (
            <button
              onClick={() => setViewMode('diff')}
              className={cn(
                'px-3 py-1 rounded-lg transition-colors font-semibold',
                viewMode === 'diff' ? 'bg-white text-rose-700 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
              )}
            >
              Difference Mask
            </button>
          )}
          {diffUrl && (
            <button
              onClick={() => setViewMode('overlay')}
              className={cn(
                'px-3 py-1 rounded-lg transition-colors font-semibold',
                viewMode === 'overlay' ? 'bg-white text-amber-700 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
              )}
            >
              Diff Overlay
            </button>
          )}
        </div>

        {/* Zoom & Reset Tools */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200 text-xs text-slate-700 font-medium">
            <button onClick={handleZoomOut} className="p-1 hover:text-sky-600 transition-colors" title="Zoom Out">
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-slate-800 px-1 font-bold">{zoom.toFixed(1)}x</span>
            <button onClick={handleZoomIn} className="p-1 hover:text-sky-600 transition-colors" title="Zoom In">
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleReset}
              className="p-1 hover:text-amber-700 transition-colors border-l border-slate-300 ml-1 pl-1.5"
              title="Reset View"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Canvas Area */}
      <div className="relative overflow-hidden rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center min-h-[420px] p-2 shadow-inner">
        {viewMode === 'split' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full h-full">
            {/* Expected Image */}
            <div className="flex flex-col items-center">
              <span className="text-[11px] font-bold uppercase text-sky-400 mb-2 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-400"></span> Expected Radar Render
              </span>
              <div className="overflow-hidden rounded-lg border border-slate-800 bg-[#070d18] w-full flex items-center justify-center p-1">
                <img
                  src={expectedUrl}
                  alt="Expected Rendering"
                  style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
                  className="max-h-[380px] object-contain transition-transform duration-100 rounded"
                />
              </div>
            </div>

            {/* Actual Image */}
            <div className="flex flex-col items-center">
              <span className="text-[11px] font-bold uppercase text-amber-400 mb-2 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span> Actual Radar Render
              </span>
              <div className="overflow-hidden rounded-lg border border-slate-800 bg-[#070d18] w-full flex items-center justify-center p-1">
                <img
                  src={actualUrl}
                  alt="Actual Rendering"
                  style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
                  className="max-h-[380px] object-contain transition-transform duration-100 rounded"
                />
              </div>
            </div>
          </div>
        )}

        {viewMode === 'slider' && (
          <div className="relative w-full max-w-[512px] h-[512px] mx-auto overflow-hidden rounded-lg border border-slate-800">
            {/* Background: Actual image */}
            <img
              src={actualUrl}
              alt="Actual"
              style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
              className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
            />

            {/* Foreground: Expected image clipped by sliderPos */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${sliderPos}%` }}
            >
              <img
                src={expectedUrl}
                alt="Expected"
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: 'center center',
                  width: '512px',
                  maxWidth: '512px',
                  height: '512px',
                }}
                className="pointer-events-none select-none"
              />
            </div>

            {/* Slider Divider Line */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-sky-400 shadow-[0_0_10px_#0284c7] cursor-ew-resize z-20"
              style={{ left: `${sliderPos}%` }}
            >
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-sky-500 text-white flex items-center justify-center text-[10px] font-bold shadow-lg">
                ⇄
              </div>
            </div>

            {/* Transparent Drag Range Input */}
            <input
              type="range"
              min="0"
              max="100"
              value={sliderPos}
              onChange={(e) => setSliderPos(Number(e.target.value))}
              className="absolute inset-0 opacity-0 w-full h-full cursor-ew-resize z-30"
            />

            {/* Labels */}
            <span className="absolute top-3 left-3 bg-black/75 px-2 py-1 rounded text-[10px] font-mono text-sky-400 border border-sky-500/30 z-10 font-bold">
              EXPECTED
            </span>
            <span className="absolute top-3 right-3 bg-black/75 px-2 py-1 rounded text-[10px] font-mono text-amber-400 border border-amber-500/30 z-10 font-bold">
              ACTUAL
            </span>
          </div>
        )}

        {viewMode === 'diff' && diffUrl && (
          <div className="flex flex-col items-center max-w-[512px] w-full">
            <span className="text-[11px] font-bold uppercase text-rose-400 mb-2 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-400"></span> False-Color Precipitation Difference Heatmap
            </span>
            <div className="overflow-hidden rounded-lg border border-slate-800 bg-[#070d18] p-1 w-full flex items-center justify-center">
              <img
                src={diffUrl}
                alt="Difference Mask"
                style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
                className="max-h-[460px] object-contain rounded"
              />
            </div>
            {/* Color Legend */}
            <div className="flex flex-wrap items-center justify-center gap-4 mt-3 text-xs bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-[#00dc5a]"></span>
                <span className="text-slate-200">Matching Precipitation</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-[#00beff]"></span>
                <span className="text-slate-200">Under-Precipitation (Missing in Actual)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-[#ff3c3c]"></span>
                <span className="text-slate-200">Over-Precipitation (Ghost in Actual)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-[#ffc81e]"></span>
                <span className="text-slate-200">Intensity Discrepancy</span>
              </div>
            </div>
          </div>
        )}

        {viewMode === 'overlay' && diffUrl && (
          <div className="flex flex-col items-center max-w-[512px] w-full">
            <div className="flex items-center justify-between w-full mb-2">
              <span className="text-xs font-bold uppercase text-amber-400 flex items-center gap-1">
                <Sliders className="w-3.5 h-3.5" /> Difference Overlay on Actual Render
              </span>
              <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                <span>Opacity: {diffOpacity}%</span>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={diffOpacity}
                  onChange={(e) => setDiffOpacity(Number(e.target.value))}
                  className="w-24 accent-sky-400"
                />
              </div>
            </div>

            <div className="relative w-[512px] h-[512px] overflow-hidden rounded-lg border border-slate-800">
              <img
                src={actualUrl}
                alt="Actual base"
                style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
                className="absolute inset-0 w-full h-full object-contain"
              />
              <img
                src={diffUrl}
                alt="Diff overlay"
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: 'center center',
                  opacity: diffOpacity / 100,
                  mixBlendMode: 'screen',
                }}
                className="absolute inset-0 w-full h-full object-contain pointer-events-none"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

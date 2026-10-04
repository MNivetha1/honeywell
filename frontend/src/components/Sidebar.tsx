import React from 'react';
import {
  LayoutDashboard,
  FolderArchive,
  Layers,
  Table,
  Search,
  Settings,
  FileText,
  Info,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { cn } from '../utils/cn';

export type PageId =
  | 'dashboard'
  | 'dataset'
  | 'batch'
  | 'results'
  | 'inspector'
  | 'config'
  | 'reports'
  | 'system';

interface SidebarProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  passCount?: number;
  failCount?: number;
  totalPairs?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  passCount = 0,
  failCount = 0,
  totalPairs = 100,
}) => {
  const navItems: { id: PageId; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'dataset', label: 'Dataset', icon: <FolderArchive className="w-4 h-4" />, badge: `${totalPairs}` },
    { id: 'batch', label: 'Batch Comparison', icon: <Layers className="w-4 h-4" /> },
    { id: 'results', label: 'Results', icon: <Table className="w-4 h-4" /> },
    { id: 'inspector', label: 'Pair Inspector', icon: <Search className="w-4 h-4" /> },
    { id: 'config', label: 'Configuration', icon: <Settings className="w-4 h-4" /> },
    { id: 'reports', label: 'Reports', icon: <FileText className="w-4 h-4" /> },
    { id: 'system', label: 'System Info', icon: <Info className="w-4 h-4" /> },
  ];

  return (
    <aside className="w-64 border-r border-slate-200 bg-white flex flex-col justify-between shrink-0 h-[calc(100vh-4rem)] sticky top-16 select-none shadow-sm">
      {/* Navigation List */}
      <div className="p-3.5 space-y-1">
        <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Validation Modules
        </div>
        {navItems.map((item) => {
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold tracking-wide transition-all duration-150',
                isActive
                  ? 'bg-sky-50 text-sky-700 border border-sky-200 shadow-sm font-extrabold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
              )}
            >
              <div className="flex items-center space-x-3">
                <span className={cn(isActive ? 'text-sky-600' : 'text-slate-400')}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Mini Status Box at bottom of Sidebar */}
      <div className="p-3.5 border border-slate-200 bg-slate-50 m-3 rounded-xl shadow-inner">
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
          Run Telemetry Summary
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2 flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-[11px] font-bold text-emerald-700">PASS</span>
            </div>
            <span className="text-xs font-mono font-black text-emerald-800">{passCount}</span>
          </div>
          <div className="bg-rose-50 border border-rose-200 rounded-lg p-2 flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <XCircle className="w-3.5 h-3.5 text-rose-600" />
              <span className="text-[11px] font-bold text-rose-700">FAIL</span>
            </div>
            <span className="text-xs font-mono font-black text-rose-800">{failCount}</span>
          </div>
        </div>
        <div className="mt-2 text-[10px] text-slate-500 text-center font-mono">
          Threshold: 90% PASS
        </div>
      </div>
    </aside>
  );
};

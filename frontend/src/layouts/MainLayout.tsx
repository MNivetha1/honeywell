import React from 'react';
import { Navbar } from '../components/Navbar';
import { Sidebar, PageId } from '../components/Sidebar';

interface MainLayoutProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  onTriggerBatch: () => void;
  onRefreshData?: () => void;
  isProcessing?: boolean;
  passCount?: number;
  failCount?: number;
  totalPairs?: number;
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  currentPage,
  onNavigate,
  onTriggerBatch,
  onRefreshData,
  isProcessing,
  passCount,
  failCount,
  totalPairs,
  children,
}) => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        onTriggerBatch={onTriggerBatch}
        onRefreshData={onRefreshData}
        isProcessing={isProcessing}
      />

      {/* Body: Sidebar + Main Content */}
      <div className="flex flex-1 relative">
        <Sidebar
          currentPage={currentPage}
          onNavigate={onNavigate}
          passCount={passCount}
          failCount={failCount}
          totalPairs={totalPairs}
        />

        <main className="flex-1 overflow-y-auto pb-12 clean-grid bg-slate-50/50">
          {children}
        </main>
      </div>
    </div>
  );
};

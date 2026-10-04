import React, { useState, useEffect } from 'react';
import { MainLayout } from './layouts/MainLayout';
import { PageId } from './components/Sidebar';
import { DashboardPage } from './pages/DashboardPage';
import { DatasetPage } from './pages/DatasetPage';
import { BatchComparisonPage } from './pages/BatchComparisonPage';
import { ResultsPage } from './pages/ResultsPage';
import { PairInspectorPage } from './pages/PairInspectorPage';
import { ConfigurationPage } from './pages/ConfigurationPage';
import { ReportsPage } from './pages/ReportsPage';
import { SystemInfoPage } from './pages/SystemInfoPage';
import { apiClient } from './api/client';
import { MetricsSummary } from './types';

export const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<PageId>('dashboard');
  const [selectedPairId, setSelectedPairId] = useState<string>('pair_001');
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const fetchGlobalMetrics = async () => {
    try {
      const summary = await apiClient.getMetricsSummary();
      setMetrics(summary);
    } catch (err) {
      console.error('Failed fetching metrics summary:', err);
    }
  };

  useEffect(() => {
    fetchGlobalMetrics();
    const interval = setInterval(fetchGlobalMetrics, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleInspectPair = (pairId: string) => {
    setSelectedPairId(pairId);
    setCurrentPage('inspector');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTriggerQuickBatch = async () => {
    setIsProcessing(true);
    setCurrentPage('batch');
    try {
      await apiClient.triggerBatchCompare();
    } catch (err) {
      console.error('Error starting batch:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <MainLayout
      currentPage={currentPage}
      onNavigate={setCurrentPage}
      onTriggerBatch={handleTriggerQuickBatch}
      onRefreshData={fetchGlobalMetrics}
      isProcessing={isProcessing}
      passCount={metrics?.pass_count}
      failCount={metrics?.fail_count}
      totalPairs={metrics?.total_pairs || 100}
    >
      {currentPage === 'dashboard' && (
        <DashboardPage
          metrics={metrics}
          onInspectPair={handleInspectPair}
          onNavigateToBatch={() => setCurrentPage('batch')}
        />
      )}

      {currentPage === 'dataset' && (
        <DatasetPage
          onInspectPair={handleInspectPair}
          onNavigateToBatch={() => setCurrentPage('batch')}
        />
      )}

      {currentPage === 'batch' && (
        <BatchComparisonPage
          onNavigateToResults={() => {
            fetchGlobalMetrics();
            setCurrentPage('results');
          }}
          onInspectPair={handleInspectPair}
        />
      )}

      {currentPage === 'results' && (
        <ResultsPage onInspectPair={handleInspectPair} />
      )}

      {currentPage === 'inspector' && (
        <PairInspectorPage initialPairId={selectedPairId} />
      )}

      {currentPage === 'config' && (
        <ConfigurationPage onConfigUpdated={fetchGlobalMetrics} />
      )}

      {currentPage === 'reports' && (
        <ReportsPage metrics={metrics} />
      )}

      {currentPage === 'system' && (
        <SystemInfoPage />
      )}
    </MainLayout>
  );
};

export default App;

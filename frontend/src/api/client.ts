import {
  AnalyzerConfig,
  BatchJobStatus,
  ComparisonResult,
  DatasetStatistics,
  HealthStatus,
  ImagePair,
  SinglePairUploadResponse,
  MetricsSummary,
  SystemInfo,
} from '../types';

const API_BASE = '/api';

export const apiClient = {
  // Health & System
  async getHealth(): Promise<HealthStatus> {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('Failed to fetch health status');
    return res.json();
  },

  async getSystemInfo(): Promise<SystemInfo> {
    const res = await fetch(`${API_BASE}/system/info`);
    if (!res.ok) throw new Error('Failed to fetch system info');
    return res.json();
  },

  // Dataset
  async getDatasetStats(): Promise<DatasetStatistics> {
    const res = await fetch(`${API_BASE}/dataset/statistics`);
    if (!res.ok) throw new Error('Failed to fetch dataset statistics');
    return res.json();
  },

  async getDatasetPairs(params?: {
    search?: string;
    category_id?: number;
    status?: string;
  }): Promise<ImagePair[]> {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.category_id) query.append('category_id', params.category_id.toString());
    if (params?.status) query.append('status', params.status);

    const res = await fetch(`${API_BASE}/dataset/pairs?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch dataset pairs');
    return res.json();
  },

  async getPairDetail(pairId: string): Promise<ImagePair> {
    const res = await fetch(`${API_BASE}/dataset/pairs/${pairId}`);
    if (!res.ok) throw new Error(`Failed to fetch pair ${pairId}`);
    return res.json();
  },

  async uploadDatasetZip(file: File): Promise<{ success: boolean; message: string; discovered_pairs: number }> {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE}/dataset/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(err.detail || 'Failed to upload dataset ZIP');
    }
    return res.json();
  },

  async uploadSinglePair(params: {
    expectedFile: File;
    actualFile: File;
    pairId?: string;
    categoryId?: number;
    categoryName?: string;
    groundTruthLabel?: 'PASS' | 'FAIL';
    description?: string;
    autoCompare?: boolean;
  }): Promise<SinglePairUploadResponse> {
    const formData = new FormData();
    formData.append('expected_file', params.expectedFile);
    formData.append('actual_file', params.actualFile);
    if (params.pairId) formData.append('pair_id', params.pairId);
    if (params.categoryId !== undefined) formData.append('category_id', params.categoryId.toString());
    if (params.categoryName) formData.append('category_name', params.categoryName);
    if (params.groundTruthLabel) formData.append('ground_truth_label', params.groundTruthLabel);
    if (params.description) formData.append('description', params.description);
    if (params.autoCompare !== undefined) formData.append('auto_compare', params.autoCompare ? 'true' : 'false');

    const res = await fetch(`${API_BASE}/dataset/upload-pair`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(err.detail || 'Failed to upload single image pair');
    }
    return res.json();
  },

  async deletePair(pairId: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/dataset/pairs/${pairId}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Delete failed' }));
      throw new Error(err.detail || `Failed to delete pair ${pairId}`);
    }
    return res.json();
  },

  // Comparison
  async runSingleCompare(pairId: string, overrideThreshold?: number): Promise<ComparisonResult> {
    const query = overrideThreshold ? `?override_threshold=${overrideThreshold}` : '';
    const res = await fetch(`${API_BASE}/compare/${pairId}${query}`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error(`Comparison failed for ${pairId}`);
    return res.json();
  },

  async triggerBatchCompare(payload?: {
    pair_ids?: string[];
    category_id?: number;
    override_threshold?: number;
  }): Promise<{ success: boolean; job_id: string; message: string }> {
    const res = await fetch(`${API_BASE}/compare/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {}),
    });
    if (!res.ok) throw new Error('Failed to start batch comparison');
    return res.json();
  },

  async getBatchJobStatus(jobId: string): Promise<BatchJobStatus> {
    const res = await fetch(`${API_BASE}/compare/job/${jobId}`);
    if (!res.ok) throw new Error(`Failed to get job status for ${jobId}`);
    return res.json();
  },

  // Results & Dashboard Metrics
  async getResultsTable(params?: {
    search?: string;
    result?: string;
    min_score?: number;
    max_score?: number;
    sort_by?: string;
    sort_order?: string;
    page?: number;
    page_size?: number;
  }): Promise<{ total: number; page: number; page_size: number; total_pages: number; items: ComparisonResult[] }> {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.result) query.append('result', params.result);
    if (params?.min_score !== undefined) query.append('min_score', params.min_score.toString());
    if (params?.max_score !== undefined) query.append('max_score', params.max_score.toString());
    if (params?.sort_by) query.append('sort_by', params.sort_by);
    if (params?.sort_order) query.append('sort_order', params.sort_order);
    if (params?.page) query.append('page', params.page.toString());
    if (params?.page_size) query.append('page_size', params.page_size.toString());

    const res = await fetch(`${API_BASE}/results?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch results table');
    return res.json();
  },

  async getSingleResult(pairId: string): Promise<ComparisonResult> {
    const res = await fetch(`${API_BASE}/results/${pairId}`);
    if (!res.ok) throw new Error(`Failed to fetch result for ${pairId}`);
    return res.json();
  },

  async getMetricsSummary(): Promise<MetricsSummary> {
    const res = await fetch(`${API_BASE}/metrics/summary`);
    if (!res.ok) throw new Error('Failed to fetch metrics summary');
    return res.json();
  },

  // Configuration
  async getConfig(): Promise<AnalyzerConfig> {
    const res = await fetch(`${API_BASE}/config`);
    if (!res.ok) throw new Error('Failed to fetch configuration');
    return res.json();
  },

  async updateConfig(config: AnalyzerConfig): Promise<AnalyzerConfig> {
    const res = await fetch(`${API_BASE}/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Update configuration failed' }));
      throw new Error(err.detail || 'Failed to update configuration');
    }
    return res.json();
  },

  async resetConfig(): Promise<AnalyzerConfig> {
    const res = await fetch(`${API_BASE}/config/reset`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to reset configuration');
    return res.json();
  },

  // Reports
  getExcelReportUrl(): string {
    return `${API_BASE}/reports/excel`;
  },

  getJsonReportUrl(): string {
    return `${API_BASE}/reports/json`;
  },

  async getReportSummary(): Promise<any> {
    const res = await fetch(`${API_BASE}/reports/summary`);
    if (!res.ok) throw new Error('Failed to fetch report summary');
    return res.json();
  },
};

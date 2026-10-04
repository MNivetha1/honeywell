export interface MetricBreakdown {
  iou: number;
  pixel_agreement: number;
  area_similarity: number;
  intensity_agreement: number;
  spatial_similarity: number;
}

export interface ComparisonResult {
  id?: number;
  pair_id: string;
  similarity_score: number;
  threshold: number;
  result: 'PASS' | 'FAIL';
  margin: number;
  metrics: MetricBreakdown;
  shift_dx: number;
  shift_dy: number;
  constraints_applied: {
    text_excluded?: boolean;
    icons_excluded?: boolean;
    arc_lines_excluded?: boolean;
    legend_excluded?: boolean;
    [key: string]: boolean | undefined;
  };
  expected_image_url: string;
  actual_image_url: string;
  expected_mask_url?: string;
  actual_mask_url?: string;
  diff_mask_url?: string;
  exclusion_mask_url?: string;
  processing_time_ms: number;
  category_name?: string;
  ground_truth_label?: string;
  description?: string;
  created_at?: string;
}

export interface ImagePair {
  id: number;
  pair_id: string;
  expected_image: string;
  actual_image: string;
  status: 'Matched' | 'Missing Expected' | 'Missing Actual' | 'Invalid Image' | 'Ready';
  category_id?: number;
  category_name?: string;
  ground_truth_label?: 'PASS' | 'FAIL';
  description?: string;
  created_at?: string;
  latest_result?: 'PASS' | 'FAIL';
  latest_similarity?: number;
}

export interface SinglePairUploadResponse {
  success: boolean;
  message: string;
  pair_id: string;
  pair: ImagePair;
  comparison_result?: ComparisonResult;
}

export interface DatasetStatistics {
  total_expected: number;
  total_actual: number;
  matched_pairs: number;
  missing_pairs: number;
  invalid_files: number;
  ready_pairs: number;
  categories_count: number;
  pass_ground_truth: number;
  fail_ground_truth: number;
}

export interface ImageProcessingConfig {
  resize: boolean;
  width: number;
  height: number;
  blur: number;
  morphology: boolean;
}

export interface FeatureExclusionConfig {
  exclude_text: boolean;
  exclude_icons: boolean;
  exclude_arc_lines: boolean;
  exclude_legend: boolean;
}

export interface AlignmentConfig {
  alignment_enabled: boolean;
  max_shift_pixels: number;
}

export interface ScoringConfig {
  overlap_weight: number;
  intensity_weight: number;
  area_weight: number;
  spatial_weight: number;
}

export interface DecisionConfig {
  threshold_percent: number;
}

export interface AnalyzerConfig {
  image_processing: ImageProcessingConfig;
  feature_exclusion: FeatureExclusionConfig;
  alignment: AlignmentConfig;
  scoring: ScoringConfig;
  decision: DecisionConfig;
}

export interface BatchJobStatus {
  job_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  total_items: number;
  processed_items: number;
  progress_percent: number;
  pass_count: number;
  fail_count: number;
  current_pair_id?: string;
  average_similarity: number;
  elapsed_seconds: number;
  estimated_remaining_seconds?: number;
  started_at?: string;
  completed_at?: string;
  error?: string;
}

export interface ScoreDistributionBin {
  range: string;
  min: number;
  max: number;
  count: number;
}

export interface CategoryResult {
  category: string;
  pass: number;
  fail: number;
  total: number;
  pass_rate: number;
  avg_score: number;
}

export interface ConfusionMatrix {
  total_evaluated: number;
  true_pass: number;
  true_fail: number;
  false_pass: number;
  false_fail: number;
  accuracy: number;
  pass_precision: number;
  fail_precision: number;
}

export interface MetricsSummary {
  total_pairs: number;
  processed_pairs: number;
  pass_count: number;
  fail_count: number;
  pass_rate: number;
  fail_rate: number;
  average_similarity: number;
  average_processing_time_ms: number;
  threshold: number;
  score_distribution: ScoreDistributionBin[];
  category_results: CategoryResult[];
  recent_comparisons: ComparisonResult[];
  confusion_matrix: ConfusionMatrix;
}

export interface SystemInfo {
  application_name: string;
  application_version: string;
  python_version: string;
  opencv_version: string;
  numpy_version: string;
  scikit_image_version: string;
  fastapi_version: string;
  database_path: string;
  database_status: string;
  dataset_pairs_count: number;
  comparisons_count: number;
  radar_adapter_ready: boolean;
  system_time: string;
}

export interface HealthStatus {
  status: string;
  backend_connected: boolean;
  database_connected: boolean;
  cv_engine_ready: boolean;
  version: string;
  timestamp: string;
}

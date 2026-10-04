"""
Pydantic schemas for Comparisons, Metrics, and Batch execution
"""

from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class MetricBreakdown(BaseModel):
    iou: float
    pixel_agreement: float
    area_similarity: float
    intensity_agreement: float
    spatial_similarity: float

class ComparisonResult(BaseModel):
    id: Optional[int] = None
    pair_id: str
    similarity_score: float
    threshold: float
    result: str  # PASS / FAIL
    margin: float
    metrics: MetricBreakdown
    shift_dx: int = 0
    shift_dy: int = 0
    constraints_applied: Dict[str, bool] = {}
    expected_image_url: str
    actual_image_url: str
    expected_mask_url: Optional[str] = None
    actual_mask_url: Optional[str] = None
    diff_mask_url: Optional[str] = None
    exclusion_mask_url: Optional[str] = None
    processing_time_ms: float
    category_name: Optional[str] = None
    ground_truth_label: Optional[str] = None
    description: Optional[str] = None
    created_at: Optional[datetime] = None

class BatchComparisonRequest(BaseModel):
    pair_ids: Optional[List[str]] = None
    category_id: Optional[int] = None
    override_threshold: Optional[float] = None

class BatchJobStatusResponse(BaseModel):
    job_id: str
    status: str  # pending, running, completed, failed
    total_items: int
    processed_items: int
    progress_percent: float
    pass_count: int
    fail_count: int
    current_pair_id: Optional[str] = None
    average_similarity: float
    elapsed_seconds: float
    estimated_remaining_seconds: Optional[float] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error: Optional[str] = None

class MetricsSummaryResponse(BaseModel):
    total_pairs: int
    processed_pairs: int
    pass_count: int
    fail_count: int
    pass_rate: float
    fail_rate: float
    average_similarity: float
    average_processing_time_ms: float
    threshold: float
    score_distribution: List[Dict[str, Any]]
    category_results: List[Dict[str, Any]]
    recent_comparisons: List[ComparisonResult]
    confusion_matrix: Dict[str, Any]  # Evaluation against ground-truth

"""
Pydantic schemas for Dataset and Image Pairs
"""

from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

class ImagePairResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    pair_id: str
    expected_image: str
    actual_image: str
    status: str
    category_id: Optional[int] = None
    category_name: Optional[str] = None
    ground_truth_label: Optional[str] = None
    description: Optional[str] = None
    created_at: Optional[datetime] = None
    latest_result: Optional[str] = None
    latest_similarity: Optional[float] = None

class DatasetStatistics(BaseModel):
    total_expected: int
    total_actual: int
    matched_pairs: int
    missing_pairs: int
    invalid_files: int
    ready_pairs: int
    categories_count: int
    pass_ground_truth: int
    fail_ground_truth: int

from .comparison import ComparisonResult

class DatasetUploadResponse(BaseModel):
    success: bool
    message: str
    discovered_pairs: int
    new_pairs_added: int

class SinglePairUploadResponse(BaseModel):
    success: bool
    message: str
    pair_id: str
    pair: ImagePairResponse
    comparison_result: Optional[ComparisonResult] = None

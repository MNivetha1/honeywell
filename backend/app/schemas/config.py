"""
Pydantic schemas for System Configuration
"""

from pydantic import BaseModel, Field, model_validator
from typing import Optional

class ImageProcessingConfig(BaseModel):
    resize: bool = Field(True, description="Whether to normalize/resize input images")
    width: int = Field(512, ge=64, le=4096, description="Target normalized width")
    height: int = Field(512, ge=64, le=4096, description="Target normalized height")
    blur: float = Field(1.2, ge=0.0, le=10.0, description="Gaussian blur sigma for noise reduction")
    morphology: bool = Field(True, description="Apply morphological opening/closing")

class FeatureExclusionConfig(BaseModel):
    exclude_text: bool = Field(True, description="Ignore annotations, text labels, and timestamps")
    exclude_icons: bool = Field(True, description="Ignore weather icons, aircraft, waypoints")
    exclude_arc_lines: bool = Field(True, description="Ignore radar range arcs and radial azimuth lines")
    exclude_legend: bool = Field(True, description="Ignore color bar and legend boxes")

class AlignmentConfig(BaseModel):
    alignment_enabled: bool = Field(True, description="Enable translation alignment correction")
    max_shift_pixels: int = Field(8, ge=0, le=50, description="Maximum translation correction in pixels")

class ScoringConfig(BaseModel):
    overlap_weight: float = Field(40.0, ge=0.0, le=100.0, description="Weight for precipitation mask IoU overlap (%)")
    intensity_weight: float = Field(30.0, ge=0.0, le=100.0, description="Weight for intensity class agreement (%)")
    area_weight: float = Field(20.0, ge=0.0, le=100.0, description="Weight for precipitation area similarity (%)")
    spatial_weight: float = Field(10.0, ge=0.0, le=100.0, description="Weight for spatial distribution similarity (%)")

    @model_validator(mode="after")
    def validate_sum_100(self):
        total = round(self.overlap_weight + self.intensity_weight + self.area_weight + self.spatial_weight, 2)
        if total != 100.0:
            raise ValueError(f"Scoring weights must sum to exactly 100.0% (Current total: {total}%)")
        return self

class DecisionConfig(BaseModel):
    threshold_percent: float = Field(90.0, ge=0.0, le=100.0, description="PASS/FAIL decision threshold (%)")

class AnalyzerConfig(BaseModel):
    image_processing: ImageProcessingConfig = Field(default_factory=ImageProcessingConfig)
    feature_exclusion: FeatureExclusionConfig = Field(default_factory=FeatureExclusionConfig)
    alignment: AlignmentConfig = Field(default_factory=AlignmentConfig)
    scoring: ScoringConfig = Field(default_factory=ScoringConfig)
    decision: DecisionConfig = Field(default_factory=DecisionConfig)

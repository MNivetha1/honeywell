"""
SQLAlchemy Database Models for Precipitation Equivalence Analyzer
"""

from datetime import datetime
from sqlalchemy import Column, Integer, Float, String, Boolean, DateTime, Text, JSON, ForeignKey
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

class DatasetModel(Base):
    __tablename__ = "datasets"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), default="Default 100-Pair Synthetic Dataset", index=True)
    description = Column(Text, nullable=True)
    total_pairs = Column(Integer, default=0)
    matched_pairs = Column(Integer, default=0)
    missing_pairs = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    image_pairs = relationship("ImagePairModel", back_populates="dataset", cascade="all, delete-orphan")


class ImagePairModel(Base):
    __tablename__ = "image_pairs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), default=1, index=True)
    pair_id = Column(String(50), unique=True, index=True, nullable=False)
    expected_image = Column(String(255), nullable=False)
    actual_image = Column(String(255), nullable=False)
    status = Column(String(50), default="Matched")  # Matched, Missing Expected, Missing Actual, Ready
    category_id = Column(Integer, nullable=True)
    category_name = Column(String(100), nullable=True)
    ground_truth_label = Column(String(10), nullable=True)  # PASS, FAIL (Evaluation reference only)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    dataset = relationship("DatasetModel", back_populates="image_pairs")
    comparisons = relationship("ComparisonModel", back_populates="image_pair", cascade="all, delete-orphan")


class ComparisonModel(Base):
    __tablename__ = "comparisons"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    pair_id = Column(String(50), ForeignKey("image_pairs.pair_id"), index=True, nullable=False)
    similarity_score = Column(Float, nullable=False)
    threshold = Column(Float, nullable=False, default=90.0)
    result = Column(String(10), nullable=False)  # PASS / FAIL
    margin = Column(Float, nullable=False)  # score - threshold
    
    # Detailed Metrics
    iou = Column(Float, nullable=False)
    pixel_agreement = Column(Float, nullable=False)
    area_similarity = Column(Float, nullable=False)
    intensity_agreement = Column(Float, nullable=False)
    spatial_similarity = Column(Float, nullable=False)
    
    # Alignment & Exclusions info
    shift_dx = Column(Integer, default=0)
    shift_dy = Column(Integer, default=0)
    constraints_applied = Column(JSON, nullable=True)
    
    # Generated Visual Mask paths / URLs
    expected_mask_path = Column(String(255), nullable=True)
    actual_mask_path = Column(String(255), nullable=True)
    diff_mask_path = Column(String(255), nullable=True)
    exclusion_mask_path = Column(String(255), nullable=True)

    processing_time_ms = Column(Float, default=0.0)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    image_pair = relationship("ImagePairModel", back_populates="comparisons")


class ConfigurationModel(Base):
    __tablename__ = "configurations"

    id = Column(Integer, primary_key=True, default=1)
    name = Column(String(100), default="active_config")
    
    # Image Preprocessing
    resize = Column(Boolean, default=True)
    width = Column(Integer, default=512)
    height = Column(Integer, default=512)
    blur = Column(Float, default=1.2)
    morphology = Column(Boolean, default=True)

    # Feature Exclusions
    exclude_text = Column(Boolean, default=True)
    exclude_icons = Column(Boolean, default=True)
    exclude_arc_lines = Column(Boolean, default=True)
    exclude_legend = Column(Boolean, default=True)

    # Alignment
    alignment_enabled = Column(Boolean, default=True)
    max_shift_pixels = Column(Integer, default=8)

    # Scoring Weights (Must total 100)
    overlap_weight = Column(Float, default=40.0)
    intensity_weight = Column(Float, default=30.0)
    area_weight = Column(Float, default=20.0)
    spatial_weight = Column(Float, default=10.0)

    # Decision Threshold
    threshold_percent = Column(Float, default=90.0)

    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class BatchJobModel(Base):
    __tablename__ = "batch_jobs"

    id = Column(String(50), primary_key=True, index=True)
    status = Column(String(50), default="pending")  # pending, running, completed, failed
    total_items = Column(Integer, default=0)
    processed_items = Column(Integer, default=0)
    pass_count = Column(Integer, default=0)
    fail_count = Column(Integer, default=0)
    current_pair_id = Column(String(50), nullable=True)
    average_similarity = Column(Float, default=0.0)
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    error = Column(Text, nullable=True)

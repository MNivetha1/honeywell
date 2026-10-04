"""
Configuration Service
Manages system configuration loading, persistence, validation, and resets in SQLite.
"""

from sqlalchemy.orm import Session
from ..database.models import ConfigurationModel
from ..schemas.config import (
    AnalyzerConfig,
    ImageProcessingConfig,
    FeatureExclusionConfig,
    AlignmentConfig,
    ScoringConfig,
    DecisionConfig
)

DEFAULT_CONFIG_DICT = {
    "image_processing": {
        "resize": True,
        "width": 512,
        "height": 512,
        "blur": 1.2,
        "morphology": True
    },
    "feature_exclusion": {
        "exclude_text": True,
        "exclude_icons": True,
        "exclude_arc_lines": True,
        "exclude_legend": True
    },
    "alignment": {
        "alignment_enabled": True,
        "max_shift_pixels": 8
    },
    "scoring": {
        "overlap_weight": 40.0,
        "intensity_weight": 30.0,
        "area_weight": 20.0,
        "spatial_weight": 10.0
    },
    "decision": {
        "threshold_percent": 90.0
    }
}

class ConfigService:
    @staticmethod
    def get_config(db: Session) -> AnalyzerConfig:
        """Loads the active configuration from database or returns default."""
        cfg_model = db.query(ConfigurationModel).filter(ConfigurationModel.id == 1).first()
        if not cfg_model:
            return AnalyzerConfig(**DEFAULT_CONFIG_DICT)

        return AnalyzerConfig(
            image_processing=ImageProcessingConfig(
                resize=cfg_model.resize,
                width=cfg_model.width,
                height=cfg_model.height,
                blur=cfg_model.blur,
                morphology=cfg_model.morphology
            ),
            feature_exclusion=FeatureExclusionConfig(
                exclude_text=cfg_model.exclude_text,
                exclude_icons=cfg_model.exclude_icons,
                exclude_arc_lines=cfg_model.exclude_arc_lines,
                exclude_legend=cfg_model.exclude_legend
            ),
            alignment=AlignmentConfig(
                alignment_enabled=cfg_model.alignment_enabled,
                max_shift_pixels=cfg_model.max_shift_pixels
            ),
            scoring=ScoringConfig(
                overlap_weight=cfg_model.overlap_weight,
                intensity_weight=cfg_model.intensity_weight,
                area_weight=cfg_model.area_weight,
                spatial_weight=cfg_model.spatial_weight
            ),
            decision=DecisionConfig(
                threshold_percent=cfg_model.threshold_percent
            )
        )

    @staticmethod
    def update_config(db: Session, new_config: AnalyzerConfig) -> AnalyzerConfig:
        """Updates and persists active configuration in database."""
        cfg_model = db.query(ConfigurationModel).filter(ConfigurationModel.id == 1).first()
        if not cfg_model:
            cfg_model = ConfigurationModel(id=1)
            db.add(cfg_model)

        cfg_model.resize = new_config.image_processing.resize
        cfg_model.width = new_config.image_processing.width
        cfg_model.height = new_config.image_processing.height
        cfg_model.blur = new_config.image_processing.blur
        cfg_model.morphology = new_config.image_processing.morphology

        cfg_model.exclude_text = new_config.feature_exclusion.exclude_text
        cfg_model.exclude_icons = new_config.feature_exclusion.exclude_icons
        cfg_model.exclude_arc_lines = new_config.feature_exclusion.exclude_arc_lines
        cfg_model.exclude_legend = new_config.feature_exclusion.exclude_legend

        cfg_model.alignment_enabled = new_config.alignment.alignment_enabled
        cfg_model.max_shift_pixels = new_config.alignment.max_shift_pixels

        cfg_model.overlap_weight = new_config.scoring.overlap_weight
        cfg_model.intensity_weight = new_config.scoring.intensity_weight
        cfg_model.area_weight = new_config.scoring.area_weight
        cfg_model.spatial_weight = new_config.scoring.spatial_weight

        cfg_model.threshold_percent = new_config.decision.threshold_percent

        db.commit()
        db.refresh(cfg_model)
        return ConfigService.get_config(db)

    @staticmethod
    def reset_config(db: Session) -> AnalyzerConfig:
        """Resets configuration to factory defaults."""
        default_cfg = AnalyzerConfig(**DEFAULT_CONFIG_DICT)
        return ConfigService.update_config(db, default_cfg)

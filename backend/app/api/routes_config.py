"""
System Configuration Endpoints
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database.session import get_db
from ..services.config_service import ConfigService
from ..schemas.config import AnalyzerConfig

router = APIRouter(prefix="/config", tags=["Configuration"])

@router.get("", response_model=AnalyzerConfig)
def get_current_configuration(db: Session = Depends(get_db)):
    """Fetches currently active CV and decision parameters."""
    return ConfigService.get_config(db)

@router.put("", response_model=AnalyzerConfig)
def update_configuration(new_config: AnalyzerConfig, db: Session = Depends(get_db)):
    """Saves updated thresholds, exclusion flags, and scoring weights."""
    return ConfigService.update_config(db, new_config)

@router.post("/reset", response_model=AnalyzerConfig)
def reset_configuration(db: Session = Depends(get_db)):
    """Restores all system settings to default parameters."""
    return ConfigService.reset_config(db)

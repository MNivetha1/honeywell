"""
Comparison & Equivalence Analysis Endpoints
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from ..database.session import get_db
from ..database.models import ImagePairModel, ComparisonModel
from ..services.comparison_service import ComparisonService
from ..schemas.comparison import (
    ComparisonResult,
    BatchComparisonRequest,
    BatchJobStatusResponse,
    MetricsSummaryResponse
)

router = APIRouter(tags=["Comparison Engine"])

@router.post("/compare/batch", response_model=dict)
def trigger_batch_comparison(
    request: BatchComparisonRequest = BatchComparisonRequest(),
    db: Session = Depends(get_db)
):
    """Spawns asynchronous background batch comparison job."""
    job_id = ComparisonService.start_batch_comparison(
        pair_ids=request.pair_ids,
        category_id=request.category_id,
        override_threshold=request.override_threshold
    )
    return {"success": True, "job_id": job_id, "message": "Batch comparison started in background."}

@router.get("/compare/job/{job_id}", response_model=BatchJobStatusResponse)
def get_batch_job_status(job_id: str):
    """Polls real-time progress and telemetry of a running batch comparison job."""
    try:
        return ComparisonService.get_job_status(job_id)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/compare/{pair_id}", response_model=ComparisonResult)
def compare_single_pair(
    pair_id: str,
    override_threshold: Optional[float] = Query(None, description="Optional override threshold"),
    db: Session = Depends(get_db)
):
    """Runs functional equivalence CV comparison on a specific image pair."""
    try:
        return ComparisonService.compare_single_pair(db, pair_id, override_threshold)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Comparison execution error: {str(e)}")

@router.get("/results")
def list_comparison_results(
    search: Optional[str] = Query(None, description="Search pair ID"),
    result: Optional[str] = Query(None, description="Filter PASS or FAIL"),
    min_score: Optional[float] = Query(None, description="Minimum similarity score"),
    max_score: Optional[float] = Query(None, description="Maximum similarity score"),
    sort_by: str = Query("id", description="Sort field"),
    sort_order: str = Query("asc", description="Sort direction (asc/desc)"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Retrieves paginated, filterable comparison results table."""
    return ComparisonService.list_comparison_results(
        db, search, result, min_score, max_score, sort_by, sort_order, page, page_size
    )

@router.get("/results/{pair_id}", response_model=ComparisonResult)
def get_single_comparison_result(pair_id: str, db: Session = Depends(get_db)):
    """Fetches full diagnostic breakdown for Pair Inspector."""
    comp = db.query(ComparisonModel).filter(ComparisonModel.pair_id == pair_id).order_by(ComparisonModel.id.desc()).first()
    if not comp:
        # Auto-run if not yet analyzed
        try:
            return ComparisonService.compare_single_pair(db, pair_id)
        except Exception as e:
            raise HTTPException(status_code=404, detail=f"Result for {pair_id} not found and failed to run: {str(e)}")

    pair = db.query(ImagePairModel).filter(ImagePairModel.pair_id == pair_id).first()
    return ComparisonService._format_comparison_result(comp, pair)

@router.get("/metrics/summary", response_model=MetricsSummaryResponse)
def get_metrics_summary(db: Session = Depends(get_db)):
    """Computes comprehensive dashboard metrics, distributions, and confusion matrices."""
    return ComparisonService.get_metrics_summary(db)

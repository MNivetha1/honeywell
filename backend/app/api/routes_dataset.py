"""
Dataset Management Endpoints
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Query
from sqlalchemy.orm import Session
from ..database.session import get_db
from ..services.dataset_service import DatasetService, SUPPORTED_EXTENSIONS
from ..services.comparison_service import ComparisonService
from ..schemas.dataset import DatasetStatistics, ImagePairResponse, DatasetUploadResponse, SinglePairUploadResponse

router = APIRouter(prefix="/dataset", tags=["Dataset Management"])

@router.get("/statistics", response_model=DatasetStatistics)
def get_dataset_statistics(db: Session = Depends(get_db)):
    """Returns dataset summary metrics and pairing counts."""
    return DatasetService.get_statistics(db)

@router.get("/pairs", response_model=List[ImagePairResponse])
def list_dataset_pairs(
    search: Optional[str] = Query(None, description="Search by pair ID"),
    category_id: Optional[int] = Query(None, description="Filter by category ID"),
    status: Optional[str] = Query(None, description="Filter by status (Matched, Missing)"),
    db: Session = Depends(get_db)
):
    """Lists all image pairs in the dataset with pairing status."""
    DatasetService.sync_dataset_to_db(db)
    return DatasetService.list_pairs(db, search, category_id, status)

@router.get("/pairs/{pair_id}", response_model=ImagePairResponse)
def get_pair_detail(pair_id: str, db: Session = Depends(get_db)):
    """Retrieves single pair metadata and image paths."""
    try:
        return DatasetService.get_pair_by_id(db, pair_id)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.delete("/pairs/{pair_id}")
def delete_image_pair(pair_id: str, db: Session = Depends(get_db)):
    """Deletes an image pair, diagnostic masks, and comparison results."""
    success = DatasetService.delete_pair(db, pair_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Image pair '{pair_id}' not found.")
    return {"success": True, "message": f"Pair '{pair_id}' deleted successfully."}

@router.post("/upload", response_model=DatasetUploadResponse)
async def upload_dataset_archive(
    file: UploadFile = File(..., description="ZIP archive with expected/ and actual/ folders"),
    db: Session = Depends(get_db)
):
    """Uploads a complete dataset ZIP or batch archive and automatically maps pairs."""
    if not file.filename.lower().endswith(".zip"):
        raise HTTPException(status_code=400, detail="Only .zip archive datasets are supported currently.")

    contents = await file.read()
    try:
        res = DatasetService.handle_zip_upload(contents, db)
        return DatasetUploadResponse(**res)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed processing dataset upload: {str(e)}")

@router.post("/upload-pair", response_model=SinglePairUploadResponse)
async def upload_single_pair(
    expected_file: UploadFile = File(..., description="Expected radar reference image"),
    actual_file: UploadFile = File(..., description="Actual radar candidate image"),
    pair_id: Optional[str] = Form(None, description="Optional custom pair identifier (e.g. pair_101)"),
    category_id: Optional[int] = Form(None, description="Optional variation category ID (1-10)"),
    category_name: Optional[str] = Form(None, description="Optional custom category name"),
    ground_truth_label: Optional[str] = Form(None, description="Ground truth label: PASS or FAIL"),
    description: Optional[str] = Form(None, description="Optional pair description/notes"),
    auto_compare: bool = Form(True, description="Whether to automatically run CV comparison immediately"),
    db: Session = Depends(get_db)
):
    """
    Uploads a single pair (Expected Image + Actual Candidate Image).
    Optionally runs functional equivalence CV comparison immediately and returns results.
    """
    import os
    exp_ext = os.path.splitext(expected_file.filename or "")[1].lower()
    act_ext = os.path.splitext(actual_file.filename or "")[1].lower()

    if exp_ext not in SUPPORTED_EXTENSIONS or act_ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported image format. Allowed formats: {', '.join(sorted(SUPPORTED_EXTENSIONS))}"
        )

    exp_bytes = await expected_file.read()
    act_bytes = await actual_file.read()

    if not exp_bytes or len(exp_bytes) == 0:
        raise HTTPException(status_code=400, detail="Expected image file is empty.")
    if not act_bytes or len(act_bytes) == 0:
        raise HTTPException(status_code=400, detail="Actual image file is empty.")

    try:
        pair_info = DatasetService.handle_single_pair_upload(
            expected_bytes=exp_bytes,
            expected_filename=expected_file.filename or "expected.png",
            actual_bytes=act_bytes,
            actual_filename=actual_file.filename or "actual.png",
            pair_id=pair_id,
            category_id=category_id,
            category_name=category_name,
            ground_truth_label=ground_truth_label,
            description=description,
            db=db
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed saving image pair: {str(e)}")

    target_pid = pair_info["pair_id"]
    comp_result = None

    if auto_compare:
        try:
            comp_result = ComparisonService.compare_single_pair(db, target_pid)
            # Refresh pair_info to include latest comparison
            pair_info = DatasetService.get_pair_by_id(db, target_pid)
        except Exception as e:
            print(f"Warning running auto-comparison on {target_pid}: {e}")

    return SinglePairUploadResponse(
        success=True,
        message=f"Pair '{target_pid}' uploaded and registered successfully." + (" Analyzed successfully." if comp_result else ""),
        pair_id=target_pid,
        pair=ImagePairResponse(**pair_info),
        comparison_result=comp_result
    )


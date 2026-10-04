"""
Report Generation Endpoints (JSON and Excel)
"""

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
from ..database.session import get_db
from ..services.report_service import ReportService

router = APIRouter(prefix="/reports", tags=["Reports & Export"])

@router.get("/json")
def download_json_report(db: Session = Depends(get_db)):
    """Downloads complete validation run in JSON format."""
    return ReportService.generate_json_report(db)

@router.get("/excel")
def download_excel_report(db: Session = Depends(get_db)):
    """Downloads formatted multi-sheet Excel spreadsheet with summary and detail tabs."""
    excel_bytes = ReportService.generate_excel_report_bytes(db)
    
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": "attachment; filename=precipitation_equivalence_report.xlsx"
        }
    )

@router.get("/summary")
def get_report_summary(db: Session = Depends(get_db)):
    """Provides quick executive summary data for the Reports page."""
    json_rep = ReportService.generate_json_report(db)
    return json_rep["summary"]

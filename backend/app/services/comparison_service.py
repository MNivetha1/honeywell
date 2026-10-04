"""
Comparison Service
Coordinates single and batch comparison jobs, progress tracking, persistence, and dashboard metrics.
"""

import os
import time
import uuid
import threading
from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from ..database.session import SessionLocal
from ..database.models import ImagePairModel, ComparisonModel, BatchJobModel
from ..cv.comparison_engine import ComparisonEngine
from .config_service import ConfigService
from ..schemas.comparison import ComparisonResult, MetricBreakdown, BatchJobStatusResponse, MetricsSummaryResponse

# Global in-memory job tracker for immediate live progress polling
ACTIVE_JOBS: Dict[str, Dict[str, Any]] = {}

class ComparisonService:
    DATA_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../data"))
    MASKS_DIR = os.path.join(DATA_ROOT, "masks")

    @classmethod
    def compare_single_pair(
        cls,
        db: Session,
        pair_id: str,
        override_threshold: Optional[float] = None
    ) -> ComparisonResult:
        """Executes functional equivalence comparison for a single pair."""
        pair = db.query(ImagePairModel).filter(ImagePairModel.pair_id == pair_id).first()
        if not pair:
            raise FileNotFoundError(f"Image pair '{pair_id}' not found.")

        expected_full_path = os.path.join(cls.DATA_ROOT, pair.expected_image)
        actual_full_path = os.path.join(cls.DATA_ROOT, pair.actual_image)

        if not os.path.exists(expected_full_path):
            raise FileNotFoundError(f"Expected image not found on disk: {expected_full_path}")
        if not os.path.exists(actual_full_path):
            raise FileNotFoundError(f"Actual image not found on disk: {actual_full_path}")

        # Fetch active configuration
        config_obj = ConfigService.get_config(db)
        config_dict = config_obj.model_dump()
        if override_threshold is not None:
            config_dict["decision"]["threshold_percent"] = override_threshold

        # Run CV engine
        res = ComparisonEngine.compare_image_pair(
            expected_path=expected_full_path,
            actual_path=actual_full_path,
            config=config_dict,
            output_masks_dir=cls.MASKS_DIR,
            pair_id=pair_id
        )

        # Upsert or insert comparison record
        comp_record = db.query(ComparisonModel).filter(ComparisonModel.pair_id == pair_id).first()
        if not comp_record:
            comp_record = ComparisonModel(pair_id=pair_id)
            db.add(comp_record)

        comp_record.similarity_score = res["similarity_score"]
        comp_record.threshold = res["threshold"]
        comp_record.result = res["result"]
        comp_record.margin = res["margin"]
        comp_record.iou = res["metrics"]["iou"]
        comp_record.pixel_agreement = res["metrics"]["pixel_agreement"]
        comp_record.area_similarity = res["metrics"]["area_similarity"]
        comp_record.intensity_agreement = res["metrics"]["intensity_agreement"]
        comp_record.spatial_similarity = res["metrics"]["spatial_similarity"]
        comp_record.shift_dx = res["shift_dx"]
        comp_record.shift_dy = res["shift_dy"]
        comp_record.constraints_applied = res["constraints_applied"]
        comp_record.expected_mask_path = res["expected_mask_url"]
        comp_record.actual_mask_path = res["actual_mask_url"]
        comp_record.diff_mask_path = res["diff_mask_url"]
        comp_record.exclusion_mask_path = res["exclusion_mask_url"]
        comp_record.processing_time_ms = res["processing_time_ms"]
        comp_record.created_at = datetime.utcnow()

        db.commit()
        db.refresh(comp_record)

        return cls._format_comparison_result(comp_record, pair)

    @classmethod
    def _format_comparison_result(cls, comp: ComparisonModel, pair: ImagePairModel) -> ComparisonResult:
        """Formats DB model into typed ComparisonResult."""
        exp_url = f"/data/{pair.expected_image}".replace('\\', '/')
        act_url = f"/data/{pair.actual_image}".replace('\\', '/')
        return ComparisonResult(
            id=comp.id,
            pair_id=comp.pair_id,
            similarity_score=comp.similarity_score,
            threshold=comp.threshold,
            result=comp.result,
            margin=comp.margin,
            metrics=MetricBreakdown(
                iou=comp.iou,
                pixel_agreement=comp.pixel_agreement,
                area_similarity=comp.area_similarity,
                intensity_agreement=comp.intensity_agreement,
                spatial_similarity=comp.spatial_similarity
            ),
            shift_dx=comp.shift_dx or 0,
            shift_dy=comp.shift_dy or 0,
            constraints_applied=comp.constraints_applied or {},
            expected_image_url=exp_url,
            actual_image_url=act_url,
            expected_mask_url=comp.expected_mask_path,
            actual_mask_url=comp.actual_mask_path,
            diff_mask_url=comp.diff_mask_path,
            exclusion_mask_url=comp.exclusion_mask_path,
            processing_time_ms=comp.processing_time_ms,
            category_name=pair.category_name,
            ground_truth_label=pair.ground_truth_label,
            description=pair.description,
            created_at=comp.created_at
        )

    @classmethod
    def start_batch_comparison(
        cls,
        pair_ids: Optional[List[str]] = None,
        category_id: Optional[int] = None,
        override_threshold: Optional[float] = None
    ) -> str:
        """Launches an asynchronous background batch comparison job."""
        job_id = f"job_{uuid.uuid4().hex[:10]}"

        # Initialize job state
        with SessionLocal() as db:
            query = db.query(ImagePairModel).filter(ImagePairModel.status == "Matched")
            if pair_ids and len(pair_ids) > 0:
                query = query.filter(ImagePairModel.pair_id.in_(pair_ids))
            elif category_id is not None:
                query = query.filter(ImagePairModel.category_id == category_id)

            pairs_to_process = query.order_by(ImagePairModel.pair_id).all()
            target_ids = [p.pair_id for p in pairs_to_process]

            job_model = BatchJobModel(
                id=job_id,
                status="running",
                total_items=len(target_ids),
                processed_items=0,
                pass_count=0,
                fail_count=0,
                average_similarity=0.0,
                started_at=datetime.utcnow()
            )
            db.add(job_model)
            db.commit()

        ACTIVE_JOBS[job_id] = {
            "job_id": job_id,
            "status": "running",
            "total_items": len(target_ids),
            "processed_items": 0,
            "pass_count": 0,
            "fail_count": 0,
            "current_pair_id": target_ids[0] if target_ids else None,
            "average_similarity": 0.0,
            "start_time": time.time(),
            "target_ids": target_ids,
            "override_threshold": override_threshold,
            "error": None,
            "completed_at": None
        }

        # Spawn background processing thread
        thread = threading.Thread(
            target=cls._run_batch_worker,
            args=(job_id, target_ids, override_threshold),
            daemon=True
        )
        thread.start()

        return job_id

    @classmethod
    def _run_batch_worker(cls, job_id: str, target_ids: List[str], override_threshold: Optional[float]):
        """Background worker executing batch CV comparisons."""
        total = len(target_ids)
        total_sim = 0.0
        pass_c = 0
        fail_c = 0

        for idx, pid in enumerate(target_ids):
            try:
                ACTIVE_JOBS[job_id]["current_pair_id"] = pid

                with SessionLocal() as db:
                    result = cls.compare_single_pair(db, pid, override_threshold)
                    
                    if result.result == "PASS":
                        pass_c += 1
                    else:
                        fail_c += 1

                    total_sim += result.similarity_score
                    processed = idx + 1
                    avg_sim = round(total_sim / processed, 2)

                    # Update in-memory status
                    ACTIVE_JOBS[job_id]["processed_items"] = processed
                    ACTIVE_JOBS[job_id]["pass_count"] = pass_c
                    ACTIVE_JOBS[job_id]["fail_count"] = fail_c
                    ACTIVE_JOBS[job_id]["average_similarity"] = avg_sim

                    # Persist DB status periodically
                    job_record = db.query(BatchJobModel).filter(BatchJobModel.id == job_id).first()
                    if job_record:
                        job_record.processed_items = processed
                        job_record.pass_count = pass_c
                        job_record.fail_count = fail_c
                        job_record.current_pair_id = pid
                        job_record.average_similarity = avg_sim
                        db.commit()

            except Exception as e:
                print(f"Error processing pair {pid} in job {job_id}: {e}")

        # Mark completed
        ACTIVE_JOBS[job_id]["status"] = "completed"
        ACTIVE_JOBS[job_id]["completed_at"] = datetime.utcnow()

        with SessionLocal() as db:
            job_record = db.query(BatchJobModel).filter(BatchJobModel.id == job_id).first()
            if job_record:
                job_record.status = "completed"
                job_record.completed_at = datetime.utcnow()
                db.commit()

    @classmethod
    def get_job_status(cls, job_id: str) -> BatchJobStatusResponse:
        """Returns the real-time status and telemetry of a batch comparison job."""
        mem_job = ACTIVE_JOBS.get(job_id)
        if mem_job:
            total = mem_job["total_items"]
            proc = mem_job["processed_items"]
            progress = round((proc / max(1, total)) * 100.0, 1)
            elapsed = round(time.time() - mem_job["start_time"], 1)

            est_rem = None
            if proc > 0 and proc < total:
                sec_per_item = elapsed / proc
                est_rem = round(sec_per_item * (total - proc), 1)

            return BatchJobStatusResponse(
                job_id=job_id,
                status=mem_job["status"],
                total_items=total,
                processed_items=proc,
                progress_percent=progress,
                pass_count=mem_job["pass_count"],
                fail_count=mem_job["fail_count"],
                current_pair_id=mem_job["current_pair_id"],
                average_similarity=mem_job["average_similarity"],
                elapsed_seconds=elapsed,
                estimated_remaining_seconds=est_rem,
                started_at=datetime.fromtimestamp(mem_job["start_time"]),
                completed_at=mem_job.get("completed_at"),
                error=mem_job.get("error")
            )

        # Query database fallback
        with SessionLocal() as db:
            job = db.query(BatchJobModel).filter(BatchJobModel.id == job_id).first()
            if not job:
                raise FileNotFoundError(f"Batch job '{job_id}' not found.")

            total = job.total_items
            proc = job.processed_items
            progress = round((proc / max(1, total)) * 100.0, 1)

            return BatchJobStatusResponse(
                job_id=job.id,
                status=job.status,
                total_items=total,
                processed_items=proc,
                progress_percent=progress,
                pass_count=job.pass_count,
                fail_count=job.fail_count,
                current_pair_id=job.current_pair_id,
                average_similarity=job.average_similarity,
                elapsed_seconds=0.0,
                started_at=job.started_at,
                completed_at=job.completed_at,
                error=job.error
            )

    @classmethod
    def get_metrics_summary(cls, db: Session) -> MetricsSummaryResponse:
        """Calculates dynamic dashboard analytics, score distributions, and confusion matrix."""
        total_pairs = db.query(ImagePairModel).count()
        comparisons = db.query(ComparisonModel).all()
        processed_pairs = len(comparisons)

        cfg = ConfigService.get_config(db)
        threshold = cfg.decision.threshold_percent

        if processed_pairs == 0:
            return MetricsSummaryResponse(
                total_pairs=total_pairs,
                processed_pairs=0,
                pass_count=0,
                fail_count=0,
                pass_rate=0.0,
                fail_rate=0.0,
                average_similarity=0.0,
                average_processing_time_ms=0.0,
                threshold=threshold,
                score_distribution=[],
                category_results=[],
                recent_comparisons=[],
                confusion_matrix={"accuracy": 0.0, "tp": 0, "tn": 0, "fp": 0, "fn": 0}
            )

        pass_count = sum(1 for c in comparisons if c.result == "PASS")
        fail_count = sum(1 for c in comparisons if c.result == "FAIL")
        pass_rate = round((pass_count / processed_pairs) * 100.0, 1)
        fail_rate = round((fail_count / processed_pairs) * 100.0, 1)

        avg_sim = round(sum(c.similarity_score for c in comparisons) / processed_pairs, 1)
        avg_time = round(sum(c.processing_time_ms for c in comparisons) / processed_pairs, 1)

        # 1. Score Distribution Histogram Bins
        bins = [
            {"range": "0-49%", "min": 0, "max": 49.9, "count": 0},
            {"range": "50-69%", "min": 50, "max": 69.9, "count": 0},
            {"range": "70-79%", "min": 70, "max": 79.9, "count": 0},
            {"range": "80-89%", "min": 80, "max": 89.9, "count": 0},
            {"range": "90-94%", "min": 90, "max": 94.9, "count": 0},
            {"range": "95-100%", "min": 95, "max": 100.0, "count": 0},
        ]
        for c in comparisons:
            for b in bins:
                if b["min"] <= c.similarity_score <= b["max"]:
                    b["count"] += 1
                    break

        # 2. Results by Category
        pairs_dict = {p.pair_id: p for p in db.query(ImagePairModel).all()}
        category_map = {}
        for c in comparisons:
            p = pairs_dict.get(c.pair_id)
            c_name = p.category_name if p and p.category_name else "Uncategorized"
            if c_name not in category_map:
                category_map[c_name] = {"category": c_name, "pass": 0, "fail": 0, "total": 0, "avg_score": 0.0, "scores": []}
            category_map[c_name]["total"] += 1
            if c.result == "PASS":
                category_map[c_name]["pass"] += 1
            else:
                category_map[c_name]["fail"] += 1
            category_map[c_name]["scores"].append(c.similarity_score)

        category_results = []
        for c_name, data in category_map.items():
            category_results.append({
                "category": c_name,
                "pass": data["pass"],
                "fail": data["fail"],
                "total": data["total"],
                "pass_rate": round((data["pass"] / max(1, data["total"])) * 100.0, 1),
                "avg_score": round(sum(data["scores"]) / max(1, len(data["scores"])), 1)
            })

        # 3. Ground Truth Evaluation / Confusion Matrix
        # TP: GT is PASS and system predicted PASS
        # TN: GT is FAIL and system predicted FAIL
        # FP: GT is FAIL and system predicted PASS (False PASS)
        # FN: GT is PASS and system predicted FAIL (False FAIL)
        tp = tn = fp = fn = 0
        for c in comparisons:
            p = pairs_dict.get(c.pair_id)
            if p and p.ground_truth_label:
                gt = p.ground_truth_label
                pred = c.result
                if gt == "PASS" and pred == "PASS":
                    tp += 1
                elif gt == "FAIL" and pred == "FAIL":
                    tn += 1
                elif gt == "FAIL" and pred == "PASS":
                    fp += 1
                elif gt == "PASS" and pred == "FAIL":
                    fn += 1

        total_gt = tp + tn + fp + fn
        accuracy = round(((tp + tn) / max(1, total_gt)) * 100.0, 2)
        pass_precision = round((tp / max(1, tp + fp)) * 100.0, 2)
        fail_precision = round((tn / max(1, tn + fn)) * 100.0, 2)

        confusion = {
            "total_evaluated": total_gt,
            "true_pass": tp,
            "true_fail": tn,
            "false_pass": fp,
            "false_fail": fn,
            "accuracy": accuracy,
            "pass_precision": pass_precision,
            "fail_precision": fail_precision
        }

        # 4. Recent comparisons
        recent_records = db.query(ComparisonModel).order_by(ComparisonModel.id.desc()).limit(10).all()
        recent_list = []
        for r in recent_records:
            p = pairs_dict.get(r.pair_id)
            if p:
                recent_list.append(cls._format_comparison_result(r, p))

        return MetricsSummaryResponse(
            total_pairs=total_pairs,
            processed_pairs=processed_pairs,
            pass_count=pass_count,
            fail_count=fail_count,
            pass_rate=pass_rate,
            fail_rate=fail_rate,
            average_similarity=avg_sim,
            average_processing_time_ms=avg_time,
            threshold=threshold,
            score_distribution=bins,
            category_results=category_results,
            recent_comparisons=recent_list,
            confusion_matrix=confusion
        )

    @classmethod
    def list_comparison_results(
        cls,
        db: Session,
        search: Optional[str] = None,
        result_filter: Optional[str] = None,
        min_score: Optional[float] = None,
        max_score: Optional[float] = None,
        sort_by: str = "id",
        sort_order: str = "asc",
        page: int = 1,
        page_size: int = 20
    ) -> Dict[str, Any]:
        """Lists and paginates comparison records with filters."""
        query = db.query(ComparisonModel).join(ImagePairModel)

        if search:
            query = query.filter(ComparisonModel.pair_id.ilike(f"%{search}%"))
        if result_filter and result_filter.upper() in ["PASS", "FAIL"]:
            query = query.filter(ComparisonModel.result == result_filter.upper())
        if min_score is not None:
            query = query.filter(ComparisonModel.similarity_score >= min_score)
        if max_score is not None:
            query = query.filter(ComparisonModel.similarity_score <= max_score)

        # Sorting
        sort_attr = getattr(ComparisonModel, sort_by, ComparisonModel.id)
        if sort_order.lower() == "desc":
            query = query.order_by(sort_attr.desc())
        else:
            query = query.order_by(sort_attr.asc())

        total_count = query.count()
        offset = (page - 1) * page_size
        records = query.offset(offset).limit(page_size).all()

        pairs_dict = {p.pair_id: p for p in db.query(ImagePairModel).all()}
        items = [cls._format_comparison_result(r, pairs_dict[r.pair_id]) for r in records if r.pair_id in pairs_dict]

        return {
            "total": total_count,
            "page": page,
            "page_size": page_size,
            "total_pages": (total_count + page_size - 1) // max(1, page_size),
            "items": items
        }

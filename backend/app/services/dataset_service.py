"""
Dataset Management Service
Handles pair auto-discovery, validation, metadata ingestion, ZIP imports, and statistics.
"""

import os
import re
import csv
import zipfile
from typing import List, Dict, Any, Tuple, Optional
from sqlalchemy.orm import Session
from ..database.models import DatasetModel, ImagePairModel, ComparisonModel
from ..schemas.dataset import DatasetStatistics, ImagePairResponse

SUPPORTED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".bmp", ".tiff"}

class DatasetService:
    DATA_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../data"))
    EXPECTED_DIR = os.path.join(DATA_ROOT, "expected")
    ACTUAL_DIR = os.path.join(DATA_ROOT, "actual")
    METADATA_CSV = os.path.join(DATA_ROOT, "metadata.csv")

    @classmethod
    def extract_pair_id_from_filename(cls, filename: str) -> str:
        """
        Normalizes pair ID from filenames like:
        pair_001.png -> pair_001
        expected_001.png -> pair_001
        actual_001.png -> pair_001
        001.png -> pair_001
        """
        base_name, _ = os.path.splitext(filename)
        # Check for numbers in filename
        match = re.search(r'(\d+)', base_name)
        if match:
            num = int(match.group(1))
            return f"pair_{num:03d}"
        return base_name.lower().replace(" ", "_")

    @classmethod
    def load_metadata_csv(cls) -> Dict[str, Dict[str, Any]]:
        """Reads metadata.csv for category and evaluation ground truth labels."""
        meta_dict = {}
        if os.path.exists(cls.METADATA_CSV):
            try:
                with open(cls.METADATA_CSV, mode="r", encoding="utf-8") as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        p_id = row.get("pair_id")
                        if p_id:
                            meta_dict[p_id] = row
            except Exception as e:
                print(f"Warning loading metadata.csv: {e}")
        return meta_dict

    @classmethod
    def sync_dataset_to_db(cls, db: Session) -> int:
        """
        Scans data/expected and data/actual, pairs files, and synchronizes to SQLite.
        """
        os.makedirs(cls.EXPECTED_DIR, exist_ok=True)
        os.makedirs(cls.ACTUAL_DIR, exist_ok=True)

        exp_files = {}
        if os.path.exists(cls.EXPECTED_DIR):
            for f in os.listdir(cls.EXPECTED_DIR):
                ext = os.path.splitext(f)[1].lower()
                if ext in SUPPORTED_EXTENSIONS:
                    pid = cls.extract_pair_id_from_filename(f)
                    exp_files[pid] = os.path.join("expected", f)

        act_files = {}
        if os.path.exists(cls.ACTUAL_DIR):
            for f in os.listdir(cls.ACTUAL_DIR):
                ext = os.path.splitext(f)[1].lower()
                if ext in SUPPORTED_EXTENSIONS:
                    pid = cls.extract_pair_id_from_filename(f)
                    act_files[pid] = os.path.join("actual", f)

        all_pair_ids = sorted(list(set(exp_files.keys()) | set(act_files.keys())))
        metadata_map = cls.load_metadata_csv()

        # Fetch or create default dataset record
        dataset_record = db.query(DatasetModel).filter(DatasetModel.id == 1).first()
        if not dataset_record:
            dataset_record = DatasetModel(
                id=1,
                name="100-Pair Meteorological Dataset",
                description="Synthetic radar precipitation functional equivalence benchmark dataset"
            )
            db.add(dataset_record)
            db.flush()

        matched_count = 0
        missing_count = 0

        for pid in all_pair_ids:
            exp_path = exp_files.get(pid)
            act_path = act_files.get(pid)

            if exp_path and act_path:
                status = "Matched"
                matched_count += 1
            elif exp_path and not act_path:
                status = "Missing Actual"
                missing_count += 1
            elif not exp_path and act_path:
                status = "Missing Expected"
                missing_count += 1
            else:
                status = "Invalid Image"

            # Normalize to forward slashes for web URLs
            norm_exp = (exp_path or "").replace('\\', '/')
            norm_act = (act_path or "").replace('\\', '/')

            meta = metadata_map.get(pid, {})
            cat_id = int(meta["category_id"]) if meta.get("category_id") else None
            cat_name = meta.get("category_name")
            gt_label = meta.get("expected_result")
            desc = meta.get("description")

            pair_record = db.query(ImagePairModel).filter(ImagePairModel.pair_id == pid).first()
            if not pair_record:
                pair_record = ImagePairModel(
                    dataset_id=1,
                    pair_id=pid,
                    expected_image=norm_exp,
                    actual_image=norm_act,
                    status=status,
                    category_id=cat_id,
                    category_name=cat_name,
                    ground_truth_label=gt_label,
                    description=desc
                )
                db.add(pair_record)
            else:
                pair_record.expected_image = norm_exp or pair_record.expected_image
                pair_record.actual_image = norm_act or pair_record.actual_image
                pair_record.status = status
                if cat_id is not None:
                    pair_record.category_id = cat_id
                if cat_name:
                    pair_record.category_name = cat_name
                if gt_label:
                    pair_record.ground_truth_label = gt_label
                if desc:
                    pair_record.description = desc

        dataset_record.total_pairs = len(all_pair_ids)
        dataset_record.matched_pairs = matched_count
        dataset_record.missing_pairs = missing_count
        db.commit()

        return len(all_pair_ids)

    @classmethod
    def get_statistics(cls, db: Session) -> DatasetStatistics:
        """Returns comprehensive dataset statistics."""
        cls.sync_dataset_to_db(db)
        
        pairs = db.query(ImagePairModel).all()
        
        total_exp = sum(1 for p in pairs if p.expected_image)
        total_act = sum(1 for p in pairs if p.actual_image)
        matched = sum(1 for p in pairs if p.status == "Matched")
        missing = sum(1 for p in pairs if "Missing" in p.status)
        invalid = sum(1 for p in pairs if p.status == "Invalid Image")
        ready = matched

        categories = set(p.category_name for p in pairs if p.category_name)
        pass_gt = sum(1 for p in pairs if p.ground_truth_label == "PASS")
        fail_gt = sum(1 for p in pairs if p.ground_truth_label == "FAIL")

        return DatasetStatistics(
            total_expected=total_exp,
            total_actual=total_act,
            matched_pairs=matched,
            missing_pairs=missing,
            invalid_files=invalid,
            ready_pairs=ready,
            categories_count=len(categories),
            pass_ground_truth=pass_gt,
            fail_ground_truth=fail_gt
        )

    @classmethod
    def list_pairs(cls, db: Session, search: str = None, category_id: int = None, status: str = None) -> List[Dict[str, Any]]:
        """Lists image pairs with latest comparison results."""
        query = db.query(ImagePairModel)
        if search:
            query = query.filter(ImagePairModel.pair_id.ilike(f"%{search}%"))
        if category_id:
            query = query.filter(ImagePairModel.category_id == category_id)
        if status:
            query = query.filter(ImagePairModel.status == status)

        pairs = query.order_by(ImagePairModel.pair_id).all()
        
        result_list = []
        for p in pairs:
            latest_comp = db.query(ComparisonModel).filter(ComparisonModel.pair_id == p.pair_id).order_by(ComparisonModel.id.desc()).first()
            result_list.append({
                "id": p.id,
                "pair_id": p.pair_id,
                "expected_image": f"/data/{p.expected_image}" if p.expected_image else "",
                "actual_image": f"/data/{p.actual_image}" if p.actual_image else "",
                "status": p.status,
                "category_id": p.category_id,
                "category_name": p.category_name,
                "ground_truth_label": p.ground_truth_label,
                "description": p.description,
                "created_at": p.created_at,
                "latest_result": latest_comp.result if latest_comp else None,
                "latest_similarity": latest_comp.similarity_score if latest_comp else None
            })

        return result_list

    @classmethod
    def get_pair_by_id(cls, db: Session, pair_id: str) -> Dict[str, Any]:
        """Retrieves single image pair details."""
        p = db.query(ImagePairModel).filter(ImagePairModel.pair_id == pair_id).first()
        if not p:
            raise FileNotFoundError(f"Image pair '{pair_id}' not found in database.")

        latest_comp = db.query(ComparisonModel).filter(ComparisonModel.pair_id == p.pair_id).order_by(ComparisonModel.id.desc()).first()
        return {
            "id": p.id,
            "pair_id": p.pair_id,
            "expected_image": f"/data/{p.expected_image}" if p.expected_image else "",
            "actual_image": f"/data/{p.actual_image}" if p.actual_image else "",
            "status": p.status,
            "category_id": p.category_id,
            "category_name": p.category_name,
            "ground_truth_label": p.ground_truth_label,
            "description": p.description,
            "created_at": p.created_at,
            "latest_result": latest_comp.result if latest_comp else None,
            "latest_similarity": latest_comp.similarity_score if latest_comp else None
        }

    @classmethod
    def generate_next_pair_id(cls, db: Session) -> str:
        """Generates the next sequential pair ID (e.g. pair_101)."""
        pairs = db.query(ImagePairModel.pair_id).all()
        max_num = 0
        for (pid,) in pairs:
            m = re.search(r'pair_(\d+)', pid)
            if m:
                num = int(m.group(1))
                if num > max_num:
                    max_num = num
        return f"pair_{max_num + 1:03d}"

    @classmethod
    def handle_single_pair_upload(
        cls,
        expected_bytes: bytes,
        expected_filename: str,
        actual_bytes: bytes,
        actual_filename: str,
        pair_id: Optional[str],
        category_id: Optional[int],
        category_name: Optional[str],
        ground_truth_label: Optional[str],
        description: Optional[str],
        db: Session
    ) -> Dict[str, Any]:
        """Saves a single pair (expected and actual images), updates DB and metadata."""
        os.makedirs(cls.EXPECTED_DIR, exist_ok=True)
        os.makedirs(cls.ACTUAL_DIR, exist_ok=True)

        # Determine sanitized pair ID
        if not pair_id or not pair_id.strip():
            target_pair_id = cls.generate_next_pair_id(db)
        else:
            target_pair_id = re.sub(r'[^a-zA-Z0-9_\-]', '_', pair_id.strip()).lower()
            if not target_pair_id.startswith("pair_") and target_pair_id.isdigit():
                target_pair_id = f"pair_{int(target_pair_id):03d}"

        # Determine file extensions
        exp_ext = os.path.splitext(expected_filename)[1].lower()
        if exp_ext not in SUPPORTED_EXTENSIONS:
            exp_ext = ".png"
        act_ext = os.path.splitext(actual_filename)[1].lower()
        if act_ext not in SUPPORTED_EXTENSIONS:
            act_ext = ".png"

        exp_save_filename = f"{target_pair_id}{exp_ext}"
        act_save_filename = f"{target_pair_id}{act_ext}"

        exp_full_path = os.path.join(cls.EXPECTED_DIR, exp_save_filename)
        act_full_path = os.path.join(cls.ACTUAL_DIR, act_save_filename)

        with open(exp_full_path, "wb") as f:
            f.write(expected_bytes)
        with open(act_full_path, "wb") as f:
            f.write(actual_bytes)

        # Update metadata.csv if it exists
        if os.path.exists(cls.METADATA_CSV):
            try:
                rows = []
                found = False
                fieldnames = ["pair_id", "expected_image", "actual_image", "variation", "enabled_constraints", "expected_label"]
                with open(cls.METADATA_CSV, mode="r", encoding="utf-8") as f:
                    reader = csv.DictReader(f)
                    if reader.fieldnames:
                        fieldnames = reader.fieldnames
                    for r in reader:
                        if r.get("pair_id") == target_pair_id:
                            r["expected_image"] = f"expected/{exp_save_filename}"
                            r["actual_image"] = f"actual/{act_save_filename}"
                            if category_name:
                                r["variation"] = category_name
                            if ground_truth_label:
                                r["expected_label"] = ground_truth_label
                            found = True
                        rows.append(r)
                if not found:
                    new_row = {fn: "" for fn in fieldnames}
                    new_row["pair_id"] = target_pair_id
                    new_row["expected_image"] = f"expected/{exp_save_filename}"
                    new_row["actual_image"] = f"actual/{act_save_filename}"
                    new_row["variation"] = category_name or "Single Pair Upload"
                    new_row["enabled_constraints"] = "text,icons,arc_lines,legend"
                    new_row["expected_label"] = ground_truth_label or ""
                    rows.append(new_row)

                with open(cls.METADATA_CSV, mode="w", encoding="utf-8", newline="") as f:
                    writer = csv.DictWriter(f, fieldnames=fieldnames)
                    writer.writeheader()
                    writer.writerows(rows)
            except Exception as e:
                print(f"Warning updating metadata.csv: {e}")

        # Update or create DB record
        norm_exp = f"expected/{exp_save_filename}".replace('\\', '/')
        norm_act = f"actual/{act_save_filename}".replace('\\', '/')

        pair_record = db.query(ImagePairModel).filter(ImagePairModel.pair_id == target_pair_id).first()
        if not pair_record:
            pair_record = ImagePairModel(
                dataset_id=1,
                pair_id=target_pair_id,
                expected_image=norm_exp,
                actual_image=norm_act,
                status="Matched",
                category_id=category_id if category_id is not None else 11,
                category_name=category_name or "Custom Single Pair",
                ground_truth_label=ground_truth_label,
                description=description or f"Custom uploaded pair {target_pair_id}"
            )
            db.add(pair_record)
        else:
            pair_record.expected_image = norm_exp
            pair_record.actual_image = norm_act
            pair_record.status = "Matched"
            if category_id is not None:
                pair_record.category_id = category_id
            if category_name:
                pair_record.category_name = category_name
            if ground_truth_label:
                pair_record.ground_truth_label = ground_truth_label
            if description:
                pair_record.description = description

        # Update dataset counts
        dataset_record = db.query(DatasetModel).filter(DatasetModel.id == 1).first()
        if dataset_record:
            all_pairs = db.query(ImagePairModel).all()
            dataset_record.total_pairs = len(all_pairs)
            dataset_record.matched_pairs = sum(1 for p in all_pairs if p.status == "Matched")
            dataset_record.missing_pairs = sum(1 for p in all_pairs if "Missing" in p.status)

        db.commit()
        return cls.get_pair_by_id(db, target_pair_id)

    @classmethod
    def delete_pair(cls, db: Session, pair_id: str) -> bool:
        """Deletes an image pair, associated masks, and DB comparison records."""
        pair = db.query(ImagePairModel).filter(ImagePairModel.pair_id == pair_id).first()
        if not pair:
            return False

        # Delete image files on disk
        if pair.expected_image:
            exp_p = os.path.join(cls.DATA_ROOT, pair.expected_image)
            if os.path.exists(exp_p):
                try:
                    os.remove(exp_p)
                except Exception:
                    pass
        if pair.actual_image:
            act_p = os.path.join(cls.DATA_ROOT, pair.actual_image)
            if os.path.exists(act_p):
                try:
                    os.remove(act_p)
                except Exception:
                    pass

        # Delete diagnostic mask files
        masks_dir = os.path.join(cls.DATA_ROOT, "masks")
        if os.path.exists(masks_dir):
            for f in os.listdir(masks_dir):
                if f.startswith(f"{pair_id}_"):
                    try:
                        os.remove(os.path.join(masks_dir, f))
                    except Exception:
                        pass

        # Delete DB comparison records
        db.query(ComparisonModel).filter(ComparisonModel.pair_id == pair_id).delete()
        # Delete ImagePair record
        db.query(ImagePairModel).filter(ImagePairModel.pair_id == pair_id).delete()

        # Update dataset counts
        dataset_record = db.query(DatasetModel).filter(DatasetModel.id == 1).first()
        if dataset_record:
            all_pairs = db.query(ImagePairModel).all()
            dataset_record.total_pairs = len(all_pairs)
            dataset_record.matched_pairs = sum(1 for p in all_pairs if p.status == "Matched")
            dataset_record.missing_pairs = sum(1 for p in all_pairs if "Missing" in p.status)

        db.commit()
        return True

    @classmethod
    def handle_zip_upload(cls, zip_bytes: bytes, db: Session) -> Dict[str, Any]:
        """Extracts uploaded dataset ZIP archive containing expected/ and actual/."""
        import tempfile
        import shutil

        with tempfile.NamedTemporaryFile(delete=False, suffix=".zip") as tmp:
            tmp.write(zip_bytes)
            tmp_path = tmp.name

        try:
            with zipfile.ZipFile(tmp_path, 'r') as zip_ref:
                for member in zip_ref.namelist():
                    # Security check against path traversal
                    if ".." in member or member.startswith("/"):
                        continue
                    # Extract expected or actual files
                    if "expected" in member.lower() and not member.endswith("/"):
                        filename = os.path.basename(member)
                        if filename:
                            target = os.path.join(cls.EXPECTED_DIR, filename)
                            with zip_ref.open(member) as source, open(target, "wb") as dest:
                                shutil.copyfileobj(source, dest)
                    elif "actual" in member.lower() and not member.endswith("/"):
                        filename = os.path.basename(member)
                        if filename:
                            target = os.path.join(cls.ACTUAL_DIR, filename)
                            with zip_ref.open(member) as source, open(target, "wb") as dest:
                                shutil.copyfileobj(source, dest)
                    elif "metadata.csv" in member.lower():
                        target = cls.METADATA_CSV
                        with zip_ref.open(member) as source, open(target, "wb") as dest:
                            shutil.copyfileobj(source, dest)
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

        count = cls.sync_dataset_to_db(db)
        return {
            "success": True,
            "message": f"Dataset ZIP processed successfully. Discovered {count} pairs.",
            "discovered_pairs": count,
            "new_pairs_added": count
        }

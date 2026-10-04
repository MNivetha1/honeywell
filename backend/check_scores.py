"""
Diagnostic score inspector for 100 pairs
"""

import os
import csv
from app.cv.comparison_engine import ComparisonEngine
from app.database.session import init_database

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../data"))
METADATA_CSV = os.path.join(DATA_DIR, "metadata.csv")

config = {
    "image_processing": {"resize": True, "width": 512, "height": 512, "blur": 1.2, "morphology": True},
    "feature_exclusion": {"exclude_text": True, "exclude_icons": True, "exclude_arc_lines": True, "exclude_legend": True},
    "alignment": {"alignment_enabled": True, "max_shift_pixels": 8},
    "scoring": {"overlap_weight": 40.0, "intensity_weight": 30.0, "area_weight": 20.0, "spatial_weight": 10.0},
    "decision": {"threshold_percent": 90.0}
}

with open(METADATA_CSV, mode="r", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
        pair_id = row["pair_id"]
        gt_label = row["expected_result"]
        cat = row["category_name"]
        exp_path = os.path.join(DATA_DIR, row["expected_image"])
        act_path = os.path.join(DATA_DIR, row["actual_image"])

        res = ComparisonEngine.compare_image_pair(
            expected_path=exp_path,
            actual_path=act_path,
            config=config,
            pair_id=pair_id
        )
        pred = res["result"]
        score = res["similarity_score"]
        if pred != gt_label:
            print(f"MISMATCH: {pair_id} | Cat: {cat} | GT: {gt_label} | Pred: {pred} | Score: {score}% | Metrics: {res['metrics']}")

"""
Full 100-Pair Evaluation Test
Tests the complete synthetic benchmark dataset across all 10 categories (50 PASS, 50 FAIL).
Calculates: Accuracy, Precision, False PASS, False FAIL.
"""

import os
import csv
import pytest
from app.cv.comparison_engine import ComparisonEngine

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../data"))
METADATA_CSV = os.path.join(DATA_DIR, "metadata.csv")

def test_100_pair_evaluation():
    if not os.path.exists(METADATA_CSV):
        pytest.skip("metadata.csv not generated yet")

    # Load default test config
    config = {
        "image_processing": {"resize": True, "width": 512, "height": 512, "blur": 1.2, "morphology": True},
        "feature_exclusion": {"exclude_text": True, "exclude_icons": True, "exclude_arc_lines": True, "exclude_legend": True},
        "alignment": {"alignment_enabled": True, "max_shift_pixels": 8},
        "scoring": {"overlap_weight": 40.0, "intensity_weight": 30.0, "area_weight": 20.0, "spatial_weight": 10.0},
        "decision": {"threshold_percent": 90.0}
    }

    tp = tn = fp = fn = 0
    results_summary = []

    with open(METADATA_CSV, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            pair_id = row["pair_id"]
            gt_label = row.get("expected_label") or row.get("expected_result") or "PASS"
            category_name = row.get("variation") or row.get("category_name") or "Standard"
            exp_path = os.path.join(DATA_DIR, row["expected_image"])
            act_path = os.path.join(DATA_DIR, row["actual_image"])

            res = ComparisonEngine.compare_image_pair(
                expected_path=exp_path,
                actual_path=act_path,
                config=config,
                pair_id=pair_id
            )

            pred_label = res["result"]
            score = res["similarity_score"]

            if gt_label == "PASS" and pred_label == "PASS":
                tp += 1
            elif gt_label == "FAIL" and pred_label == "FAIL":
                tn += 1
            elif gt_label == "FAIL" and pred_label == "PASS":
                fp += 1
            elif gt_label == "PASS" and pred_label == "FAIL":
                fn += 1

            results_summary.append((pair_id, category_name, gt_label, pred_label, score))


    total = tp + tn + fp + fn
    accuracy = (tp + tn) / max(1, total) * 100.0

    print(f"\n==========================================")
    print(f"100-PAIR EVALUATION RESULTS SUMMARY")
    print(f"==========================================")
    print(f"Total Evaluated: {total}")
    print(f"True PASS (TP):  {tp} / 50")
    print(f"True FAIL (TN):  {tn} / 50")
    print(f"False PASS (FP): {fp}")
    print(f"False FAIL (FN): {fn}")
    print(f"Overall Accuracy: {accuracy:.1f}%")
    print(f"==========================================\n")

    # The functional equivalence analyzer with cosmetic exclusions and alignment
    # should achieve high benchmark accuracy on the 100 synthetic pairs
    assert total == 100
    assert accuracy >= 95.0, f"Expected accuracy >= 95%, got {accuracy}%"

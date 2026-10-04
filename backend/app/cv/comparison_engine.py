"""
Comparison Engine Module
Computes multi-dimensional functional equivalence metrics:
- Intersection over Union (IoU)
- Pixel Agreement
- Precipitation Area Similarity
- Intensity Agreement
- Spatial Distribution Similarity
- Generates composite Difference Mask
"""

import cv2
import numpy as np
import os
import time
from typing import Dict, Any, Tuple
from PIL import Image

from .preprocessing_service import PreprocessingService
from .cosmetic_filter import CosmeticFilter
from .precipitation_extractor import PrecipitationExtractor
from .alignment import ImageAlignment

class ComparisonEngine:
    @staticmethod
    def calculate_iou(expected_mask: np.ndarray, actual_mask: np.ndarray, valid_domain: np.ndarray) -> float:
        """Calculates IoU between expected and actual precipitation masks within valid domain."""
        exp_valid = (expected_mask > 0) & (valid_domain > 0)
        act_valid = (actual_mask > 0) & (valid_domain > 0)

        intersection = np.logical_and(exp_valid, act_valid).sum()
        union = np.logical_or(exp_valid, act_valid).sum()

        if union == 0:
            return 1.0  # Both images have zero precipitation -> functionally identical

        return float(intersection / union)

    @staticmethod
    def calculate_pixel_agreement(expected_mask: np.ndarray, actual_mask: np.ndarray, valid_domain: np.ndarray) -> float:
        """Calculates percentage of matching pixels (precipitation state agreement) in valid domain."""
        valid_pixels = (valid_domain > 0)
        total_valid = valid_pixels.sum()
        if total_valid == 0:
            return 1.0

        exp_bin = (expected_mask > 0) & valid_pixels
        act_bin = (actual_mask > 0) & valid_pixels

        agreed = (exp_bin == act_bin) & valid_pixels
        return float(agreed.sum() / total_valid)

    @staticmethod
    def calculate_area_similarity(expected_mask: np.ndarray, actual_mask: np.ndarray, valid_domain: np.ndarray) -> float:
        """Calculates precipitation area ratio similarity (1.0 = identical total storm footprint)."""
        exp_area = float(((expected_mask > 0) & (valid_domain > 0)).sum())
        act_area = float(((actual_mask > 0) & (valid_domain > 0)).sum())

        max_area = max(exp_area, act_area)
        if max_area == 0:
            return 1.0

        diff = abs(exp_area - act_area)
        return max(0.0, float(1.0 - (diff / max_area)))

    @staticmethod
    def calculate_intensity_agreement(expected_intensity: np.ndarray, actual_intensity: np.ndarray, valid_domain: np.ndarray) -> float:
        """
        Calculates intensity class agreement across precipitation areas.
        Penalizes severe classification jumps (e.g. Low vs Severe storm cell).
        """
        valid_pixels = (valid_domain > 0)
        exp_valid = expected_intensity * valid_pixels
        act_valid = actual_intensity * valid_pixels

        precip_active = (exp_valid > 0) | (act_valid > 0)
        total_precip_pixels = precip_active.sum()

        if total_precip_pixels == 0:
            return 1.0

        # Absolute difference between intensity levels (0..4)
        intensity_diff = np.abs(exp_valid.astype(np.float32) - act_valid.astype(np.float32))
        
        # Distance penalty: 0 diff = 1.0, 1 diff = 0.65, 2 diff = 0.3, >=3 diff = 0.0
        scores = np.zeros_like(intensity_diff)
        scores[precip_active & (intensity_diff == 0)] = 1.0
        scores[precip_active & (intensity_diff == 1)] = 0.65
        scores[precip_active & (intensity_diff == 2)] = 0.30
        scores[precip_active & (intensity_diff >= 3)] = 0.0

        agreement = float(scores[precip_active].sum() / total_precip_pixels)
        return max(0.0, min(1.0, agreement))

    @staticmethod
    def calculate_spatial_similarity(expected_mask: np.ndarray, actual_mask: np.ndarray, valid_domain: np.ndarray) -> float:
        """
        Calculates spatial distribution similarity using centroid proximity and normalized cross-correlation.
        """
        exp_bin = ((expected_mask > 0) & (valid_domain > 0)).astype(np.uint8)
        act_bin = ((actual_mask > 0) & (valid_domain > 0)).astype(np.uint8)

        if exp_bin.sum() == 0 and act_bin.sum() == 0:
            return 1.0
        if exp_bin.sum() == 0 or act_bin.sum() == 0:
            return 0.0

        # Centroid calculation
        M_exp = cv2.moments(exp_bin)
        M_act = cv2.moments(act_bin)

        if M_exp["m00"] > 0 and M_act["m00"] > 0:
            cx_exp = M_exp["m10"] / M_exp["m00"]
            cy_exp = M_exp["m01"] / M_exp["m00"]
            cx_act = M_act["m10"] / M_act["m00"]
            cy_act = M_act["m01"] / M_act["m00"]

            dist = np.sqrt((cx_exp - cx_act)**2 + (cy_exp - cy_act)**2)
            max_diag = np.sqrt(expected_mask.shape[0]**2 + expected_mask.shape[1]**2)
            centroid_score = max(0.0, 1.0 - (dist / (max_diag * 0.25)))
        else:
            centroid_score = 0.0

        # Normalized cross correlation of blurred masks
        ksize = 15
        blur_exp = cv2.GaussianBlur(exp_bin.astype(np.float32), (ksize, ksize), 5.0)
        blur_act = cv2.GaussianBlur(act_bin.astype(np.float32), (ksize, ksize), 5.0)

        norm_exp = np.linalg.norm(blur_exp)
        norm_act = np.linalg.norm(blur_act)

        if norm_exp > 0 and norm_act > 0:
            ncc = np.sum(blur_exp * blur_act) / (norm_exp * norm_act)
            ncc = max(0.0, min(1.0, float(ncc)))
        else:
            ncc = 0.0

        return float(0.5 * centroid_score + 0.5 * ncc)

    @classmethod
    def generate_difference_mask(
        cls,
        expected_intensity: np.ndarray,
        actual_intensity: np.ndarray,
        exclusion_mask: np.ndarray
    ) -> np.ndarray:
        """
        Renders a diagnostic color-coded Difference Mask:
        - Matching Precipitation: Emerald Green (0, 220, 90)
        - Expected only / Missing in Actual (Under-precip): Sky Cyan (0, 190, 255)
        - Actual only / False Artifact (Over-precip): Coral Red (255, 60, 60)
        - Intensity Mismatch: Gold/Amber (255, 200, 30)
        - Background / Clear: Dark Navy (12, 18, 32)
        - Excluded regions: Slate Gray with grid pattern (35, 45, 60)
        """
        h, w = expected_intensity.shape[:2]
        diff_rgb = np.zeros((h, w, 3), dtype=np.uint8)

        # Background default
        diff_rgb[:] = (12, 18, 32)

        exp_has = (expected_intensity > 0)
        act_has = (actual_intensity > 0)

        # Matching precipitation with same intensity
        exact_match = exp_has & act_has & (expected_intensity == actual_intensity)
        diff_rgb[exact_match] = (0, 220, 90)

        # Intensity mismatch (both have rain, but different intensity level)
        intensity_mismatch = exp_has & act_has & (expected_intensity != actual_intensity)
        diff_rgb[intensity_mismatch] = (255, 200, 30)

        # Missing in Actual (Under-precipitation)
        under_precip = exp_has & (~act_has)
        diff_rgb[under_precip] = (0, 190, 255)

        # False in Actual (Over-precipitation)
        over_precip = (~exp_has) & act_has
        diff_rgb[over_precip] = (255, 60, 60)

        # Dim cosmetic excluded regions
        if exclusion_mask is not None and np.any(exclusion_mask > 0):
            excl = (exclusion_mask > 0)
            # Alpha blend excluded regions into slate gray
            diff_rgb[excl] = (diff_rgb[excl] * 0.35 + np.array([40, 50, 70]) * 0.65).astype(np.uint8)

        return diff_rgb

    @classmethod
    def compare_image_pair(
        cls,
        expected_path: str,
        actual_path: str,
        config: Dict[str, Any],
        output_masks_dir: str = "data/masks",
        pair_id: str = "pair_unknown"
    ) -> Dict[str, Any]:
        """
        Executes complete Functional Equivalence CV comparison pipeline:
        1. Preprocessing (Resize, blur, morphology)
        2. Cosmetic Exclusion (Detect & create masks for text, icons, arcs, legend)
        3. Precipitation Extraction (Multi-class intensity segmentation)
        4. Alignment (Translation estimation & shift correction)
        5. Metric calculations (IoU, Pixel Agreement, Area, Intensity, Spatial)
        6. Weighted scoring & PASS/FAIL decision
        7. Difference Mask artifact generation
        """
        t0 = time.perf_counter()

        # Parse configurations
        img_cfg = config.get("image_processing", {})
        excl_cfg = config.get("feature_exclusion", {})
        align_cfg = config.get("alignment", {})
        score_cfg = config.get("scoring", {})
        dec_cfg = config.get("decision", {})

        target_size = (img_cfg.get("width", 512), img_cfg.get("height", 512))
        blur_sigma = img_cfg.get("blur", 1.2)
        apply_morph = img_cfg.get("morphology", True)

        # 1. Load Images
        raw_expected = PreprocessingService.load_image(expected_path)
        raw_actual = PreprocessingService.load_image(actual_path)

        # 2. Preprocessing
        pre_expected = PreprocessingService.preprocess(raw_expected, target_size, blur_sigma, apply_morph)
        pre_actual = PreprocessingService.preprocess(raw_actual, target_size, blur_sigma, apply_morph)

        # 3. Cosmetic Feature Exclusion
        excl_exp = CosmeticFilter.create_exclusion_mask(
            pre_expected,
            exclude_text=excl_cfg.get("exclude_text", True),
            exclude_icons=excl_cfg.get("exclude_icons", True),
            exclude_arc_lines=excl_cfg.get("exclude_arc_lines", True),
            exclude_legend=excl_cfg.get("exclude_legend", True)
        )

        excl_act = CosmeticFilter.create_exclusion_mask(
            pre_actual,
            exclude_text=excl_cfg.get("exclude_text", True),
            exclude_icons=excl_cfg.get("exclude_icons", True),
            exclude_arc_lines=excl_cfg.get("exclude_arc_lines", True),
            exclude_legend=excl_cfg.get("exclude_legend", True)
        )

        # Combined exclusion mask (any feature excluded in either expected or actual is ignored in comparison)
        combined_exclusion = cv2.bitwise_or(excl_exp, excl_act)
        valid_domain = (combined_exclusion == 0).astype(np.uint8)

        # 4. Precipitation Extraction
        exp_mask, exp_intensity, exp_precip_rgb = PrecipitationExtractor.extract_precipitation(
            pre_expected, exclusion_mask=excl_exp
        )
        act_mask, act_intensity, act_precip_rgb = PrecipitationExtractor.extract_precipitation(
            pre_actual, exclusion_mask=excl_act
        )

        # 5. Image Alignment
        aligned_act_mask, aligned_act_intensity, aligned_act_rgb, dx, dy = ImageAlignment.align_representation(
            act_mask, act_intensity, act_precip_rgb, exp_mask,
            max_shift_pixels=align_cfg.get("max_shift_pixels", 8),
            enabled=align_cfg.get("alignment_enabled", True)
        )

        # 6. Comparison Metrics
        iou = cls.calculate_iou(exp_mask, aligned_act_mask, valid_domain)
        pixel_agreement = cls.calculate_pixel_agreement(exp_mask, aligned_act_mask, valid_domain)
        area_similarity = cls.calculate_area_similarity(exp_mask, aligned_act_mask, valid_domain)
        intensity_agreement = cls.calculate_intensity_agreement(exp_intensity, aligned_act_intensity, valid_domain)
        spatial_similarity = cls.calculate_spatial_similarity(exp_mask, aligned_act_mask, valid_domain)

        # 7. Weighted Composite Score
        w_overlap = score_cfg.get("overlap_weight", 40.0) / 100.0
        w_intensity = score_cfg.get("intensity_weight", 30.0) / 100.0
        w_area = score_cfg.get("area_weight", 20.0) / 100.0
        w_spatial = score_cfg.get("spatial_weight", 10.0) / 100.0

        raw_similarity = (
            w_overlap * iou +
            w_intensity * intensity_agreement +
            w_area * area_similarity +
            w_spatial * spatial_similarity
        ) * 100.0

        similarity_score = max(0.0, min(100.0, round(raw_similarity, 1)))
        threshold = float(dec_cfg.get("threshold_percent", 90.0))
        result = "PASS" if similarity_score >= threshold else "FAIL"
        margin = round(similarity_score - threshold, 1)

        # 8. Save diagnostic visual masks
        os.makedirs(output_masks_dir, exist_ok=True)
        diff_mask_rgb = cls.generate_difference_mask(exp_intensity, aligned_act_intensity, combined_exclusion)

        exp_mask_filename = f"{pair_id}_exp_mask.png"
        act_mask_filename = f"{pair_id}_act_mask.png"
        diff_mask_filename = f"{pair_id}_diff_mask.png"
        excl_mask_filename = f"{pair_id}_excl_mask.png"

        exp_mask_path = os.path.join(output_masks_dir, exp_mask_filename)
        act_mask_path = os.path.join(output_masks_dir, act_mask_filename)
        diff_mask_path = os.path.join(output_masks_dir, diff_mask_filename)
        excl_mask_path = os.path.join(output_masks_dir, excl_mask_filename)

        Image.fromarray(exp_precip_rgb).save(exp_mask_path)
        Image.fromarray(aligned_act_rgb).save(act_mask_path)
        Image.fromarray(diff_mask_rgb).save(diff_mask_path)
        Image.fromarray(combined_exclusion).save(excl_mask_path)

        t1 = time.perf_counter()
        processing_time_ms = round((t1 - t0) * 1000.0, 1)

        return {
            "pair_id": pair_id,
            "similarity_score": similarity_score,
            "threshold": threshold,
            "result": result,
            "margin": margin,
            "metrics": {
                "iou": round(iou, 4),
                "pixel_agreement": round(pixel_agreement, 4),
                "area_similarity": round(area_similarity, 4),
                "intensity_agreement": round(intensity_agreement, 4),
                "spatial_similarity": round(spatial_similarity, 4)
            },
            "shift_dx": dx,
            "shift_dy": dy,
            "constraints_applied": {
                "text_excluded": excl_cfg.get("exclude_text", True),
                "icons_excluded": excl_cfg.get("exclude_icons", True),
                "arc_lines_excluded": excl_cfg.get("exclude_arc_lines", True),
                "legend_excluded": excl_cfg.get("exclude_legend", True)
            },
            "expected_mask_url": f"/data/masks/{exp_mask_filename}",
            "actual_mask_url": f"/data/masks/{act_mask_filename}",
            "diff_mask_url": f"/data/masks/{diff_mask_filename}",
            "exclusion_mask_url": f"/data/masks/{excl_mask_filename}",
            "processing_time_ms": processing_time_ms
        }

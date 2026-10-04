"""
Unit tests for Computer Vision preprocessing, exclusion, and extraction modules.
"""

import os
import numpy as np
import pytest
from app.cv.preprocessing_service import PreprocessingService
from app.cv.cosmetic_filter import CosmeticFilter
from app.cv.precipitation_extractor import PrecipitationExtractor
from app.cv.alignment import ImageAlignment
from app.cv.comparison_engine import ComparisonEngine

def test_preprocessing_pipeline():
    dummy = np.zeros((300, 300, 3), dtype=np.uint8)
    pre = PreprocessingService.preprocess(dummy, target_size=(512, 512), blur_sigma=1.0, apply_morphology=True)
    assert pre.shape == (512, 512, 3)

def test_cosmetic_exclusion_mask():
    dummy = np.zeros((512, 512, 3), dtype=np.uint8)
    # Add dummy text area
    dummy[20:40, 20:100] = 255
    mask = CosmeticFilter.create_exclusion_mask(dummy, exclude_text=True, exclude_icons=True, exclude_arc_lines=True)
    assert mask.shape == (512, 512)
    assert mask.dtype == np.uint8

def test_precipitation_extraction():
    dummy = np.zeros((512, 512, 3), dtype=np.uint8)
    # Draw Green (Low precip)
    dummy[100:200, 100:200] = [30, 200, 70]
    # Draw Yellow (Mod precip)
    dummy[130:170, 130:170] = [250, 225, 30]

    bin_mask, intensity_map, rgb_iso = PrecipitationExtractor.extract_precipitation(dummy)
    assert np.sum(bin_mask > 0) > 0
    assert np.max(intensity_map) == 2
    assert rgb_iso.shape == (512, 512, 3)

def test_alignment():
    mask1 = np.zeros((100, 100), dtype=np.uint8)
    mask2 = np.zeros((100, 100), dtype=np.uint8)
    mask1[30:70, 30:70] = 255
    mask2[32:72, 32:72] = 255  # Shifted by (2, 2)

    dx, dy = ImageAlignment.estimate_translation_shift(mask1, mask2)
    assert abs(dx) <= 3
    assert abs(dy) <= 3

def test_iou_calculation():
    m1 = np.zeros((100, 100), dtype=np.uint8)
    m2 = np.zeros((100, 100), dtype=np.uint8)
    valid = np.ones((100, 100), dtype=np.uint8)

    m1[20:60, 20:60] = 255
    m2[20:60, 20:60] = 255

    iou = ComparisonEngine.calculate_iou(m1, m2, valid)
    assert iou == 1.0

    m2[20:60, 20:60] = 0
    m2[40:80, 20:60] = 255
    iou_partial = ComparisonEngine.calculate_iou(m1, m2, valid)
    assert 0.0 < iou_partial < 1.0

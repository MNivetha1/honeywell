"""
Precipitation Extractor Module
Segments meteorological radar imagery into multi-class intensity layers (0..4) and binary precipitation masks.
"""

import cv2
import numpy as np
from typing import Tuple, Dict, Any

class PrecipitationExtractor:
    # Color references in RGB
    COLOR_LEVELS_RGB = {
        0: np.array([0, 0, 0], dtype=np.uint8),
        1: np.array([30, 200, 70], dtype=np.uint8),    # Low Green
        2: np.array([250, 225, 30], dtype=np.uint8),   # Moderate Yellow
        3: np.array([245, 110, 25], dtype=np.uint8),   # Heavy Orange/Red
        4: np.array([215, 35, 215], dtype=np.uint8)    # Extreme Magenta
    }

    @classmethod
    def extract_precipitation(
        cls,
        image_rgb: np.ndarray,
        exclusion_mask: np.ndarray = None
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """
        Extracts precipitation representations:
        1. binary_mask (uint8: 255 for precipitation, 0 for background)
        2. intensity_map (uint8: 0=None, 1=Low, 2=Mod, 3=Hvy, 4=Ext)
        3. precip_rgb_isolated (isolated RGB image of precipitation)
        """
        h, w = image_rgb.shape[:2]
        intensity_map = np.zeros((h, w), dtype=np.uint8)
        
        # Apply exclusion mask first if provided
        clean_rgb = image_rgb.copy()
        if exclusion_mask is not None:
            clean_rgb[exclusion_mask > 0] = 0

        hsv = cv2.cvtColor(clean_rgb, cv2.COLOR_RGB2HSV)

        # 1. Level 1 (Green: Low ~ 20-30 dBZ)
        # HSV H: 35 to 85, S > 60, V > 60
        mask_lvl1 = cv2.inRange(hsv, np.array([35, 60, 60]), np.array([85, 255, 255]))

        # 2. Level 2 (Yellow: Moderate ~ 30-40 dBZ)
        # HSV H: 20 to 35, S > 100, V > 100
        mask_lvl2 = cv2.inRange(hsv, np.array([20, 100, 100]), np.array([34, 255, 255]))

        # 3. Level 3 (Orange/Red: Heavy ~ 40-50 dBZ)
        # HSV H: 0 to 19 (and 175-180), S > 100, V > 100
        mask_lvl3_a = cv2.inRange(hsv, np.array([0, 100, 100]), np.array([19, 255, 255]))
        mask_lvl3_b = cv2.inRange(hsv, np.array([175, 100, 100]), np.array([180, 255, 255]))
        mask_lvl3 = cv2.bitwise_or(mask_lvl3_a, mask_lvl3_b)

        # 4. Level 4 (Magenta/Purple: Extreme/Hail ~ 50+ dBZ)
        # HSV H: 135 to 174, S > 80, V > 80
        mask_lvl4 = cv2.inRange(hsv, np.array([135, 80, 80]), np.array([174, 255, 255]))

        # Build intensity map (higher level overrides lower)
        intensity_map[mask_lvl1 > 0] = 1
        intensity_map[mask_lvl2 > 0] = 2
        intensity_map[mask_lvl3 > 0] = 3
        intensity_map[mask_lvl4 > 0] = 4

        # Binary precipitation composite mask
        binary_mask = np.zeros((h, w), dtype=np.uint8)
        binary_mask[intensity_map > 0] = 255

        # Morphological cleanup on binary mask to remove isolated single-pixel noise
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        binary_mask = cv2.morphologyEx(binary_mask, cv2.MORPH_OPEN, kernel)
        intensity_map[binary_mask == 0] = 0

        # Isolated RGB
        precip_rgb_isolated = np.zeros((h, w, 3), dtype=np.uint8)
        for lvl in range(1, 5):
            precip_rgb_isolated[intensity_map == lvl] = cls.COLOR_LEVELS_RGB[lvl]

        return binary_mask, intensity_map, precip_rgb_isolated

    @staticmethod
    def calculate_precipitation_metrics(intensity_map: np.ndarray) -> Dict[str, Any]:
        """Calculates area coverage and distribution per intensity level."""
        total_pixels = intensity_map.size
        level_counts = {
            lvl: int(np.sum(intensity_map == lvl))
            for lvl in range(5)
        }
        total_precip_area = sum(level_counts[lvl] for lvl in range(1, 5))
        precip_percentage = (total_precip_area / max(1, total_pixels)) * 100.0

        return {
            "total_precip_pixels": total_precip_area,
            "precip_percentage": round(precip_percentage, 2),
            "level_counts": level_counts,
            "level_percentages": {
                lvl: round((count / max(1, total_pixels)) * 100.0, 2)
                for lvl, count in level_counts.items()
            }
        }

"""
Cosmetic Feature Exclusion Filter
Detects and generates exclusion masks for UI elements:
- Text annotations and timestamps
- Weather icons and waypoint glyphs
- Radar range arcs and radial lines
- Legend boxes and colorbars
"""

import cv2
import numpy as np
from typing import Dict, Any

class CosmeticFilter:
    @staticmethod
    def detect_text(image_rgb: np.ndarray) -> np.ndarray:
        """
        Detects text annotations (station labels, altitude, flight tags, timestamps).
        Text characters feature high contrast, small stroke widths, and distinct aspect ratios.
        """
        h, w = image_rgb.shape[:2]
        text_mask = np.zeros((h, w), dtype=np.uint8)

        # 1. Top and bottom margins commonly hold header text / timestamps in radar displays
        # Also detect high-contrast text anywhere on screen
        gray = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2GRAY)
        
        # Morphological gradient to highlight stroke boundaries
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        gradient = cv2.morphologyEx(gray, cv2.MORPH_GRADIENT, kernel)
        
        # Threshold for high-contrast character edges
        _, stroke_thresh = cv2.threshold(gradient, 45, 255, cv2.THRESH_BINARY)
        
        # Connect character strokes horizontally into word bounding boxes
        word_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (9, 3))
        connected = cv2.morphologyEx(stroke_thresh, cv2.MORPH_CLOSE, word_kernel)

        num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(connected, connectivity=8)
        
        for i in range(1, num_labels):
            x, y, comp_w, comp_h, area = stats[i]
            # Filter for text-like bounding dimensions (small height, reasonable width/area)
            if 4 <= comp_h <= 30 and 4 <= comp_w <= 300 and area < 4000:
                # Check if region is not part of a large precipitation blob
                # Text typically has high luminance variation and thin stroke structure
                roi = gray[y:y+comp_h, x:x+comp_w]
                if np.std(roi) > 20:
                    # Pad text exclusion slightly to ensure full character boundary exclusion
                    pad = 2
                    x0 = max(0, x - pad)
                    y0 = max(0, y - pad)
                    x1 = min(w, x + comp_w + pad)
                    y1 = min(h, y + comp_h + pad)
                    text_mask[y0:y1, x0:x1] = 255

        # Also specifically check top status bar (y: 0 to 70) and bottom (y: 410 to 512) for text
        header_gray = gray[0:70, :]
        _, head_thresh = cv2.threshold(header_gray, 70, 255, cv2.THRESH_BINARY)
        # Dilate slightly
        head_dilated = cv2.dilate(head_thresh, cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5)))
        text_mask[0:70, :][head_dilated > 0] = 255

        return text_mask

    @staticmethod
    def detect_icons(image_rgb: np.ndarray) -> np.ndarray:
        """
        Detects weather icons (lightning symbols, aircraft glyphs, waypoint diamonds, cloud markers).
        These are small isolated geometrical features with sharp corners and high contrast.
        """
        h, w = image_rgb.shape[:2]
        icon_mask = np.zeros((h, w), dtype=np.uint8)

        # Look for distinct icon colors (e.g. bright yellow/amber lightning, pure cyan aircraft, white highlights)
        hsv = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2HSV)
        
        # Yellow / Gold lightning icons
        yellow_mask = cv2.inRange(hsv, np.array([20, 180, 180]), np.array([35, 255, 255]))
        
        # Bright Cyan aircraft icons
        cyan_mask = cv2.inRange(hsv, np.array([85, 180, 180]), np.array([100, 255, 255]))
        
        # Pure white icon borders / highlights
        white_mask = cv2.inRange(hsv, np.array([0, 0, 230]), np.array([180, 40, 255]))

        # High-saturation isolated markers
        combined_icons = cv2.bitwise_or(yellow_mask, cyan_mask)
        combined_icons = cv2.bitwise_or(combined_icons, white_mask)

        num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(combined_icons, connectivity=8)
        for i in range(1, num_labels):
            x, y, comp_w, comp_h, area = stats[i]
            # Icons are compact (area < 800, width & height < 40)
            if 3 <= comp_w <= 40 and 3 <= comp_h <= 40 and area < 800:
                pad = 4
                x0 = max(0, x - pad)
                y0 = max(0, y - pad)
                x1 = min(w, x + comp_w + pad)
                y1 = min(h, y + comp_h + pad)
                icon_mask[y0:y1, x0:x1] = 255

        return icon_mask

    @staticmethod
    def detect_arc_lines(image_rgb: np.ndarray) -> np.ndarray:
        """
        Detects radar concentric range rings (circular arcs) and radial azimuth lines.
        Grid lines typically have low intensity dark cyan/slate color (GRID_COLOR: (24, 48, 76)).
        """
        h, w = image_rgb.shape[:2]
        arc_mask = np.zeros((h, w), dtype=np.uint8)

        # Color threshold for radar grid lines: R: 15-40, G: 35-70, B: 60-100
        lower_grid = np.array([12, 30, 50], dtype=np.uint8)
        upper_grid = np.array([35, 75, 110], dtype=np.uint8)
        grid_pixels = cv2.inRange(image_rgb, lower_grid, upper_grid)

        # Thin circular arcs detection
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        dilated_grid = cv2.dilate(grid_pixels, kernel, iterations=1)
        arc_mask = cv2.bitwise_or(arc_mask, dilated_grid)

        # Geometric range ring overlay matching (standard concentric radii: 60, 120, 180, 230)
        cx, cy = w // 2, h // 2
        for r in [60, 120, 180, 230]:
            cv2.circle(arc_mask, (cx, cy), r, 255, thickness=3)

        # Geometric radial lines (every 45 deg)
        for angle_deg in range(0, 360, 45):
            rad = np.radians(angle_deg)
            x_end = int(cx + 240 * np.cos(rad))
            y_end = int(cy + 240 * np.sin(rad))
            cv2.line(arc_mask, (cx, cy), (x_end, y_end), 255, thickness=3)

        return arc_mask

    @staticmethod
    def detect_legend(image_rgb: np.ndarray) -> np.ndarray:
        """
        Detects the bottom or corner radar dBZ colorbar / legend.
        """
        h, w = image_rgb.shape[:2]
        legend_mask = np.zeros((h, w), dtype=np.uint8)
        # Radar legend is positioned at bottom left: y >= 450, x <= 320
        legend_mask[450:h, 0:320] = 255
        return legend_mask

    @classmethod
    def create_exclusion_mask(
        cls,
        image_rgb: np.ndarray,
        exclude_text: bool = True,
        exclude_icons: bool = True,
        exclude_arc_lines: bool = True,
        exclude_legend: bool = True
    ) -> np.ndarray:
        """
        Generates combined binary exclusion mask.
        Pixels with value 255 are EXCLUDED from comparison.
        Pixels with value 0 are VALID comparison territory.
        """
        h, w = image_rgb.shape[:2]
        total_exclusion = np.zeros((h, w), dtype=np.uint8)

        if exclude_text:
            text_m = cls.detect_text(image_rgb)
            total_exclusion = cv2.bitwise_or(total_exclusion, text_m)

        if exclude_icons:
            icon_m = cls.detect_icons(image_rgb)
            total_exclusion = cv2.bitwise_or(total_exclusion, icon_m)

        if exclude_arc_lines:
            arc_m = cls.detect_arc_lines(image_rgb)
            total_exclusion = cv2.bitwise_or(total_exclusion, arc_m)

        if exclude_legend:
            leg_m = cls.detect_legend(image_rgb)
            total_exclusion = cv2.bitwise_or(total_exclusion, leg_m)

        return total_exclusion

    @staticmethod
    def apply_exclusion_mask(image_rgb: np.ndarray, exclusion_mask: np.ndarray) -> np.ndarray:
        """Masks out excluded regions by setting them to 0."""
        masked = image_rgb.copy()
        masked[exclusion_mask > 0] = 0
        return masked

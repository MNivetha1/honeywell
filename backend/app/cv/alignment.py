"""
Image Alignment and Registration Module
Computes translation shift (dx, dy) between Expected and Actual precipitation masks.
"""

import cv2
import numpy as np
from typing import Tuple

class ImageAlignment:
    @staticmethod
    def estimate_translation_shift(
        expected_mask: np.ndarray,
        actual_mask: np.ndarray
    ) -> Tuple[int, int]:
        """
        Calculates optimal (dx, dy) translation shift using Fourier phase correlation.
        Returns: (dx, dy) where positive dx means actual is shifted right relative to expected.
        """
        # If either mask is empty, no shift
        if np.count_nonzero(expected_mask) == 0 or np.count_nonzero(actual_mask) == 0:
            return 0, 0

        # Convert masks to float32
        exp_f = expected_mask.astype(np.float32)
        act_f = actual_mask.astype(np.float32)

        # Apply Hanning window to prevent edge spectral leakage
        h, w = expected_mask.shape[:2]
        window = cv2.createHanningWindow((w, h), cv2.CV_32F)
        
        shift, response = cv2.phaseCorrelate(act_f, exp_f, window)
        
        # shift is (dx, dy) to align actual to expected
        dx = int(round(shift[0]))
        dy = int(round(shift[1]))

        return dx, dy

    @classmethod
    def align_representation(
        cls,
        actual_mask: np.ndarray,
        actual_intensity: np.ndarray,
        actual_rgb: np.ndarray,
        expected_mask: np.ndarray,
        max_shift_pixels: int = 8,
        enabled: bool = True
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray, int, int]:
        """
        If alignment is enabled and shift is within max_shift_pixels tolerance,
        translates the actual image representation to register with expected image.
        """
        if not enabled or max_shift_pixels <= 0:
            return actual_mask, actual_intensity, actual_rgb, 0, 0

        dx, dy = cls.estimate_translation_shift(expected_mask, actual_mask)

        # Check if shift is within tolerance
        if abs(dx) <= max_shift_pixels and abs(dy) <= max_shift_pixels and (dx != 0 or dy != 0):
            h, w = actual_mask.shape[:2]
            M = np.float32([[1, 0, dx], [0, 1, dy]])
            
            aligned_mask = cv2.warpAffine(actual_mask, M, (w, h), flags=cv2.INTER_NEAREST, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
            aligned_intensity = cv2.warpAffine(actual_intensity, M, (w, h), flags=cv2.INTER_NEAREST, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
            aligned_rgb = cv2.warpAffine(actual_rgb, M, (w, h), flags=cv2.INTER_NEAREST, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
            
            return aligned_mask, aligned_intensity, aligned_rgb, dx, dy

        return actual_mask, actual_intensity, actual_rgb, dx, dy

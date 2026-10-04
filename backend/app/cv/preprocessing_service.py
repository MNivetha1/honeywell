"""
Image Preprocessing Service
Provides validation, normalization, resizing, noise filtering, and morphological conditioning.
"""

import cv2
import numpy as np
from PIL import Image
from typing import Tuple, Optional

class PreprocessingService:
    @staticmethod
    def load_image(image_path: str) -> np.ndarray:
        """Loads an image from disk in RGB format."""
        img_bgr = cv2.imread(image_path, cv2.IMREAD_COLOR)
        if img_bgr is None:
            raise FileNotFoundError(f"Image could not be loaded from path: {image_path}")
        return cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)

    @staticmethod
    def preprocess(
        image_rgb: np.ndarray,
        target_size: Tuple[int, int] = (512, 512),
        blur_sigma: float = 1.2,
        apply_morphology: bool = True
    ) -> np.ndarray:
        """
        Executes standard preprocessing pipeline:
        1. Resizing to target resolution
        2. Gentle Gaussian filtering for sensor/rendering antialiasing noise
        3. Morphological conditioning to smooth rasterization artifacts
        """
        h, w = image_rgb.shape[:2]
        processed = image_rgb.copy()

        # 1. Resize if dimensions differ
        if (w, h) != target_size:
            processed = cv2.resize(processed, target_size, interpolation=cv2.INTER_AREA)

        # 2. Gaussian smoothing for antialiasing & raster noise
        if blur_sigma > 0:
            ksize = int(2 * round(blur_sigma * 2) + 1)
            ksize = max(3, ksize if ksize % 2 == 1 else ksize + 1)
            processed = cv2.GaussianBlur(processed, (ksize, ksize), blur_sigma)

        # 3. Morphological opening/closing if enabled
        if apply_morphology:
            kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
            # Apply slight close to bridge subpixel gaps
            processed = cv2.morphologyEx(processed, cv2.MORPH_CLOSE, kernel)

        return processed

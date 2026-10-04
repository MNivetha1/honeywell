"""
Standalone Synthetic Precipitation Dataset Generator
Generates exactly 100 paired radar-style weather images across 10 evaluation categories:
- 50 PASS pairs (Cosmetic variations: text, icons, arc lines, all cosmetic, small shifts)
- 50 FAIL pairs (Functional discrepancies: medium shifts, intensity changes, removed cells, added cells, shape changes)

Generates:
- data/expected/pair_001.png .. pair_100.png
- data/actual/pair_001.png .. pair_100.png
- data/metadata.csv
- data/config.json
"""

import os
import csv
import json
import math
import random
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

# Deterministic seed for exact reproducibility
RANDOM_SEED = 42
random.seed(RANDOM_SEED)
np.random.seed(RANDOM_SEED)

IMG_WIDTH = 512
IMG_HEIGHT = 512
CENTER = (IMG_WIDTH // 2, IMG_HEIGHT // 2)

# Professional Radar Color Palette (RGB)
BG_COLOR = (8, 14, 28)
GRID_COLOR = (24, 48, 76)
SWEEP_COLOR = (0, 180, 220, 40)
TEXT_COLOR = (180, 210, 240)
TEXT_DIM = (100, 140, 180)
ICON_COLOR = (255, 215, 0)
ICON_CYAN = (0, 229, 255)
ICON_ALERT = (255, 75, 75)

# Standard Radar Reflectivity dBZ Color Map (RGB)
COLOR_LEVELS = {
    0: (0, 0, 0),         # None
    1: (30, 200, 70),     # Low (20-30 dBZ) Green
    2: (250, 225, 30),    # Moderate (30-40 dBZ) Yellow
    3: (245, 110, 25),    # Heavy (40-50 dBZ) Orange/Red
    4: (215, 35, 215)     # Extreme / Hail (50+ dBZ) Magenta/Purple
}

def create_radar_background(draw: ImageDraw.ImageDraw, include_arcs=True, include_radials=True, arc_shift=0):
    """Draws realistic radar range rings and azimuth radials."""
    cx, cy = CENTER
    if include_arcs:
        radii = [60, 120, 180, 230]
        for r in radii:
            shifted_cx = cx + arc_shift
            shifted_cy = cy + arc_shift
            bbox = [shifted_cx - r, shifted_cy - r, shifted_cx + r, shifted_cy + r]
            draw.ellipse(bbox, outline=GRID_COLOR, width=1)

    if include_radials:
        for angle_deg in range(0, 360, 45):
            rad = math.radians(angle_deg)
            x_end = cx + int(240 * math.cos(rad))
            y_end = cy + int(240 * math.sin(rad))
            draw.line([(cx, cy), (x_end, y_end)], fill=(GRID_COLOR[0], GRID_COLOR[1], GRID_COLOR[2]), width=1)

def draw_radar_text(draw: ImageDraw.ImageDraw, text_items, font=None):
    """Draws aviation / radar text annotations."""
    for item in text_items:
        text, pos, color = item
        draw.text(pos, text, fill=color)

def draw_weather_icons(draw: ImageDraw.ImageDraw, icons):
    """Draws icons like lightning, storm symbol, aircraft, waypoint."""
    for icon_type, pos, color, size in icons:
        x, y = pos
        s = size
        if icon_type == "lightning":
            points = [(x, y - s), (x - s//3, y), (x + s//4, y), (x - s//4, y + s), (x + s//2, y - s//4), (x, y - s//4)]
            draw.polygon(points, fill=color, outline=(255, 255, 255))
        elif icon_type == "aircraft":
            points = [(x, y - s), (x + s*2//3, y + s), (x, y + s//2), (x - s*2//3, y + s)]
            draw.polygon(points, fill=color)
        elif icon_type == "waypoint":
            points = [(x, y - s), (x + s, y), (x, y + s), (x - s, y)]
            draw.polygon(points, outline=color, width=2)
        elif icon_type == "cloud":
            draw.ellipse([x - s, y - s//2, x + s, y + s//2], fill=color)
            draw.ellipse([x - s//2, y - s, x + s//2, y], fill=color)

def draw_radar_legend(draw: ImageDraw.ImageDraw, x=15, y=470):
    """Draws dBZ color legend in corner."""
    levels = [(1, "LOW"), (2, "MOD"), (3, "HVY"), (4, "EXT")]
    cur_x = x
    for lvl, label in levels:
        col = COLOR_LEVELS[lvl]
        draw.rectangle([cur_x, y, cur_x + 20, y + 10], fill=col, outline=(50, 70, 90))
        draw.text((cur_x + 24, y), label, fill=TEXT_DIM)
        cur_x += 65

def generate_storm_cells(seed_val, num_cells=3):
    """Generates synthetic storm cell specifications (blobs)."""
    rng = random.Random(seed_val)
    cells = []
    for _ in range(num_cells):
        cx = rng.randint(140, 370)
        cy = rng.randint(140, 370)
        radius = rng.randint(35, 75)
        eccentricity = rng.uniform(0.6, 1.4)
        angle = rng.uniform(0, math.pi)
        cells.append({
            "cx": cx,
            "cy": cy,
            "rx": int(radius * eccentricity),
            "ry": int(radius / eccentricity),
            "angle": angle,
            "intensity": rng.choice([3, 4])
        })
    return cells

def render_precipitation_layer(cells, shift_x=0, shift_y=0, intensity_multiplier=1.0, shape_distortion=0.0, removed_index=None, added_cells=None):
    """Renders multi-level precipitation mask and RGB layer."""
    precip_rgb = np.zeros((IMG_HEIGHT, IMG_WIDTH, 3), dtype=np.uint8)
    precip_intensity = np.zeros((IMG_HEIGHT, IMG_WIDTH), dtype=np.uint8)

    all_cells = [c for i, c in enumerate(cells) if i != removed_index]
    if added_cells:
        all_cells.extend(added_cells)

    # Render each storm cell layer from Level 1 (outer) to Level 4 (core)
    for cell in all_cells:
        cx = cell["cx"] + shift_x
        cy = cell["cy"] + shift_y
        rx = cell["rx"]
        ry = cell["ry"]
        angle = cell["angle"]
        max_lvl = min(4, max(1, int(round(cell["intensity"] * intensity_multiplier))))

        cos_a = math.cos(angle)
        sin_a = math.sin(angle)

        y_coords, x_coords = np.ogrid[:IMG_HEIGHT, :IMG_WIDTH]
        dx = x_coords - cx
        dy = y_coords - cy

        # Rotated coordinates
        x_rot = dx * cos_a + dy * sin_a
        y_rot = -dx * sin_a + dy * cos_a

        # Shape distortion modifier (non-linear distortion)
        if shape_distortion > 0:
            distortion = np.sin(x_rot / 12.0) * (shape_distortion * 15.0)
            norm_dist = ((x_rot + distortion) / max(rx, 1))**2 + (y_rot / max(ry, 1))**2
        else:
            norm_dist = (x_rot / max(rx, 1))**2 + (y_rot / max(ry, 1))**2

        # Level 1 boundary: norm_dist <= 1.0
        # Level 2 boundary: norm_dist <= 0.60
        # Level 3 boundary: norm_dist <= 0.35
        # Level 4 boundary: norm_dist <= 0.15
        thresholds = [
            (1, 1.0),
            (2, 0.60),
            (3, 0.35),
            (4, 0.15)
        ]

        for lvl, th in thresholds:
            if lvl <= max_lvl:
                mask = norm_dist <= th
                precip_intensity[mask] = np.maximum(precip_intensity[mask], lvl)

    # Map intensity level to RGB colors
    for lvl in range(1, 5):
        mask = (precip_intensity == lvl)
        precip_rgb[mask] = COLOR_LEVELS[lvl]

    return precip_rgb, precip_intensity

def compose_radar_image(precip_rgb, background_options, text_items, icons, include_legend=True):
    """Composes the final radar image from precipitation layer, background, and cosmetic elements."""
    img = Image.new("RGB", (IMG_WIDTH, IMG_HEIGHT), BG_COLOR)
    draw = ImageDraw.Draw(img)

    # 1. Background grid & range rings
    create_radar_background(
        draw,
        include_arcs=background_options.get("include_arcs", True),
        include_radials=background_options.get("include_radials", True),
        arc_shift=background_options.get("arc_shift", 0)
    )

    # 2. Blend precipitation layer onto background
    img_np = np.array(img)
    precip_mask = np.any(precip_rgb > 0, axis=-1)
    img_np[precip_mask] = precip_rgb[precip_mask]
    img = Image.fromarray(img_np)
    draw = ImageDraw.Draw(img)

    # 3. Cosmetic weather icons
    draw_weather_icons(draw, icons)

    # 4. Cosmetic text items
    draw_radar_text(draw, text_items)

    # 5. Radar legend
    if include_legend:
        draw_radar_legend(draw)

    return img

def generate_all_100_pairs(data_dir="data"):
    """Generates all 100 pairs according to the 10 specification categories."""
    expected_dir = os.path.join(data_dir, "expected")
    actual_dir = os.path.join(data_dir, "actual")
    os.makedirs(expected_dir, exist_ok=True)
    os.makedirs(actual_dir, exist_ok=True)

    metadata_rows = []

    # Default Base Text Annotations
    default_text = [
        ("NEXRAD KTLX", (15, 15), TEXT_COLOR),
        ("VCP: 212 | ELEV: 0.50°", (15, 32), TEXT_DIM),
        ("RANGE: 120 NM", (15, 48), TEXT_DIM),
        ("MODE: PRECIP", (380, 15), TEXT_COLOR),
        ("TIME: 18:30:00Z", (380, 32), TEXT_DIM),
        ("GAIN: CALIBRATED", (380, 48), TEXT_DIM),
    ]

    # Default Base Icons
    default_icons = [
        ("aircraft", (256, 256), ICON_CYAN, 8),
        ("waypoint", (160, 140), ICON_COLOR, 6),
        ("waypoint", (360, 360), ICON_COLOR, 6),
    ]

    # Category definitions
    categories = [
        {
            "id": 1,
            "name": "Cosmetic text differences",
            "pairs": range(1, 13),      # 12 pairs (001-012)
            "expected_result": "PASS",
            "type": "cosmetic_text"
        },
        {
            "id": 2,
            "name": "Cosmetic icon differences",
            "pairs": range(13, 23),     # 10 pairs (013-022)
            "expected_result": "PASS",
            "type": "cosmetic_icons"
        },
        {
            "id": 3,
            "name": "Cosmetic arc-line differences",
            "pairs": range(23, 33),     # 10 pairs (023-032)
            "expected_result": "PASS",
            "type": "cosmetic_arcs"
        },
        {
            "id": 4,
            "name": "All cosmetic differences",
            "pairs": range(33, 41),     # 8 pairs (033-040)
            "expected_result": "PASS",
            "type": "all_cosmetic"
        },
        {
            "id": 5,
            "name": "Small precipitation shifts",
            "pairs": range(41, 51),     # 10 pairs (041-050)
            "expected_result": "PASS",
            "type": "small_shift"
        },
        {
            "id": 6,
            "name": "Medium precipitation shifts",
            "pairs": range(51, 63),     # 12 pairs (051-062)
            "expected_result": "FAIL",
            "type": "medium_shift"
        },
        {
            "id": 7,
            "name": "Precipitation intensity changes",
            "pairs": range(63, 75),     # 12 pairs (063-074)
            "expected_result": "FAIL",
            "type": "intensity_change"
        },
        {
            "id": 8,
            "name": "Removed precipitation regions",
            "pairs": range(75, 83),     # 8 pairs (075-082)
            "expected_result": "FAIL",
            "type": "removed_region"
        },
        {
            "id": 9,
            "name": "Added precipitation regions",
            "pairs": range(83, 91),     # 8 pairs (083-090)
            "expected_result": "FAIL",
            "type": "added_region"
        },
        {
            "id": 10,
            "name": "Precipitation shape changes",
            "pairs": range(91, 101),    # 10 pairs (091-100)
            "expected_result": "FAIL",
            "type": "shape_change"
        },
    ]

    for cat in categories:
        cat_id = cat["id"]
        cat_name = cat["name"]
        cat_type = cat["type"]
        exp_result = cat["expected_result"]

        for pair_num in cat["pairs"]:
            pair_id = f"pair_{pair_num:03d}"
            seed = pair_num * 101 + 42
            base_cells = generate_storm_cells(seed, num_cells=3)

            # Expected Base Render
            exp_precip_rgb, _ = render_precipitation_layer(base_cells)
            exp_bg_opts = {"include_arcs": True, "include_radials": True, "arc_shift": 0}
            exp_text = list(default_text)
            exp_icons = list(default_icons)
            exp_img = compose_radar_image(exp_precip_rgb, exp_bg_opts, exp_text, exp_icons, include_legend=True)

            # Actual Render based on Category Variation
            act_bg_opts = {"include_arcs": True, "include_radials": True, "arc_shift": 0}
            act_text = list(default_text)
            act_icons = list(default_icons)
            act_precip_rgb = exp_precip_rgb
            desc = ""

            if cat_type == "cosmetic_text":
                # Changed timestamps, extra flight tags, station ID labels
                act_text = [
                    (f"NEXRAD KOKC (STATION {pair_num})", (15, 15), TEXT_COLOR),
                    ("VCP: 121 | ELEV: 1.45°", (15, 32), TEXT_DIM),
                    ("RANGE: 160 NM (ZOOM 1.2x)", (15, 48), TEXT_DIM),
                    ("MODE: SURVEILLANCE", (340, 15), (255, 200, 100)),
                    (f"TIME: 18:{30 + pair_num:02d}:45Z", (340, 32), TEXT_DIM),
                    (f"FLIGHT FL{280 + pair_num*5} DESCENDING", (180, 200), (255, 255, 0)),
                    ("TURBULENCE SIGMET 42", (20, 430), (255, 100, 100)),
                ]
                desc = "Text annotations, flight labels, and timestamps modified. Precipitation identical."

            elif cat_type == "cosmetic_icons":
                # Extra lightning bolts, cloud symbols, shifted aircraft position
                act_icons = list(default_icons)
                act_icons.append(("lightning", (base_cells[0]["cx"] + 10, base_cells[0]["cy"] - 10), ICON_ALERT, 12))
                act_icons.append(("lightning", (base_cells[1]["cx"] - 15, base_cells[1]["cy"] + 15), ICON_ALERT, 10))
                act_icons.append(("cloud", (100, 200), (140, 170, 210), 16))
                act_icons[0] = ("aircraft", (290, 230), ICON_CYAN, 8) # Moved aircraft symbol
                desc = "Weather icons (lightning, storm symbols, aircraft positions) added/moved. Precipitation identical."

            elif cat_type == "cosmetic_arcs":
                # Arc range rings shifted / different radial count
                act_bg_opts = {"include_arcs": True, "include_radials": False, "arc_shift": 8}
                desc = "Radar range rings and azimuth radials modified/shifted. Precipitation identical."

            elif cat_type == "all_cosmetic":
                # Text, icons, and arc lines all differ
                act_text = [
                    ("RADAR-X V2.0", (15, 15), (0, 255, 200)),
                    (f"SWEEP {pair_num} COMPLETE", (360, 15), TEXT_DIM),
                    ("ALT: 32000 FT", (200, 420), (255, 255, 150)),
                ]
                act_icons = [
                    ("lightning", (base_cells[0]["cx"], base_cells[0]["cy"]), ICON_ALERT, 14),
                    ("waypoint", (200, 200), ICON_COLOR, 8),
                    ("aircraft", (320, 180), (255, 100, 255), 10),
                ]
                act_bg_opts = {"include_arcs": True, "include_radials": False, "arc_shift": 12}
                desc = "Combined cosmetic changes (text, icons, range rings). Precipitation representation identical."

            elif cat_type == "small_shift":
                # 1 to 2 pixel micro-shift (functionally equivalent under tolerance/alignment)
                shift_dx = 1 if (pair_num % 2 == 0) else -1
                shift_dy = 1 if (pair_num % 3 == 0) else -1
                act_precip_rgb, _ = render_precipitation_layer(base_cells, shift_x=shift_dx, shift_y=shift_dy)
                desc = f"Micro sub-resolution translation shift (dx={shift_dx}, dy={shift_dy}px). Functionally equivalent."

            elif cat_type == "medium_shift":
                # 18 to 35 pixel shift (significant functional discrepancy -> FAIL)
                shift_dx = 20 + (pair_num % 15)
                shift_dy = -18 - (pair_num % 10)
                act_precip_rgb, _ = render_precipitation_layer(base_cells, shift_x=shift_dx, shift_y=shift_dy)
                desc = f"Significant precipitation location shift (dx={shift_dx}px, dy={shift_dy}px). Exceeds alignment threshold."

            elif cat_type == "intensity_change":
                # Significant intensity level mismatch (e.g. Severe Level 4 core degraded to Level 1 Low rain, or vice versa)
                if pair_num % 2 == 0:
                    multiplier = 0.30  # Drops 4 -> 1, 3 -> 1
                else:
                    # Modify cell intensity directly to level 1 for odd pairs
                    modified_cells = []
                    for c in base_cells:
                        mc = dict(c)
                        mc["intensity"] = 1  # Downgrade storm core to light rain
                        modified_cells.append(mc)
                    act_precip_rgb, _ = render_precipitation_layer(modified_cells, intensity_multiplier=1.0)
                    desc = f"Precipitation intensity level downgraded to light rain."
                if pair_num % 2 == 0:
                    act_precip_rgb, _ = render_precipitation_layer(base_cells, intensity_multiplier=multiplier)
                    desc = f"Precipitation intensity level mismatch (scale factor {multiplier}x)."

            elif cat_type == "removed_region":
                # Primary prominent storm cell cluster missing in actual
                largest_idx = int(np.argmax([c["rx"] * c["ry"] for c in base_cells]))
                act_precip_rgb, _ = render_precipitation_layer(base_cells, removed_index=largest_idx)
                desc = "Critical primary precipitation cell missing in actual rendering."

            elif cat_type == "added_region":
                # Significant false precipitation artifact / ghost storm added in distinct radar sector
                fake_cell = [{
                    "cx": 80 + (pair_num * 37) % 320,
                    "cy": 80 + (pair_num * 41) % 320,
                    "rx": 70,
                    "ry": 60,
                    "angle": 0.5,
                    "intensity": 3
                }]
                act_precip_rgb, _ = render_precipitation_layer(base_cells, added_cells=fake_cell)
                desc = "Uncorrelated ghost precipitation storm cluster added in actual rendering."

            elif cat_type == "shape_change":
                # Severe morphological elongation / distortion
                act_precip_rgb, _ = render_precipitation_layer(base_cells, shape_distortion=1.2)
                desc = "Precipitation boundary shape severely distorted / sheared."

            # Compose actual image
            act_img = compose_radar_image(act_precip_rgb, act_bg_opts, act_text, act_icons, include_legend=True)

            # Save pair images
            exp_path = os.path.join(expected_dir, f"{pair_id}.png")
            act_path = os.path.join(actual_dir, f"{pair_id}.png")
            exp_img.save(exp_path, "PNG")
            act_img.save(act_path, "PNG")

            metadata_rows.append({
                "pair_id": pair_id,
                "expected_image": f"expected/{pair_id}.png",
                "actual_image": f"actual/{pair_id}.png",
                "category_id": cat_id,
                "category_name": cat_name,
                "expected_result": exp_result,
                "description": desc
            })

    # Write metadata.csv
    csv_path = os.path.join(data_dir, "metadata.csv")
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "pair_id", "expected_image", "actual_image", "category_id", "category_name", "expected_result", "description"
        ])
        writer.writeheader()
        writer.writerows(metadata_rows)

    # Write default config.json
    config_data = {
        "image_processing": {
            "resize": True,
            "width": 512,
            "height": 512,
            "blur": 1.2,
            "morphology": True
        },
        "feature_exclusion": {
            "exclude_text": True,
            "exclude_icons": True,
            "exclude_arc_lines": True,
            "exclude_legend": True
        },
        "alignment": {
            "alignment_enabled": True,
            "max_shift_pixels": 8
        },
        "scoring": {
            "overlap_weight": 40.0,
            "intensity_weight": 30.0,
            "area_weight": 20.0,
            "spatial_weight": 10.0
        },
        "decision": {
            "threshold_percent": 90.0
        }
    }
    config_path = os.path.join(data_dir, "config.json")
    with open(config_path, "w", encoding="utf-8") as f:
        json.dump(config_data, f, indent=2)

    print(f"Successfully generated {len(metadata_rows)} paired radar images in '{data_dir}'.")
    print(f"50 PASS pairs and 50 FAIL pairs written to metadata.csv and config.json.")

if __name__ == "__main__":
    generate_all_100_pairs()

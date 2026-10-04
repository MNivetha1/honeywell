# Precipitation Rendering Functional Equivalence Analyzer

An automated computer-vision quality assurance and validation platform for meteorological radar displays. The system analyzes paired radar precipitation images to quantitatively determine whether expected and actual weather renderings are **functionally equivalent**, ignoring cosmetic UI variations (such as flight labels, timestamps, weather icons, radar range arcs, and legends).

---

## 1. Key Highlights & Capabilities

- **Representation-Based CV Comparison**: Compares the true meteorological precipitation footprint and reflectivity levels, not cosmetic screenshot pixels.
- **Automated Cosmetic Exclusion Filter**: Modular OpenCV detectors automatically mask out:
  - Text annotations, timestamps, flight tags, and station IDs.
  - Weather glyphs, aircraft symbols, and waypoint markers.
  - Radar concentric range rings and azimuth radial sweep lines.
  - Corner dBZ reflectivity legend boxes.
- **Multi-Level Intensity Segmentation**: Classifies radar reflectivity into discrete meteorological levels (Low, Moderate, Heavy, Extreme dBZ).
- **Fourier Phase-Correlation Alignment**: Computes subpixel $(dx, dy)$ translation jitter to distinguish subpixel raster shifts from functional displacement.
- **Multi-Dimensional Equivalence Scoring (0–100%)**:
  - **40%** Precipitation Mask IoU (Intersection over Union)
  - **30%** Reflectivity Intensity Agreement
  - **20%** Storm Area Footprint Similarity
  - **10%** Spatial Moment Distribution Correlation
- **Interactive Multi-Page Web App**:
  - **Dashboard**: Real-time KPI cards, Pass/Fail donut chart, score distribution histogram, variation category breakdown, and processing latency timeline.
  - **Dataset Management**: Drag-and-drop archive ingestion, automatic pair discovery, metadata validation, and pairing status telemetry.
  - **Batch Comparison**: Asynchronous background queue with live progress percentage, running PASS/FAIL tally, and real-time event streaming.
  - **Results Table**: Paginated, filterable (PASS/FAIL, score range), searchable, and sortable data table.
  - **Pair Inspector**: Multi-tab diagnostics with wipe-slider comparison, extracted masks, false-color difference heatmaps, and mathematical breakdown.
  - **Configuration**: Live weight-sum validation (must equal 100%), threshold adjustment, exclusion toggles, and SQLite persistence.
  - **Reports & Export**: One-click download of structured JSON and styled multi-tab Excel (`.xlsx`) spreadsheets.
  - **System Telemetry**: Backend health, dependency versions, SQLite WAL status, and NOAA/NEXRAD real radar adapter readiness.

---

## 2. Fundamental Algorithm Principle

```
+---------------------------------------------------------------------------------------------------------+
|                                    CV FUNCTIONAL EQUIVALENCE FLOW                                       |
+---------------------------------------------------------------------------------------------------------+
|                                                                                                         |
|   [ Expected Radar Image ]                              [ Actual Candidate Image ]                      |
|              |                                                      |                                   |
|              v                                                      v                                   |
|   1. Preprocessing (512x512, Blur sigma=1.2)           1. Preprocessing (512x512, Blur sigma=1.2)      |
|              |                                                      |                                   |
|              v                                                      v                                   |
|   2. Cosmetic Feature Masking                           2. Cosmetic Feature Masking                     |
|      (Text, Flight Icons, Range Arcs, Legend)               (Text, Flight Icons, Range Arcs, Legend)     |
|              |                                                      |                                   |
|              v                                                      v                                   |
|   3. Precipitation Multi-Class Extraction               3. Precipitation Multi-Class Extraction         |
|      (Level 1=Low, 2=Mod, 3=Hvy, 4=Ext dBZ)                 (Level 1=Low, 2=Mod, 3=Hvy, 4=Ext dBZ)      |
|              |                                                      |                                   |
|              +--------------------------+---------------------------+                                   |
|                                         |                                                               |
|                                         v                                                               |
|                      4. Image Registration & Alignment                                                  |
|                         (Phase-correlation subpixel shift dx, dy)                                       |
|                                         |                                                               |
|                                         v                                                               |
|                      5. Multi-Dimensional Comparison Engine                                             |
|                         * Precipitation Mask IoU (40% Weight)                                           |
|                         * Multi-Class Intensity Agreement (30% Weight)                                  |
|                         * Precipitation Area Similarity (20% Weight)                                    |
|                         * Spatial Distribution Correlation (10% Weight)                                 |
|                                         |                                                               |
|                                         v                                                               |
|                      6. Composite Score (0.0% to 100.0%)                                                |
|                                         |                                                               |
|                                         v                                                               |
|                      7. PASS / FAIL Engine (Threshold >= 90%)                                           |
|                                                                                                         |
+---------------------------------------------------------------------------------------------------------+
```

---

## 3. Technology Stack

### Frontend
- **Framework**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS (Dark Radar Theme & Glassmorphism)
- **Charts**: Recharts (Donut, Bar, Stacked Horizontal Bar, Latency Area charts)
- **Icons**: Lucide React
- **Architecture**: Multi-page layout, modular services, custom hooks, typed API client

### Backend
- **Framework**: FastAPI & Uvicorn
- **Computer Vision**: OpenCV (Headless), NumPy, Pillow, scikit-image
- **Database**: SQLite with SQLAlchemy ORM (WAL mode)
- **Export & Data Processing**: openpyxl, pandas, JSON
- **Testing**: Pytest & FastAPI TestClient

---

## 4. Project Directory Structure

```
precipitation-equivalence-analyzer/
│
├── frontend/
│   ├── src/
│   │   ├── api/          # Typed API client
│   │   ├── charts/       # Recharts data visualizations
│   │   ├── components/   # Reusable UI components (ImageViewer, MetricCard, Badge, Navbar, Sidebar)
│   │   ├── layouts/      # MainLayout shell
│   │   ├── pages/        # 8 dedicated pages
│   │   ├── types/        # TypeScript interfaces
│   │   ├── utils/        # Utility helpers (cn, format)
│   │   ├── App.tsx       # Root state & router
│   │   ├── main.tsx      # Entrypoint
│   │   └── index.css     # Radar grid theme
│   ├── package.json
│   └── vite.config.ts
│
├── backend/
│   ├── app/
│   │   ├── api/          # REST API endpoints (health, dataset, compare, config, reports)
│   │   ├── cv/           # CV modules (preprocessing, cosmetic_filter, extractor, alignment, comparison_engine)
│   │   ├── database/     # SQLite models and session
│   │   ├── schemas/      # Pydantic schemas
│   │   ├── services/     # Business logic & background workers
│   │   └── main.py       # FastAPI application
│   ├── tests/            # Pytest test suite & 100-pair evaluation
│   ├── requirements.txt
│   └── check_scores.py   # Telemetry diagnostic script
│
├── data/
│   ├── expected/         # Expected reference radar images
│   ├── actual/           # Actual candidate radar images
│   ├── masks/            # Generated diagnostic masks & difference heatmaps
│   ├── metadata.csv      # Ground-truth evaluation reference
│   ├── config.json       # Initial configuration
│   └── app.db            # SQLite database
│
├── reports/              # Persisted JSON & Excel validation reports
├── generate_dataset.py   # Reproducible 100-pair synthetic dataset generator
├── README.md
└── .gitignore
```

---

## 5. Dataset Overview

The benchmark dataset contains **exactly 100 paired radar images** across **10 evaluation categories** (50 Ground-Truth PASS, 50 Ground-Truth FAIL):

| # | Category Name | Pairs | Ground Truth | Description |
|---|---------------|-------|--------------|-------------|
| 1 | Cosmetic text differences | 001–012 (12) | **PASS** | Text labels, station IDs, altitude tags differ; precipitation is identical. |
| 2 | Cosmetic icon differences | 013–022 (10) | **PASS** | Lightning bolts, aircraft symbols, waypoints added/moved; precipitation is identical. |
| 3 | Cosmetic arc-line differences | 023–032 (10) | **PASS** | Range rings and azimuth radials shifted/different; precipitation is identical. |
| 4 | All cosmetic differences | 033–040 (8) | **PASS** | Text, icons, and range rings differ simultaneously; precipitation is identical. |
| 5 | Small precipitation shifts | 041–050 (10) | **PASS** | Subpixel micro-shifts ($\le 2\text{px}$) within alignment tolerance; functionally equivalent. |
| 6 | Medium precipitation shifts | 051–062 (12) | **FAIL** | Substantial storm translation ($>15\text{px}$); exceeds tolerance. |
| 7 | Precipitation intensity changes | 063–074 (12) | **FAIL** | Core storm reflectivity downgraded or altered across dBZ categories. |
| 8 | Removed precipitation regions | 075–082 (8) | **FAIL** | Prominent storm cell missing from candidate rendering. |
| 9 | Added precipitation regions | 083–090 (8) | **FAIL** | False/ghost precipitation cluster rendered in candidate. |
| 10 | Precipitation shape changes | 091–100 (10) | **FAIL** | Severe morphological distortion, elongation, or shearing of storm boundaries. |

---

## 6. Installation and 1-Click Quickstart

### Option A: 1-Click Run (Windows Batch / PowerShell) - Recommended

Simply double-click or run from the project root:

```bash
# Windows Command Prompt / Double-Click
run.bat
# or
start.bat

# Windows PowerShell
.\start.ps1
```

This will automatically:
1. Initialize the Python virtual environment and install backend requirements.
2. Generate the 100-pair benchmark dataset if not already generated.
3. Install frontend dependencies.
4. Launch the FastAPI backend (`http://127.0.0.1:8000`) and the Vite React frontend (`http://localhost:5173`).
5. Open your default web browser directly to the dashboard!

---

### Option B: Standalone Single-Port Mode (Production)

If you wish to run the entire full-stack application as a single process on port 8000:

```bash
run_standalone.bat
```
Navigate to: `http://127.0.0.1:8000`

---

### Option C: Manual Development Setup

#### Backend Setup:
```bash
# 1. Navigate to backend directory
cd backend

# 2. Create and activate virtual environment
python -m venv venv
venv\Scripts\activate      # Windows
# source venv/bin/activate # Linux/macOS

# 3. Install dependencies
pip install -r requirements.txt

# 4. Generate the 100-pair synthetic benchmark dataset (if not already present)
python ../generate_dataset.py

# 5. Start the FastAPI server
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Backend API Swagger Docs: `http://127.0.0.1:8000/docs`


### Frontend Setup

```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install npm dependencies
npm install

# 3. Launch Vite development server
npm run dev
```

Frontend Dashboard UI: `http://localhost:5173`

---

## 7. Automated Testing and Evaluation

Run the complete test suite:

```bash
cd backend
venv\Scripts\python.exe -m pytest tests -v -s
```

### Benchmark Evaluation Results Summary

```
==========================================
100-PAIR EVALUATION RESULTS SUMMARY
==========================================
Total Evaluated:  100
True PASS (TP):   50 / 50 (100.0%)
True FAIL (TN):   50 / 50 (100.0%)
False PASS (FP):  0
False FAIL (FN):  0
Overall Accuracy: 100.0%
PASS Precision:   100.0%
FAIL Precision:   100.0%
==========================================
```

---

## 8. REST API Endpoints Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Operational health of API, SQLite database, and CV engine |
| `GET` | `/api/system/info` | Runtime environment, OpenCV/Python versions, and database metrics |
| `GET` | `/api/dataset/statistics` | Summary counts of expected, actual, matched, and missing pairs |
| `GET` | `/api/dataset/pairs` | List all image pairs with filtering and latest analysis results |
| `GET` | `/api/dataset/pairs/{pair_id}` | Retrieve single pair metadata and file paths |
| `DELETE` | `/api/dataset/pairs/{pair_id}` | Delete image pair, diagnostic masks, and comparison results |
| `POST` | `/api/dataset/upload-pair` | Upload single pair (expected + actual images) and run instant test |
| `POST` | `/api/dataset/upload` | Ingest complete dataset ZIP archive with automatic pair mapping |
| `POST` | `/api/compare/{pair_id}` | Execute CV equivalence comparison on a specific image pair |
| `POST` | `/api/compare/batch` | Trigger asynchronous background batch comparison across all pairs |
| `GET` | `/api/compare/job/{job_id}` | Real-time progress and telemetry polling for running batch jobs |
| `GET` | `/api/results` | Paginated, filterable, sortable comparison records table |
| `GET` | `/api/results/{pair_id}` | Detailed diagnostic breakdown for Pair Inspector |
| `GET` | `/api/metrics/summary` | Dashboard metrics, score distribution, and confusion matrix |
| `GET` | `/api/config` | Retrieve currently active pipeline configuration |
| `PUT` | `/api/config` | Update thresholds, exclusion flags, and scoring weights |
| `POST` | `/api/config/reset` | Restore factory default settings |
| `GET` | `/api/reports/json` | Download complete validation run in JSON format |
| `GET` | `/api/reports/excel` | Download formatted multi-sheet Excel spreadsheet (`.xlsx`) |
| `GET` | `/api/reports/summary` | Executive summary data for reports preview |

---

## 9. Real Radar Data Support (NOAA / NEXRAD / RIDGE)

The system includes a dedicated abstraction layer (`backend/app/cv/radar_data_adapter.py`) to ingest real meteorological radar formats:
- **NOAA NEXRAD Level II & Level III**
- **NWS RIDGE II Radar Imagery**
- **Cartesian & Polar PPI Coordinate Transformations**

This ensures the analyzer is extensible to operational radar pipelines beyond synthetic benchmarks.

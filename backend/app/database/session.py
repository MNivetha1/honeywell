"""
Database session and SQLite engine initialization
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from .models import Base, ConfigurationModel

DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../data/app.db"))
DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """FastAPI Dependency for database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_database():
    """Initializes tables and seeds default configuration if not present."""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    Base.metadata.create_all(bind=engine)

    with SessionLocal() as db:
        config = db.query(ConfigurationModel).filter(ConfigurationModel.id == 1).first()
        if not config:
            default_config = ConfigurationModel(
                id=1,
                name="active_config",
                resize=True,
                width=512,
                height=512,
                blur=1.2,
                morphology=True,
                exclude_text=True,
                exclude_icons=True,
                exclude_arc_lines=True,
                exclude_legend=True,
                alignment_enabled=True,
                max_shift_pixels=8,
                overlap_weight=40.0,
                intensity_weight=30.0,
                area_weight=20.0,
                spatial_weight=10.0,
                threshold_percent=90.0
            )
            db.add(default_config)
            db.commit()

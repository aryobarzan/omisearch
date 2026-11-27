"""Shared pytest fixtures for API integration tests."""

from __future__ import annotations

from collections.abc import Generator
from pathlib import Path

from fastapi.testclient import TestClient
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

import database.seed as seed_module
from database.base import Base
from database.session import get_db
import main as main_module


@pytest.fixture()
def client(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> Generator[TestClient, None, None]:
    """Provide a FastAPI TestClient backed by an isolated temporary SQLite database."""
    db_path = tmp_path / "test_omisearch.db"
    test_engine = create_engine(
        f"sqlite:///{db_path}", connect_args={"check_same_thread": False}
    )
    TestingSessionLocal = sessionmaker(
        autocommit=False, autoflush=False, bind=test_engine
    )
    Base.metadata.create_all(bind=test_engine)

    def override_get_db() -> Generator[Session, None, None]:
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    monkeypatch.setattr(main_module, "engine", test_engine)
    monkeypatch.setattr(seed_module, "SessionLocal", TestingSessionLocal)
    main_module.app.dependency_overrides[get_db] = override_get_db

    try:
        with TestClient(main_module.app) as test_client:
            yield test_client
    finally:
        main_module.app.dependency_overrides.clear()
        test_engine.dispose()

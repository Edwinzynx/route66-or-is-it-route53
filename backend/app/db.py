"""SQLite connections are short-lived, transactional, and foreign-key aware."""
import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path


def database_path() -> Path:
    return Path(os.getenv("DATABASE_PATH", str(Path(__file__).resolve().parents[1] / "data" / "route53.db")))


@contextmanager
def connection():
    path = database_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(path, timeout=15)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys = ON")
    try:
        with db:
            yield db
    finally:
        db.close()


def initialize():
    with connection() as db:
        db.execute("PRAGMA journal_mode = WAL")
        db.executescript("""
            CREATE TABLE IF NOT EXISTS sessions (
                token_hash TEXT PRIMARY KEY,
                username TEXT NOT NULL,
                expires_at INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS hosted_zones (
                id TEXT PRIMARY KEY,
                owner TEXT NOT NULL,
                name TEXT NOT NULL,
                description TEXT NOT NULL DEFAULT '',
                type TEXT NOT NULL CHECK(type IN ('Public', 'Private')),
                created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
                UNIQUE(owner, name, type)
            );
            CREATE TABLE IF NOT EXISTS records (
                id TEXT PRIMARY KEY,
                zone_id TEXT NOT NULL REFERENCES hosted_zones(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                ttl INTEGER NOT NULL CHECK(ttl BETWEEN 0 AND 2147483647),
                values_json TEXT NOT NULL,
                system INTEGER NOT NULL DEFAULT 0,
                UNIQUE(zone_id, name, type)
            );
            CREATE INDEX IF NOT EXISTS idx_zones_owner ON hosted_zones(owner);
            CREATE INDEX IF NOT EXISTS idx_records_zone ON records(zone_id);
        """)

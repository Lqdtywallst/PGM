"""Load YAML config and JSON data files."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import yaml


def repo_root() -> Path:
    return Path(__file__).resolve().parent.parent


def load_config(path: Path | None = None) -> dict[str, Any]:
    p = path or repo_root() / "config.yaml"
    with open(p, encoding="utf-8") as f:
        return yaml.safe_load(f)


def load_json(path: Path) -> Any:
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def load_fleet() -> dict:
    return load_json(repo_root() / "data" / "fleet.json")


def load_market() -> dict:
    return load_json(repo_root() / "data" / "market_benchmarks.json")

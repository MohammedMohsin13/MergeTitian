import json
from pathlib import Path
from typing import Any, Dict, List

DATA_DIR = Path(__file__).resolve().parent
DATASET_FILE = DATA_DIR / "dataset.json"


def load_dataset() -> List[Dict[str, Any]]:
    """Loads and returns benchmark pull request data from dataset.json."""
    if not DATASET_FILE.exists():
        return []

    with open(DATASET_FILE, "r", encoding="utf-8") as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return []


__all__ = ["load_dataset", "DATA_DIR", "DATASET_FILE"]

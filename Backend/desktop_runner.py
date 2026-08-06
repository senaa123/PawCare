"""
Backend/desktop_runner.py
=========================
Launched by the Electron main process as a child subprocess when running
the packaged desktop app.

Usage (called internally by Electron):
    python desktop_runner.py

Starts Uvicorn on 127.0.0.1:8000 (localhost-only, not exposed on LAN).
"""

import os
import sys
from pathlib import Path

# Ensure the Backend directory is on the Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

import uvicorn


def main() -> None:
    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=8000,
        reload=False,         # no reload in packaged mode
        log_level="warning",  # quieter logs when run as a subprocess
    )


if __name__ == "__main__":
    main()

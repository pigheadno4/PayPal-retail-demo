#!/usr/bin/env python3
"""Rebuild repo-local Graphify graphs from Git hooks.

Git hooks run from the repository root, while this repo can keep a graph under a
specific demo folder. This helper finds every relevant graphify-out/ directory
and invokes Graphify's code-only rebuild against the owning folder.
"""

from __future__ import annotations

import os
import signal
import sys
from pathlib import Path

from graphify.watch import _apply_resource_limits, _rebuild_code


REPO_ROOT = Path.cwd().resolve()
SKIP_DIRS = {".git", "node_modules", ".superpowers", "graphify-out"}


def main() -> int:
    mode = sys.argv[1] if len(sys.argv) > 1 else "post-commit"
    changed_paths = parse_changed_paths()
    roots = (
        graph_roots_for_changed_paths(changed_paths)
        if mode == "post-commit"
        else all_graph_roots()
    )

    if not roots:
        print("[graphify hook] No graphify-out directory matched; skipping rebuild.")
        return 0

    _apply_resource_limits()
    configure_timeout()
    force = os.environ.get("GRAPHIFY_FORCE", "").lower() in {"1", "true", "yes"}

    print(f"[graphify hook] Rebuilding {len(roots)} graph(s)...")
    all_rebuilt = True
    for root in roots:
        root_changed = relative_changed_paths(root, changed_paths)
        print(f"[graphify hook] Rebuilding {relative_label(root)}")
        rebuilt = _rebuild_code(
            root,
            changed_paths=root_changed or None,
            force=force,
        )
        all_rebuilt = rebuilt and all_rebuilt

    return 0 if all_rebuilt else 1


def parse_changed_paths() -> list[Path]:
    changed_raw = os.environ.get("GRAPHIFY_CHANGED", "")
    return [Path(line.strip()) for line in changed_raw.splitlines() if line.strip()]


def graph_roots_for_changed_paths(changed_paths: list[Path]) -> list[Path]:
    roots: set[Path] = set()
    if (REPO_ROOT / "graphify-out").is_dir():
        roots.add(REPO_ROOT)

    for changed_path in changed_paths:
        absolute_path = (REPO_ROOT / changed_path).resolve()
        current = absolute_path if absolute_path.is_dir() else absolute_path.parent

        while is_inside_repo(current):
            if current.name in SKIP_DIRS:
                break
            if (current / "graphify-out").is_dir():
                roots.add(current)
                break
            if current == REPO_ROOT:
                break
            current = current.parent

    return sorted(roots, key=str)


def all_graph_roots() -> list[Path]:
    roots: list[Path] = []
    if (REPO_ROOT / "graphify-out").is_dir():
        roots.append(REPO_ROOT)

    for current, dirs, _files in os.walk(REPO_ROOT):
        current_path = Path(current)
        has_graph_dir = "graphify-out" in dirs
        dirs[:] = [name for name in dirs if name not in SKIP_DIRS]
        if has_graph_dir:
            roots.append(current_path)

    deduped: list[Path] = []
    seen: set[Path] = set()
    for root in roots:
        resolved = root.resolve()
        if resolved not in seen:
            seen.add(resolved)
            deduped.append(resolved)

    return sorted(deduped, key=str)


def relative_changed_paths(root: Path, changed_paths: list[Path]) -> list[Path]:
    relative_paths: list[Path] = []
    for changed_path in changed_paths:
        absolute_path = (REPO_ROOT / changed_path).resolve()
        try:
            relative_paths.append(absolute_path.relative_to(root))
        except ValueError:
            continue
    return relative_paths


def is_inside_repo(path: Path) -> bool:
    try:
        path.relative_to(REPO_ROOT)
    except ValueError:
        return False
    return True


def relative_label(path: Path) -> Path:
    return path.relative_to(REPO_ROOT) if path != REPO_ROOT else Path(".")


def configure_timeout() -> None:
    timeout = int(os.environ.get("GRAPHIFY_REBUILD_TIMEOUT", "600"))
    if timeout > 0 and hasattr(signal, "SIGALRM"):
        signal.signal(
            signal.SIGALRM,
            lambda *_: (_ for _ in ()).throw(
                TimeoutError(f"graphify rebuild exceeded {timeout}s"),
            ),
        )
        signal.alarm(timeout)


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except TimeoutError as exc:
        print(f"[graphify hook] {exc}", flush=True)
        raise SystemExit(1)
    except Exception as exc:
        print(f"[graphify hook] Rebuild failed: {exc}", flush=True)
        raise SystemExit(1)

#!/usr/bin/env python3
"""Download all "Les Pieds sur Terre" episodes from a local HTML dump.

Usage:
    python3 download_episodes.py [path/to/page.html]

Defaults to searching for a podcast list HTML file in the current dir and in
./_archives/. Extracts (episode_number, title, mp3_url) from each
`<div class="PodcastEpisode">`, skips episode 102 (autopromo), and downloads
each mp3 into ./mp3/ as "NNN - Title.mp3". Idempotent.
"""
from __future__ import annotations

import html
import os
import re
import subprocess
import sys
import time
from html.parser import HTMLParser
from pathlib import Path

DEFAULT_HTML_CANDIDATES = [
    Path("liste-podcast copy.html"),
    Path("liste-podcast.html"),
    Path("_archives/liste-podcast copy.html"),
    Path("_archives/liste-podcast.html"),
]
OUT_DIR = Path("mp3")
SKIP_IDS = {"102"}
USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"


class EpisodeParser(HTMLParser):
    """State-machine parser. The HTML structure is:

        <div class="PodcastEpisode" data-id="N">
          ...
          <div class="EpTitle">
            <div ...>N</div>Title text (possibly multi-line, with entities)
          </div>
          ...
          <div ... data-mp3="https://...mp3">
          ...
        </div>
    """

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.episodes: list[dict] = []
        self._depth = 0
        self._in_episode = False
        self._episode_depth = 0
        self._current: dict | None = None
        self._in_ep_title = False
        self._ep_title_depth = 0
        self._in_ep_title_number = False
        self._title_chars: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        a = dict(attrs)
        cls = a.get("class", "") or ""

        if tag == "div" and "PodcastEpisode" in cls.split():
            self._in_episode = True
            self._episode_depth = 1
            self._current = {"num": a.get("data-id", ""), "title": "", "url": ""}
            return

        if self._in_episode:
            if tag == "div":
                self._episode_depth += 1

            if self._in_ep_title and tag == "div":
                self._ep_title_depth += 1
                # The first nested div inside EpTitle holds the episode number
                # (e.g. "1"). Skip its text so we don't double-count.
                if self._ep_title_depth == 2:
                    self._in_ep_title_number = True

            if tag == "div" and "EpTitle" in cls.split():
                self._in_ep_title = True
                self._ep_title_depth = 1
                self._title_chars = []

            if "data-mp3" in a and a["data-mp3"]:
                # Take the first data-mp3 we see in this episode block.
                if self._current is not None and not self._current["url"]:
                    self._current["url"] = a["data-mp3"]

    def handle_endtag(self, tag: str) -> None:
        if not self._in_episode:
            return

        if self._in_ep_title and tag == "div":
            if self._in_ep_title_number and self._ep_title_depth == 2:
                self._in_ep_title_number = False
            self._ep_title_depth -= 1
            if self._ep_title_depth == 0:
                self._in_ep_title = False
                if self._current is not None:
                    self._current["title"] = "".join(self._title_chars)

        if tag == "div":
            self._episode_depth -= 1
            if self._episode_depth == 0:
                if self._current and self._current["url"]:
                    self.episodes.append(self._current)
                self._current = None
                self._in_episode = False

    def handle_data(self, data: str) -> None:
        if self._in_ep_title and not self._in_ep_title_number:
            self._title_chars.append(data)


def sanitize_title(raw: str) -> str:
    # convert_charrefs=True already decoded &nbsp; (U+00A0) — normalize it.
    t = raw.replace(" ", " ")
    t = re.sub(r"\s+", " ", t).strip()
    # Replace OS-unsafe chars.
    t = t.replace("/", "-")
    t = t.replace(":", " -")
    return t


def fmt_size(n: int) -> str:
    for unit in ("B", "KB", "MB", "GB"):
        if n < 1024:
            return f"{n:.1f} {unit}"
        n /= 1024  # type: ignore[assignment]
    return f"{n:.1f} TB"


def download(url: str, dest: Path) -> int:
    # Use system curl: macOS Python often lacks a working CA bundle, and curl
    # already works on this machine (proven by existing 29 MB mp3 in the dir).
    tmp = dest.with_suffix(dest.suffix + ".part")
    if tmp.exists():
        tmp.unlink()
    result = subprocess.run(
        [
            "curl", "-sSL", "--fail",
            "--http1.1",
            "--retry", "5", "--retry-delay", "2", "--retry-all-errors",
            "-A", USER_AGENT,
            "-o", str(tmp),
            url,
        ],
        capture_output=True, text=True,
    )
    if result.returncode != 0:
        if tmp.exists():
            tmp.unlink()
        raise RuntimeError(f"curl exited {result.returncode}: {result.stderr.strip()}")
    tmp.rename(dest)
    return dest.stat().st_size


def resolve_html_path(argv: list[str]) -> Path | None:
    if len(argv) > 1:
        p = Path(argv[1])
        return p if p.exists() else None
    for candidate in DEFAULT_HTML_CANDIDATES:
        if candidate.exists():
            return candidate
    return None


def main() -> int:
    html_path = resolve_html_path(sys.argv)
    if html_path is None:
        print(
            "error: no HTML file found.\n"
            "  pass a path as argument, or place one of these in the cwd:\n  - "
            + "\n  - ".join(str(p) for p in DEFAULT_HTML_CANDIDATES),
            file=sys.stderr,
        )
        return 1
    print(f"Reading: {html_path}")

    parser = EpisodeParser()
    parser.feed(html_path.read_text(encoding="utf-8"))

    episodes = [e for e in parser.episodes if e["num"] not in SKIP_IDS]
    print(f"Extracted {len(episodes)} episodes (skipped {len(parser.episodes) - len(episodes)})")

    OUT_DIR.mkdir(exist_ok=True)

    ok = 0
    skipped = 0
    failed: list[tuple[str, str]] = []
    total_bytes = 0

    for i, ep in enumerate(episodes, 1):
        try:
            num = int(ep["num"])
        except ValueError:
            failed.append((ep["num"], "non-numeric data-id"))
            continue
        title = sanitize_title(ep["title"])
        fname = f"{num:03d} - {title}.mp3"
        dest = OUT_DIR / fname

        if dest.exists() and dest.stat().st_size > 0:
            skipped += 1
            total_bytes += dest.stat().st_size
            print(f"[{i:3}/{len(episodes)}] skip (exists): {fname}")
            continue

        print(f"[{i:3}/{len(episodes)}] downloading: {fname}", flush=True)
        try:
            size = download(ep["url"], dest)
            ok += 1
            total_bytes += size
            print(f"             → {fmt_size(size)}", flush=True)
        except Exception as e:
            failed.append((fname, str(e)))
            print(f"             ✗ FAILED: {e}", file=sys.stderr, flush=True)

    print()
    print(f"Done. downloaded={ok} skipped={skipped} failed={len(failed)} total={fmt_size(total_bytes)}")
    if failed:
        print("Failures:")
        for f, err in failed:
            print(f"  - {f}: {err}")
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env bash
# Download all "Les Pieds sur Terre" episodes as mp3 files named "NNN - Title.mp3".
#
# Usage:
#   ./download_episodes.sh                            # fetch the index page online
#   ./download_episodes.sh "liste-podcast copy.html"  # parse a local HTML file
#   ./download_episodes.sh -o ./out "fichier.html"    # custom output directory
#   ./download_episodes.sh -o ./out                   # custom output + online fetch
#
# Requires: bash, curl, perl (all pre-installed on macOS).

set -euo pipefail

INDEX_URL="https://radio-podcast.fr/podcast/france-culture/1907/les-pieds-sur-terre/reportage"
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
# Default output relative to the project root (script lives in scripts/), so
# it works regardless of where the user invokes it from.
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="$PROJECT_ROOT/mp3"
SKIP_IDS=("102")

usage() {
  sed -n '2,11p' "$0" | sed 's/^# \{0,1\}//'
  exit "${1:-0}"
}

# ---- parse args ----
HTML_FILE=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    -o|--out) OUT_DIR="$2"; shift 2 ;;
    -h|--help) usage 0 ;;
    -*) echo "unknown option: $1" >&2; usage 1 ;;
    *) HTML_FILE="$1"; shift ;;
  esac
done

mkdir -p "$OUT_DIR"

# ---- get HTML into a temp file ----
HTML_TMP="$(mktemp -t lps-podcast.XXXXXX.html)"
trap 'rm -f "$HTML_TMP"' EXIT

if [[ -n "$HTML_FILE" ]]; then
  if [[ ! -f "$HTML_FILE" ]]; then
    echo "error: file not found: $HTML_FILE" >&2
    exit 1
  fi
  cp "$HTML_FILE" "$HTML_TMP"
  echo "Using local file: $HTML_FILE"
else
  echo "Fetching index: $INDEX_URL"
  curl -sSL -A "$UA" -o "$HTML_TMP" "$INDEX_URL"
fi

# ---- extract (num, title, url) triples as TSV using perl ----
# Slurp mode (-0777) + regex with /s (dot matches newline) handles multi-line titles
# and HTML entities like &nbsp;, &amp;, &#39;.
TSV_FILE="$(mktemp -t lps-podcast.XXXXXX.tsv)"
trap 'rm -f "$HTML_TMP" "$TSV_FILE"' EXIT

perl -0777 -CSD -ne '
  while (m{<div\s+class="EpTitle">\s*<div[^>]*>(\d+)</div>(.*?)</div>.*?data-mp3="([^"]+)"}sg) {
    my ($num, $title, $url) = ($1, $2, $3);
    # decode common entities
    $title =~ s/&nbsp;/ /g;
    $title =~ s/&amp;/&/g;
    $title =~ s/&#39;/'\''/g;
    $title =~ s/&quot;/"/g;
    $title =~ s/&lt;/</g;
    $title =~ s/&gt;/>/g;
    # normalize whitespace
    $title =~ s/\s+/ /g;
    $title =~ s/^\s+|\s+$//g;
    # OS-unsafe chars
    $title =~ s{/}{-}g;
    $title =~ s{:}{ -}g;
    print "$num\t$title\t$url\n";
  }
' "$HTML_TMP" > "$TSV_FILE"

TOTAL=$(wc -l < "$TSV_FILE" | tr -d ' ')
echo "Extracted $TOTAL episodes"

# ---- helper: check if id should be skipped ----
should_skip() {
  local id="$1"
  for s in "${SKIP_IDS[@]}"; do
    [[ "$id" == "$s" ]] && return 0
  done
  return 1
}

# ---- download loop ----
OK=0
SKIPPED=0
FAILED=0
declare -a FAIL_LIST=()
I=0

while IFS=$'\t' read -r NUM TITLE URL; do
  I=$((I+1))
  if should_skip "$NUM"; then
    echo "[$I/$TOTAL] skip (autopromo): #$NUM"
    continue
  fi

  printf -v FNAME "%03d - %s.mp3" "$NUM" "$TITLE"
  DEST="$OUT_DIR/$FNAME"

  if [[ -f "$DEST" && -s "$DEST" ]]; then
    echo "[$I/$TOTAL] skip (exists): $FNAME"
    SKIPPED=$((SKIPPED+1))
    continue
  fi

  echo "[$I/$TOTAL] downloading: $FNAME"
  if curl -sSL --fail --http1.1 --retry 5 --retry-delay 2 --retry-all-errors -A "$UA" -o "$DEST" "$URL"; then
    SIZE=$(stat -f%z "$DEST" 2>/dev/null || stat -c%s "$DEST")
    echo "             → $((SIZE / 1024 / 1024)) MB"
    OK=$((OK+1))
  else
    echo "             ✗ FAILED" >&2
    FAILED=$((FAILED+1))
    FAIL_LIST+=("$FNAME")
    rm -f "$DEST"
  fi
done < "$TSV_FILE"

echo
echo "Done. downloaded=$OK skipped=$SKIPPED failed=$FAILED"
if [[ ${#FAIL_LIST[@]} -gt 0 ]]; then
  echo "Failures:"
  for f in "${FAIL_LIST[@]}"; do echo "  - $f"; done
  exit 2
fi

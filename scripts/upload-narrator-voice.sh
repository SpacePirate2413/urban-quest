#!/usr/bin/env bash
# Trim a LibriVox (or other public-domain) MP3 to a clean voice sample and
# upload it to the local Chatterbox TTS server, registered under the given
# voice ID. After upload, Chatterbox can clone this voice for AI narration
# in the creator-station's AI Narrate modal.
#
# Usage:
#   ./scripts/upload-narrator-voice.sh <voice_id> <source_url> <start_seconds> <duration_seconds>
#
# Example:
#   ./scripts/upload-narrator-voice.sh elena \
#     https://archive.org/download/some_recording/chapter01.mp3 \
#     18 20
#
# - voice_id: lowercase short name (must match an entry in NARRATOR_VOICES,
#   e.g. marcus, elena, jake, lily, arthur, margaret, draven, vex).
# - source_url: direct .mp3 URL from LibriVox / archive.org.
# - start_seconds: where to start the trim (skip the LibriVox intro).
# - duration_seconds: length of the sample (15–30s recommended).

set -euo pipefail

CHATTERBOX_URL="${CHATTERBOX_URL:-http://localhost:4123}"

if [ "$#" -ne 4 ]; then
  echo "Usage: $0 <voice_id> <source_url> <start_seconds> <duration_seconds>" >&2
  exit 1
fi

VOICE_ID="$1"
SOURCE_URL="$2"
START="$3"
DURATION="$4"

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "ffmpeg is required. Install with: brew install ffmpeg" >&2
  exit 1
fi

if ! curl -fsS "$CHATTERBOX_URL/health" >/dev/null 2>&1; then
  echo "Chatterbox is not reachable at $CHATTERBOX_URL." >&2
  echo "Start the chatterbox-tts-api server, then re-run." >&2
  exit 1
fi

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

SRC="$TMP/source.mp3"
OUT="$TMP/${VOICE_ID}.mp3"

echo "→ Downloading source from: $SOURCE_URL"
curl -fsSL "$SOURCE_URL" -o "$SRC"

echo "→ Trimming ${DURATION}s starting at ${START}s"
# -ss before -i seeks fast (frame-accurate enough for our purposes).
# Re-encode at 64 kbps mono — Chatterbox doesn't need high bitrate for a clone
# reference, and a smaller file uploads faster.
ffmpeg -hide_banner -loglevel error -y \
  -ss "$START" -t "$DURATION" -i "$SRC" \
  -ac 1 -ar 24000 -b:a 64k \
  "$OUT"

SIZE=$(stat -f%z "$OUT" 2>/dev/null || stat -c%s "$OUT")
echo "→ Trimmed file: $OUT ($((SIZE / 1024)) KB)"

# If a voice with this ID already exists, replace it. Chatterbox returns 409
# on duplicate name; deleting first lets us re-run the script idempotently.
if curl -fsS "$CHATTERBOX_URL/v1/voices/$VOICE_ID" >/dev/null 2>&1; then
  echo "→ Voice '$VOICE_ID' already registered — deleting before re-upload"
  curl -fsS -X DELETE "$CHATTERBOX_URL/v1/voices/$VOICE_ID" >/dev/null
fi

echo "→ Uploading to Chatterbox as '$VOICE_ID'"
# Chatterbox's POST /v1/voices expects `voice_name` (not `name`) — see
# `app/api/endpoints/voices.py` upload_voice signature.
RESPONSE=$(curl -fsS -X POST "$CHATTERBOX_URL/v1/voices" \
  -F "voice_file=@$OUT" \
  -F "voice_name=$VOICE_ID")

echo "→ Done. Chatterbox response:"
echo "$RESPONSE"
echo ""
echo "✓ '$VOICE_ID' is now usable in the AI Narrate modal."
echo "  Preview: $CHATTERBOX_URL/v1/voices/$VOICE_ID/download"

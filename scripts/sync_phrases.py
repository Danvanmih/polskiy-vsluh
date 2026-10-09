#!/usr/bin/env python3
"""Best-effort extraction of real Polish subtitle phrases, no API key required.

Only fetch published caption tracks when YouTube makes them accessible.
Do not synthesize transcripts or translations. Failures keep the previous dataset.
"""
import datetime as dt
import json
import os
import pathlib
import re
import sys
import time
import unicodedata

ROOT = pathlib.Path(__file__).resolve().parents[1]
VIDEOS = ROOT / "data" / "videos.json"
OUTPUT = ROOT / "data" / "phrases.json"
LIMIT = int(os.environ.get("PHRASE_VIDEO_LIMIT", "25"))
MAX_PHRASES = 40

def clean(text):
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\[[^\]]{0,70}\]|\([^)]{0,70}\)", " ", text)
    text = re.sub(r"\s+", " ", text).strip(" -–—,.")
    return text

def is_polish(text):
    # Do not misclassify Cyrillic or primarily non-Polish caption tracks.
    letters = [c for c in text if c.isalpha()]
    if not letters or sum("CYRILLIC" in unicodedata.name(c, "") for c in letters):
        return False
    return True

def caption_texts(video_id):
    from youtube_transcript_api import YouTubeTranscriptApi
    api = YouTubeTranscriptApi()
    available = api.list(video_id)
    for langs in (["pl"], ["pl-PL"]):
        try:
            track = available.find_manually_created_transcript(langs)
            return [item.text for item in track.fetch()], "manual"
        except Exception:
            pass
    for langs in (["pl"], ["pl-PL"]):
        try:
            track = available.find_generated_transcript(langs)
            return [item.text for item in track.fetch()], "auto"
        except Exception:
            pass
    return [], "unavailable"

def phrases_for(video_id):
    raw, kind = caption_texts(video_id)
    chosen, seen = [], set()
    for chunk in raw:
        text = clean(chunk)
        # A subtitle line is a quotation from the caption track, not a verified translation.
        if not is_polish(text) or not 12 <= len(text) <= 145:
            continue
        words = text.split()
        if not 3 <= len(words) <= 19:
            continue
        key = text.casefold()
        if key in seen:
            continue
        seen.add(key)
        chosen.append({"pl": text, "source": "youtube-captions", "captionType": kind})
        if len(chosen) >= MAX_PHRASES:
            break
    return chosen, kind

def main():
    catalog = json.loads(VIDEOS.read_text(encoding="utf-8"))
    try:
        prior = json.loads(OUTPUT.read_text(encoding="utf-8"))
    except (ValueError, OSError):
        prior = {}
    result = prior.get("byVideo", {})
    videos = catalog.get("videos", [])[:LIMIT]
    errors = 0
    diagnostics = {}
    for video in videos:
        vid = video.get("id", "")
        if not re.fullmatch(r"[A-Za-z0-9_-]{11}", vid):
            continue
        try:
            phrases, kind = phrases_for(vid)
            if phrases:
                result[vid] = {"source": "youtube-captions", "captionType": kind, "phrases": phrases}
                diagnostics[vid] = {"status": "ok", "count": len(phrases), "kind": kind}
                print(f"{vid}: {len(phrases)} phrases, {kind}")
            else:
                diagnostics[vid] = {"status": "missing", "detail": kind}
                print(f"{vid}: no usable Polish captions ({kind})")
        except Exception as exc:
            errors += 1
            diagnostics[vid] = {"status": "error", "detail": type(exc).__name__}
            print(f"{vid}: unavailable ({type(exc).__name__})", file=sys.stderr)
        time.sleep(0.5)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    payload = {"updatedAt": dt.datetime.now(dt.timezone.utc).isoformat(),
               "source": "public-youtube-caption-tracks", "byVideo": result, "diagnostics": diagnostics}
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    print(f"Saved phrases for {len(result)} videos; failures: {errors}")
    if not result:
        print("WARNING: No Polish captions obtained. Review diagnostics in data/phrases.json.", file=sys.stderr)

if __name__ == "__main__":
    main()

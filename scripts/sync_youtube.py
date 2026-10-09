#!/usr/bin/env python3
"""Sync public YouTube channel metadata to a static JSON catalog.

With YOUTUBE_API_KEY: YouTube Data API v3, complete uploads archive and playlists.
Without a key: public YouTube Atom feed (latest ~15 uploads), merged into saved catalog.
No scraping of playback content, subtitles, or private information.
"""
import datetime as dt
import json
import os
import pathlib
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

CHANNEL_ID = "UCVyi18vZGibg4Uu4zlBHTIA"
CHANNEL_URL = "https://www.youtube.com/@polskij-wsluh"
OUT = pathlib.Path(__file__).resolve().parents[1] / "data" / "videos.json"
KEY = os.environ.get("YOUTUBE_API_KEY", "").strip()
HEADERS = {"User-Agent": "PolskiyVsluhCatalog/1.0 (+https://github.com/Danvanmih/polskiy-vsluh)"}
def load_json(url):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=35) as response:
        return json.load(response)
def api(method, **params):
    params.update(key=KEY)
    return load_json("https://www.googleapis.com/youtube/v3/" + method + "?" + urllib.parse.urlencode(params))
def cat(title):
    t = title.lower()
    if re.search(r"(?<!\w)a1(?!\w)|уровень а1|начинающ|урок а1", t):
        return "A1"
    if re.search(r"(?<!\w)a2(?!\w)|уровень а2|урок а2", t):
        return "A2"
    if any(x in t for x in ("песн", "piosenk", "muzyk", "śpiew")):
        return "songs"
    if any(x in t for x in ("диалог", "dialog", "rozmow")):
        return "dialogues"
    return "other"
def existing():
    if OUT.exists():
        try:
            data = json.loads(OUT.read_text(encoding="utf-8"))
            return {v["id"]: v for v in data.get("videos", []) if re.fullmatch(r"[\w-]{11}", v.get("id", ""))}
        except (ValueError, KeyError, TypeError):
            pass
    return {}
def feed():
    url = "https://www.youtube.com/feeds/videos.xml?channel_id=" + CHANNEL_ID
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=35) as response:
        root = ET.fromstring(response.read())
    ns = {"a": "http://www.w3.org/2005/Atom", "yt": "http://www.youtube.com/xml/schemas/2015", "media": "http://search.yahoo.com/mrss/"}
    result = []
    for entry in root.findall("a:entry", ns):
        vid = entry.findtext("yt:videoId", namespaces=ns)
        if not vid or not re.fullmatch(r"[\w-]{11}", vid):
            continue
        title = entry.findtext("a:title", default="", namespaces=ns)
        media = entry.find("media:group", ns)
        desc = media.findtext("media:description", default="", namespaces=ns) if media is not None else ""
        result.append({"id": vid, "title": title, "description": desc, "publishedAt": entry.findtext("a:published", default="", namespaces=ns), "thumbnail": f"https://i.ytimg.com/vi/{vid}/hqdefault.jpg", "category": cat(title)})
    if not result:
        raise RuntimeError("YouTube RSS feed returned no videos")
    return result
def full_api():
    channel = api("channels", part="contentDetails", id=CHANNEL_ID)
    items = channel.get("items", [])
    if not items:
        raise RuntimeError("YouTube channel not found")
    playlist = items[0]["contentDetails"]["relatedPlaylists"]["uploads"]
    ids = []
    token = ""
    while True:
        page = api("playlistItems", part="contentDetails", playlistId=playlist, maxResults=50, **({"pageToken": token} if token else {}))
        ids.extend(item["contentDetails"]["videoId"] for item in page.get("items", []) if "videoId" in item.get("contentDetails", {}))
        token = page.get("nextPageToken", "")
        if not token:
            break
    result = []
    for pos in range(0, len(ids), 50):
        page = api("videos", part="snippet,contentDetails,status", id=",".join(ids[pos:pos + 50]), maxResults=50)
        for item in page.get("items", []):
            if item.get("status", {}).get("privacyStatus", "public") != "public":
                continue
            sn = item.get("snippet", {})
            vid = item["id"]
            title = sn.get("title", "")
            thumb = sn.get("thumbnails", {}).get("high", {}).get("url") or f"https://i.ytimg.com/vi/{vid}/hqdefault.jpg"
            result.append({"id": vid, "title": title, "description": sn.get("description", ""), "publishedAt": sn.get("publishedAt", ""), "thumbnail": thumb, "category": cat(title), "duration": item.get("contentDetails", {}).get("duration", "")})
    if not result:
        raise RuntimeError("YouTube API returned no public videos")
    return result
def main():
    old = existing()
    mode = "rss"
    if KEY:
        fresh = full_api()
        mode = "youtube-data-api"
        # API is authoritative for currently public uploads; remove deleted/unlisted entries.
        combined = {v["id"]: v for v in fresh}
    else:
        fresh = feed()
        # RSS only exposes recent uploads; keep historical records from previous runs.
        combined = dict(old)
        combined.update({v["id"]: v for v in fresh})
    videos = sorted(combined.values(), key=lambda v: v.get("publishedAt", ""), reverse=True)
    payload = {"channelId": CHANNEL_ID, "channelUrl": CHANNEL_URL, "updatedAt": dt.datetime.now(dt.timezone.utc).isoformat(), "source": mode, "videos": videos}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Synced {len(fresh)} fresh entries; catalog contains {len(videos)} public videos (source: {mode})")
if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"YouTube sync failed without overwriting existing catalog: {exc}", file=sys.stderr)
        sys.exit(1)

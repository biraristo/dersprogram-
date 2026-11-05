"""Tek okul için yerel Python sunucusu. Python 3.10+."""
import json
import sqlite3
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit
import argparse

ROOT = Path(__file__).resolve().parent
ASSETS = ROOT / "dist"
DB = ROOT / "school.sqlite3"


def validate(school):
    days, hours = school["days"], school["hours"]
    if not (type(days) is int and type(hours) is int and 1 <= days <= 7 and 1 <= hours <= 16):
        raise ValueError("Geçersiz hafta")
    if not isinstance(school["school"], str) or not school["school"].strip():
        raise ValueError("Okul adı gerekli")
    daily = school.get("daily", [hours] * days)
    if len(daily) != days or any(type(n) is not int or not 0 <= n <= hours for n in daily):
        raise ValueError("Geçersiz günlük saat")
    occupied = set()
    for closure in school["closed"]:
        slot = closure["slot"]
        if type(slot) is not int or not 0 <= slot < days * hours:
            raise ValueError("Geçersiz kapalı saat")
        occupied.add((closure["resource"], slot))
    starts = school.get("starts")
    expected = []
    for lesson in school["lessons"]:
        resources = set()
        if not lesson["name"].strip() or not lesson["blocks"]:
            raise ValueError("Eksik atama")
        for field, prefix in (("groups", "Şube"), ("teachers", "Öğretmen")):
            values = lesson[field]
            if not isinstance(values, list) or not values or not all(isinstance(v, str) and v.strip() for v in values):
                raise ValueError("Eksik kaynak")
            resources.update(f"{prefix} · {v}" for v in values)
        if lesson["room"]:
            resources.add("Derslik · " + lesson["room"])
        for length in lesson["blocks"]:
            if type(length) is not int or not 1 <= length <= hours:
                raise ValueError("Geçersiz blok")
            expected.append((length, resources))
    if starts is None:
        return
    if not expected or len(expected) != len(starts):
        raise ValueError("Eksik yerleşim")
    for start, (length, resources) in zip(starts, expected):
        if type(start) is not int or not 0 <= start < days * hours or start % hours + length > daily[start // hours]:
            raise ValueError("Geçersiz yerleşim")
        for t in range(start, start + length):
            for r in resources:
                if (r, t) in occupied:
                    raise ValueError("Kaynak çakışması")
                occupied.add((r, t))


class Handler(BaseHTTPRequestHandler):
    def reply(self, code, data, content_type="application/json"):
        if not isinstance(data, bytes):
            data = json.dumps(data, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header("Content-Type", content_type)
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        path = urlsplit(self.path).path
        if path == "/api/school":
            with sqlite3.connect(DB) as db:
                revision, data = db.execute("SELECT rev,data FROM school WHERE id=1").fetchone()
            return self.reply(200, {"revision": revision, "school": json.loads(data)})
        name = path.lstrip("/") or "index.html"
        if name not in {"index.html", "app.mjs", "style.css", "engine.mjs", "worker.mjs"}:
            return self.reply(404, {})
        data = (ASSETS / name).read_bytes()
        if name == "index.html":
            data = data.replace(b'<meta charset=', b'<meta name="school-server" content="1"><meta charset=', 1)
        self.reply(200, data, {".html": "text/html; charset=utf-8", ".css": "text/css", ".mjs": "text/javascript"}[Path(name).suffix])

    def do_PUT(self):
        if self.path != "/api/school":
            return self.reply(404, {})
        if self.headers.get("Origin") and urlsplit(self.headers["Origin"]).netloc != self.headers.get("Host"):
            return self.reply(403, {})
        try:
            length = int(self.headers["Content-Length"])
            if not 0 < length <= 2000000:
                return self.reply(413, {})
            revision = int(self.headers["If-Match"])
            school = json.loads(self.rfile.read(length))
            validate(school)
            with sqlite3.connect(DB) as db:
                updated = db.execute("UPDATE school SET data=?,rev=rev+1 WHERE id=1 AND rev=?", (json.dumps(school), revision))
                if updated.rowcount != 1:
                    return self.reply(409, {})
            self.reply(200, {"revision": revision + 1})
        except (ValueError, KeyError, TypeError, AttributeError):
            self.reply(400, {"error": "Geçersiz okul verisi"})


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8765)
    port = parser.parse_args().port
    with sqlite3.connect(DB) as db:
        db.execute("CREATE TABLE IF NOT EXISTS school(id INTEGER PRIMARY KEY,rev INTEGER,data TEXT)")
        db.execute("INSERT OR IGNORE INTO school VALUES(1,0,'null')")
    print(f"http://127.0.0.1:{port}", flush=True)
    ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()

"""Local smoke test for clip.py's drawing code, without requiring ffmpeg on
PATH. Not part of the app — delete after manual verification, or keep as a
quick regression check. Builds a synthetic 3-hour two-team price series and
exercises prepare_cands + one chart_frame + end_card call directly."""
import datetime as dt
import json
import sys

sys.path.insert(0, ".")
import clip  # noqa: E402

t0 = dt.datetime(2026, 11, 4, 23, 0, tzinfo=dt.timezone.utc)
points = {"away": [], "home": []}
for i in range(60):
    t = (t0 + dt.timedelta(minutes=i * 3)).isoformat().replace("+00:00", "Z")
    away_mid = 50 + 10 * (i / 60) + (2 if i % 7 == 0 else 0)
    points["away"].append({"t": t, "mid": round(away_mid, 1)})
    points["home"].append({"t": t, "mid": round(100 - away_mid, 1)})

cfg = {
    "label": "ATL @ WAS",
    "sub": "NBA MONEYLINE",
    "size": 720,
    "decimals": 1,
    "headline": None,
    "endline": None,
    "since": None,
    "until": None,
    "teams": [
        {"side": "away", "name": "Atlanta Hawks", "abbr": "ATL", "color": [214, 40, 52], "role": "Moneyline"},
        {"side": "home", "name": "Washington Wizards", "abbr": "WAS", "color": [49, 120, 214], "role": "Moneyline"},
    ],
    "points": points,
    "out_mp4": "/tmp/unused.mp4",
    "out_png": "/tmp/unused.png",
}

cands, t0r, t1r, T = clip.prepare_cands(cfg)
print("prepare_cands OK:", [(c["side"], c["final"]) for c in cands], "T=", T)

# Exercise the drawing code directly (mirrors render()'s setup) without ffmpeg.
import math

W, H = 1280, 720
s = W / 1280
S = lambda v: int(round(v * s))  # noqa: E731
import numpy as np

allv = np.concatenate([[m for _, m in c["pts"]] for c in cands])
lo = math.floor((allv.min() - 6) / 10) * 10
hi = math.ceil((allv.max() + 6) / 10) * 10
lo, hi = max(0, min(lo, 40)), min(100, max(hi, 60))
print("scale OK:", lo, hi)

avs = [clip.avatar(c, S(112), S) for c in cands]
print("avatar() OK:", [a.size for a in avs])

logo = clip.brand_logo(S(30))
print("brand_logo() OK:", logo.size)

D = clip.Digits(clip.bebas(S(92)), (240, 243, 248))
from PIL import Image

im = Image.new("RGB", (400, 200), (10, 10, 20))
D.draw_roll(im, 10, 10, 54.3, 1, "¢")
print("Digits.draw_roll() OK")

print("ALL SMOKE CHECKS PASSED")

# Full render() pass, with ffmpeg faked out (no ffmpeg binary on this dev box).
import os
import tempfile


class _FakeStdin:
    def write(self, _data):
        pass

    def close(self):
        pass


class _FakeProc:
    def __init__(self):
        self.stdin = _FakeStdin()

    def wait(self):
        pass


def _fake_ffmpeg_pipe(_W, _H, _fps, _out):
    return _FakeProc()


clip.ffmpeg_pipe = _fake_ffmpeg_pipe

with tempfile.TemporaryDirectory() as tmp:
    cfg["out_mp4"] = os.path.join(tmp, "out.mp4")
    cfg["out_png"] = os.path.join(tmp, "out_final.png")
    cfg["anim_seconds"] = 1.0  # keep the full-pipeline smoke test fast
    cfg["hold_seconds"] = 0.2
    cfg["endcard_seconds"] = 0.5
    result = clip.render(cfg)
    assert os.path.exists(cfg["out_png"]), "final PNG was not written"
    print("render() OK:", json.dumps(result))

print("FULL RENDER PIPELINE OK")

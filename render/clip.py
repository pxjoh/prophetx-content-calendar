#!/usr/bin/env python3
"""Price Clips renderer — trimmed port of the ProphetX sports toolkit's
anim/race_anim.py (render_px path only). Sports teams render as team-color
tiles with an abbreviation, not cropped headshots, so OpenCV/YuNet face
detection, facecrop.py, and scipy (unused even in the original) are dropped
entirely — this script only needs numpy, Pillow, and the ffmpeg binary.

Reads one JSON config (path given as argv[1]) and writes an MP4 + a final-
frame PNG to the paths it specifies. No CLI flags, no races.json, no
snapshots.jsonl: the Next.js backend resolves the game via Snowflake,
normalizes the price series (see src/lib/price-clips/normalize.ts), and
hands this script a plain JSON payload. This script has no DB/network
credentials — it only draws and encodes, inside an ephemeral Vercel Sandbox.

Config shape:
{
  "label": "ATL @ WAS", "sub": "NBA MONEYLINE",
  "size": 720, "decimals": 1,
  "headline": "...", "endline": "...",
  "since": "2026-11-04T23:40:00Z", "until": null,
  "bucket_minutes": null,
  "teams": [
    {"side": "away", "name": "Atlanta Hawks", "abbr": "ATL", "color": [214,40,52], "role": "Moneyline"},
    {"side": "home", "name": "Washington Wizards", "abbr": "WAS", "color": [49,120,214], "role": "Moneyline"}
  ],
  "points": {
    "away": [{"t": "2026-11-04T23:41:00Z", "mid": 54.3}, ...],
    "home": [{"t": "2026-11-04T23:41:00Z", "mid": 45.7}, ...]
  },
  "out_mp4": "/tmp/out.mp4", "out_png": "/tmp/out_final.png"
}
"""
import datetime as dt
import json
import math
import os
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, "assets")
FONTS = os.path.join(ASSETS, "fonts") + "/"
LOGO = os.path.join(ASSETS, "prophetx_logo_brand.png")
UTC = dt.timezone.utc

PX_BG0, PX_BG1, PX_PANEL, PX_LINE = (12, 18, 33), (7, 10, 19), (19, 27, 46), (40, 50, 72)
PX_TXT, PX_MUTE = (240, 243, 248), (146, 156, 176)
GREEN = (11, 162, 73)


def parse_iso(s):
    return dt.datetime.fromisoformat(s.replace("Z", "+00:00"))


def bebas(size):
    return ImageFont.truetype(FONTS + "Bebas Neue/BebasNeue-Regular.ttf", size)


def barlow(size, w="Bold"):
    return ImageFont.truetype(FONTS + f"Barlow Condensed/BarlowCondensed-{w}.ttf", size)


def mix(a, b, t):
    return tuple(int(round(a[k] + (b[k] - a[k]) * t)) for k in range(3))


def rrect(d, box, r, **kw):
    d.rounded_rectangle([round(v) for v in box], radius=r, **kw)


def brand_logo(height):
    lg = Image.open(LOGO).convert("RGBA")
    lg = lg.crop(lg.getbbox())
    return lg.resize((round(lg.size[0] * height / lg.size[1]), height), Image.LANCZOS)


def avatar(c, size, S):
    """Team-color rounded tile with the abbreviation. No photos/logos — not legally cleared for use."""
    pad = S(4)
    tot = size + 2 * pad
    ss = 4
    im = Image.new("RGBA", (tot, tot), (0, 0, 0, 0))
    ring = c["col"]
    ssz = tot * ss
    m = Image.new("L", (ssz, ssz), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, ssz - 1, ssz - 1), radius=int(ssz * 0.2), fill=255)
    im.paste(
        Image.new("RGBA", (tot, tot), mix(ring, (255, 255, 255), 0.35) + (255,)),
        (0, 0),
        m.resize((tot, tot), Image.LANCZOS),
    )
    inner = size
    m2 = Image.new("L", (inner * ss, inner * ss), 0)
    ImageDraw.Draw(m2).rounded_rectangle((0, 0, inner * ss - 1, inner * ss - 1), radius=int(inner * ss * 0.2), fill=255)
    tile = Image.new("RGBA", (inner, inner), ring + (255,))
    abbr = c["abbr"]
    ImageDraw.Draw(tile).text(
        (inner / 2, inner / 2 + inner * 0.02),
        abbr,
        font=bebas(int(inner * (0.50 if len(abbr) <= 3 else 0.40))),
        fill=(255, 255, 255),
        anchor="mm",
    )
    im.paste(tile, (pad, pad), m2.resize((inner, inner), Image.LANCZOS))
    return im


class Digits:
    """Tabular, rolling-digit number renderer — unmodified from race_anim.py (no photo/face dependency)."""

    def __init__(self, f, color):
        self.f, self.color = f, color
        self.cw = math.ceil(max(f.getlength(str(d)) for d in range(10)))
        _, top, _, base = f.getbbox("0123456789", anchor="ls")
        self.pad = max(2, int(f.size * 0.06))
        self.top = top
        self.h = -top + 2 * self.pad
        self.cache = {}

    def glyph(self, ch):
        if ch not in self.cache:
            w = self.cw if ch.isdigit() else math.ceil(self.f.getlength(ch))
            hh = self.h + int(self.f.size * 0.3)
            im = Image.new("L", (w, hh), 0)
            ImageDraw.Draw(im).text((w / 2, self.pad - self.top), ch, font=self.f, fill=255, anchor="ms")
            self.cache[ch] = im
        return self.cache[ch]

    def width(self, s):
        return sum(self.glyph(c).size[0] for c in s)

    def draw_text(self, im, x, y, s, color=None, alpha=1.0):
        x0 = x
        for c in s:
            g = self.glyph(c)
            if c != " ":
                self._paste(im, g, x, y - self.pad, color, alpha)
            x += g.size[0]
        return x - x0

    def _paste(self, im, mask, x, y, color, alpha):
        col = Image.new("RGB", mask.size, color or self.color)
        if alpha < 1:
            mask = mask.point(lambda v: int(v * alpha))
        im.paste(col, (int(round(x)), int(round(y))), mask)

    def draw_roll(self, im, x, y, r, dec=1, suffix="¢", color=None, alpha=1.0, align="l"):
        r = max(r, 0.0)
        nint = max(1, len(str(int(round(r)) // 10**dec)))
        dot = self.glyph(".").size[0]
        w = nint * self.cw + (dot + dec * self.cw if dec else 0) + self.width(suffix)
        if align == "r":
            x -= w
        for k in range(nint + dec - 1, -1, -1):
            if dec and k == dec - 1:
                self.draw_text(im, x, y, ".", color, alpha)
                x += dot
            wk = 10**k
            q = r / wk
            base = math.floor(q + 1e-9)
            d = base % 10
            frac = (q - base) if k == 0 else max(0.0, (r - math.floor(r / wk + 1e-9) * wk) - (wk - 1))
            frac = min(max(frac, 0.0), 1.0)
            cell = Image.new("L", (self.cw, self.h), 0)
            off = int(round(frac * self.h))
            cell.paste(self.glyph(str(d)).crop((0, 0, self.cw, self.h)), (0, -off))
            if off:
                cell.paste(self.glyph(str((d + 1) % 10)).crop((0, 0, self.cw, self.h)), (0, self.h - off))
            self._paste(im, cell, x, y - self.pad, color, alpha)
            x += self.cw
        self.draw_text(im, x, y, suffix, color, alpha)
        return w


def pchip(x, y):
    """Fritsch-Carlson monotone cubic — unmodified from race_anim.py. Passes through every point, no overshoot."""
    x, y = np.asarray(x, float), np.asarray(y, float)
    n = len(x)
    if n == 1:
        return lambda q: np.full_like(np.asarray(q, float), y[0])
    h = np.diff(x)
    dl = np.diff(y) / h
    m = np.zeros(n)
    if n == 2:
        m[:] = dl[0]
    else:
        for i in range(1, n - 1):
            if dl[i - 1] * dl[i] > 0:
                w1, w2 = 2 * h[i] + h[i - 1], h[i] + 2 * h[i - 1]
                m[i] = (w1 + w2) / (w1 / dl[i - 1] + w2 / dl[i])
        m[0] = dl[0] if dl[0] * m[1] >= 0 else 0
        m[-1] = dl[-1] if dl[-1] * m[-2] >= 0 else 0

    def f(q):
        q = np.clip(np.asarray(q, float), x[0], x[-1])
        i = np.clip(np.searchsorted(x, q) - 1, 0, n - 2)
        hh = h[i]
        t = (q - x[i]) / hh
        h00, h10, h01, h11 = 2 * t**3 - 3 * t**2 + 1, t**3 - 2 * t**2 + t, -2 * t**3 + 3 * t**2, t**3 - t**2
        return h00 * y[i] + h10 * hh * m[i] + h01 * y[i + 1] + h11 * hh * m[i + 1]

    return f


def bucketize(pts, t0, t1, minutes):
    b = {}
    for t, m in pts:
        if t0 <= t <= t1:
            b[int((t - t0).total_seconds() // (minutes * 60))] = (t, m)
    return [b[k] for k in sorted(b)]


def ffmpeg_pipe(W, H, fps, out):
    return subprocess.Popen(
        [
            "ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(fps), "-i", "-",
            "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo", "-shortest",
            "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-profile:v", "high", "-pix_fmt", "yuv420p",
            "-tune", "animation", "-g", "60", "-c:a", "aac", "-b:a", "64k", "-movflags", "+faststart", out,
        ],
        stdin=subprocess.PIPE,
    )


def prepare_cands(cfg):
    cands = []
    for team in cfg["teams"]:
        side = team["side"]
        pts = sorted((parse_iso(p["t"]), float(p["mid"])) for p in cfg["points"][side])
        if len(pts) < 2:
            raise SystemExit(f"{side}: not enough price readings")
        cands.append({**team, "col": tuple(team["color"]), "raw_pts": pts})

    last_common = min(c["raw_pts"][-1][0] for c in cands)
    t1 = parse_iso(cfg["until"]) if cfg.get("until") else last_common
    t1 = min(t1, last_common)
    t0 = parse_iso(cfg["since"]) if cfg.get("since") else t1 - dt.timedelta(hours=48)
    t0 = max(t0, max(c["raw_pts"][0][0] for c in cands))
    span_min = (t1 - t0).total_seconds() / 60
    if span_min < 30:
        raise SystemExit(f"only {span_min:.0f} min of shared data in the window")

    bucket = cfg.get("bucket_minutes") or (45.0 if span_min >= 24 * 60 else max(5.0, span_min / 40))
    for c in cands:
        pts = bucketize(c["raw_pts"], t0, t1, bucket)
        if len(pts) < 3:
            raise SystemExit(f"{c['side']}: only {len(pts)} points in window")
        c["pts"] = pts
        c["final"] = pts[-1][1]
        xs = [(t - t0).total_seconds() for t, _ in pts]
        ys = [m for _, m in pts]
        if xs[0] > 0:
            xs.insert(0, 0.0)
            ys.insert(0, ys[0])
        c["f"] = pchip(xs, ys)
        c["xs"] = xs

    t1 = max(c["pts"][-1][0] for c in cands)
    T = (t1 - t0).total_seconds()
    for c in cands:
        if c["xs"][-1] < T:
            c["xs"].append(T)
            c["f"] = pchip(c["xs"], [*(c["f"](np.array(c["xs"][:-1]))), c["final"]])
    return cands, t0, t1, T


def render(cfg):
    cands, t0, t1, T = prepare_cands(cfg)
    label, sub = cfg["label"], cfg["sub"]
    out, still = cfg["out_mp4"], cfg["out_png"]
    size = cfg.get("size", 720)
    dec = cfg.get("decimals", 1)
    anim_s = cfg.get("anim_seconds", 11.5)
    hold_s = cfg.get("hold_seconds", 1.0)
    endcard_s = cfg.get("endcard_seconds", 2.5)
    headline, endline = cfg.get("headline"), cfg.get("endline")

    W, H = (1280, 720) if size == 720 else (1920, 1080)
    s = W / 1280
    S = lambda v: int(round(v * s))  # noqa: E731
    fps = 30
    NA, NH, NE = int(round(anim_s * fps)), int(round(hold_s * fps)), int(round(endcard_s * fps))
    X0, X1, Y0, Y1 = S(84), S(770), S(204), S(596)
    allv = np.concatenate([[m for _, m in c["pts"]] for c in cands])
    lo = math.floor((allv.min() - 6) / 10) * 10
    hi = math.ceil((allv.max() + 6) / 10) * 10
    lo, hi = max(0, min(lo, 40)), min(100, max(hi, 60))
    fy = lambda v: Y1 - (np.asarray(v, float) - lo) / (hi - lo) * (Y1 - Y0)  # noqa: E731
    fx = lambda t: X0 + np.asarray(t, float) / T * (X1 - X0)  # noqa: E731
    ET_LABEL = "UTC"
    te = lambda sec: t0 + dt.timedelta(seconds=float(sec))  # noqa: E731

    F_title, F_sub, F_axis = bebas(S(54)), barlow(S(24), "SemiBold"), barlow(S(19), "SemiBold")
    F_name, F_role, F_pill, F_tpill = barlow(S(30), "Bold"), barlow(S(21), "Medium"), barlow(S(25), "Bold"), barlow(S(20), "Bold")
    D_card = Digits(bebas(S(92)), PX_TXT)
    D_pill = Digits(F_pill, (255, 255, 255))
    D_time = Digits(F_tpill, PX_TXT)
    fmt = lambda v: f"{v:.{dec}f}¢"  # noqa: E731

    g = np.linspace(0, 1, H)[:, None, None]
    bg = Image.fromarray((np.array(PX_BG0) * (1 - g) + np.array(PX_BG1) * g).repeat(W, 1).astype(np.uint8), "RGB")
    d = ImageDraw.Draw(bg)
    for x in range(0, W, S(40)):
        d.line((x, 0, x, H), fill=(17, 24, 41))
    for y in range(0, H, S(40)):
        d.line((0, y, W, y), fill=(17, 24, 41))
    from PIL import ImageFilter

    gm = Image.new("L", (W, H), 0)
    ImageDraw.Draw(gm).ellipse((-S(300), -S(260), S(620), S(260)), fill=46)
    bg.paste(Image.new("RGB", (W, H), GREEN), (0, 0), gm.filter(ImageFilter.GaussianBlur(S(120))))
    d = ImageDraw.Draw(bg)
    lg = brand_logo(S(30))
    bg.paste(lg, (S(48), S(34)), lg)
    d.text((S(48), S(76)), label + "  " + sub.upper(), font=F_title, fill=PX_TXT, anchor="la")
    rng = f"{t0.strftime('%a %b %-d, %H:%M')} to {te(T).strftime('%a %b %-d, %H:%M')} {ET_LABEL}"
    if headline:
        d.text((S(50), S(134)), headline, font=F_sub, fill=(150, 232, 178), anchor="la")
    else:
        d.text((S(50), S(134)), "Midpoint, cents  ·  " + rng, font=F_sub, fill=PX_MUTE, anchor="la")
    if headline:
        d.text((S(1236), S(628)), "Midpoint, cents", font=F_sub, fill=PX_MUTE, anchor="ra")
    for v in range(int(lo), int(hi) + 1, 10):
        y = float(fy(v))
        d.line((X0, y, X1, y), fill=(48, 60, 86) if v == 50 else (29, 38, 60), width=max(1, S(2) if v == 50 else S(1)))
        d.text((X0 - S(12), y), f"{v}¢", font=F_axis, fill=PX_MUTE, anchor="rm")
    day = (t0 + dt.timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    while (day - t0).total_seconds() < T:
        x = float(fx((day - t0).total_seconds()))
        d.line((x, Y0 - S(6), x, Y1), fill=(29, 38, 60), width=max(1, S(1)))
        d.text((x + S(6), Y0 - S(8)), day.strftime("%a %b %-d").upper(), font=F_axis, fill=PX_MUTE, anchor="ls")
        day += dt.timedelta(days=1)
    d.line((X0, Y1, X1, Y1), fill=(48, 60, 86), width=max(1, S(2)))

    PXL, PXR, CH, CG = S(900), S(1236), S(244), S(22)
    slots = [S(84), S(84) + CH + CG]
    AV = S(112)
    avs = [avatar(c, AV, S) for c in cands]

    SS = 2
    RX0, RX1, RY0, RY1 = X0 - S(24), S(890), Y0 - S(30), Y1 + S(24)
    RW, RH = RX1 - RX0, RY1 - RY0
    lw = 4.0 * s * SS
    ff = ffmpeg_pipe(W, H, fps, out)
    rank_s = []
    disp = [None, None]
    flash = [0.0, 0.0]
    pos = [None, None]
    lag = 12 / max(NA - 1, 1) * T
    chart_last = None

    def chart_frame(n):
        p = min(n / max(NA - 1, 1), 1.0)
        tc = p * T
        im = bg.copy()
        ts = np.linspace(0, tc, max(2, int(float(fx(tc)) - X0) + 2))
        vals = [c["f"](ts) if tc > 0 else np.full(2, c["f"](np.array([0.0]))[0]) for c in cands]
        if tc <= 0:
            ts = np.zeros(2)
        xs = fx(ts)
        ys = [fy(v) for v in vals]
        ImageDraw.Draw(im).line((float(xs[-1]), Y0, float(xs[-1]), Y1), fill=(52, 64, 92), width=max(1, S(1)))
        cols = np.arange(int(X0), int(math.ceil(xs[-1])) + 1)
        if len(cols) > 1:
            ya = np.interp(cols, xs, ys[0])
            yb = np.interp(cols, xs, ys[1])
            top, bot = np.minimum(ya, yb), np.maximum(ya, yb)
            leadA = ya <= yb
            ry0, ry1 = int(top.min()), int(math.ceil(bot.max())) + 1
            Y = np.arange(ry0, ry1)[:, None].astype(np.float32)
            gap = np.maximum(bot - top, 1.0)
            fr = np.clip((Y - top) / gap, 0, 1)
            inside = (Y >= top) & (Y <= bot)
            alpha = np.where(inside, 0.34 * (1 - 0.8 * fr), 0.0)
            ca, cb = np.array(cands[0]["col"], np.float32), np.array(cands[1]["col"], np.float32)
            colr = np.where(leadA[None, :, None], ca, cb) * np.ones((len(Y), 1, 1), np.float32)
            rgba = np.dstack([colr, (alpha * 255)[..., None]]).astype(np.uint8)
            fl = Image.fromarray(rgba, "RGBA")
            im.paste(fl, (int(cols[0]), ry0), fl)
        lay = Image.new("RGBA", (RW * SS, RH * SS), (0, 0, 0, 0))
        ld = ImageDraw.Draw(lay)
        heads = []
        for i, c in enumerate(cands):
            pts = list(zip(((xs - RX0) * SS).tolist(), ((ys[i] - RY0) * SS).tolist()))
            ld.line(pts, fill=c["col"] + (255,), width=int(round(lw)), joint="curve")
            heads.append((float(xs[-1]), float(ys[i][-1]), float(vals[i][-1])))
        for i, c in enumerate(cands):
            hx, hy = (heads[i][0] - RX0) * SS, (heads[i][1] - RY0) * SS
            pr = (9 + 3 * math.sin(n / 5.0)) * s * SS if n < NA else 9 * s * SS
            ld.ellipse((hx - pr * 1.8, hy - pr * 1.8, hx + pr * 1.8, hy + pr * 1.8), fill=c["col"] + (70,))
            ld.ellipse((hx - 7 * s * SS, hy - 7 * s * SS, hx + 7 * s * SS, hy + 7 * s * SS), fill=c["col"] + (255,))
            ld.ellipse((hx - 3.2 * s * SS, hy - 3.2 * s * SS, hx + 3.2 * s * SS, hy + 3.2 * s * SS), fill=(255, 255, 255, 255))
        la = lay.resize((RW, RH), Image.LANCZOS)
        glow = la.filter(ImageFilter.GaussianBlur(S(7)))
        ga = glow.getchannel("A").point(lambda v: int(v * 0.85))
        glow.putalpha(ga)
        im.paste(glow, (RX0, RY0), glow)
        im.paste(la, (RX0, RY0), la)
        dr = ImageDraw.Draw(im)
        for i, c in enumerate(cands):
            tgt = c["final"] if p >= 1.0 else heads[i][2]
            disp[i] = tgt if disp[i] is None else disp[i] + (tgt - disp[i]) * 0.28
            if p >= 1.0 and n >= NA + 6:
                disp[i] = tgt
            mv = float(c["f"](np.array([tc]))[0] - c["f"](np.array([max(0.0, tc - lag)]))[0]) if n < NA else 0.0
            hit = min(max((abs(mv) - 1.5) / 3.0, 0.0), 1.0)
            if hit > flash[i]:
                flash[i] = hit
            else:
                flash[i] *= 0.9
        ph = S(36)
        order = sorted(range(2), key=lambda i: heads[i][1])
        yc = [heads[i][1] for i in order]
        if yc[1] - yc[0] < ph + S(8):
            m_ = (yc[0] + yc[1]) / 2
            yc = [m_ - (ph + S(8)) / 2, m_ + (ph + S(8)) / 2]
        lo_, hi_ = Y0 - S(10) + ph / 2, Y1 + S(10) - ph / 2
        if yc[0] < lo_:
            yc = [lo_, max(yc[1], lo_ + ph + S(8))]
        if yc[1] > hi_:
            yc = [min(yc[0], hi_ - ph - S(8)), hi_]
        for j, i in enumerate(order):
            c = cands[i]
            txt = fmt(round(disp[i], dec))
            tw = D_pill.width(txt)
            bx = heads[i][0] + S(20)
            by = yc[j] - ph / 2
            fillc = mix(c["col"], (255, 255, 255), 0.25 * flash[i])
            dr.polygon([(heads[i][0] + S(11), heads[i][1]), (bx + 1, yc[j] - S(7)), (bx + 1, yc[j] + S(7))], fill=fillc)
            rrect(dr, (bx, by, bx + tw + S(24), by + ph), S(10), fill=fillc)
            D_pill.draw_text(im, bx + S(12), yc[j] - (D_pill.h - 2 * D_pill.pad) / 2, txt, (255, 255, 255))
        hx = heads[0][0]
        tt = te(tc).strftime("%a %H:%M").upper() + " " + ET_LABEL
        tw = D_time.width(tt)
        bx = min(max(hx - tw / 2 - S(12), X0 - S(40)), S(890) - tw - S(24))
        by = Y1 + S(14)
        rrect(dr, (bx, by, bx + tw + S(24), by + S(32)), S(16), fill=PX_PANEL, outline=GREEN, width=max(1, S(2)))
        D_time.draw_text(im, bx + S(12), by + S(16) - (D_time.h - 2 * D_time.pad) / 2, tt)
        if not rank_s:
            rank_s.extend(sorted(range(2), key=lambda i: -disp[i]))
        if disp[rank_s[1]] > disp[rank_s[0]] + 0.3:
            rank_s.reverse()
        rank = list(rank_s)
        tie = abs(disp[0] - disp[1]) < 0.5
        for r_, i in enumerate(rank):
            pos[i] = slots[r_] if pos[i] is None else pos[i] + (slots[r_] - pos[i]) * 0.2
        for i in sorted(range(2), key=lambda i: rank.index(i), reverse=True):
            c = cands[i]
            y = pos[i]
            lead = rank[0] == i and not tie
            card = mix(PX_PANEL, c["col"], 0.10 + 0.30 * flash[i])
            rrect(dr, (PXL, y, PXR, y + CH), S(18), fill=card, outline=c["col"] if lead else PX_LINE, width=S(3) if lead else max(1, S(2)))
            rrect(dr, (PXL, y + S(22), PXL + S(6), y + CH - S(22)), S(3), fill=c["col"])
            im.paste(avs[i], (PXL + S(22), int(y + S(20))), avs[i])
            txt = fmt(round(disp[i], dec))
            pw = D_card.width(txt)
            pcol = mix(mix(c["col"], (255, 255, 255), 0.35), (255, 255, 255), 0.6 * flash[i])
            D_card.draw_text(im, PXR - S(22) - pw, y + S(20) + (AV + S(8)) / 2 - (D_card.h - 2 * D_card.pad) / 2, txt, pcol)
            nm = c["name"]
            nf = F_name
            while nf.getlength(nm) > PXR - PXL - S(48):
                nf = barlow(nf.size - 1, "Bold")
            dr.text((PXL + S(24), y + S(152)), nm, font=nf, fill=PX_TXT, anchor="la")
            if c.get("role"):
                dr.text((PXL + S(24), y + S(190)), c["role"], font=F_role, fill=PX_MUTE, anchor="la")
        return im

    def end_card():
        im = bg.copy()
        dr = ImageDraw.Draw(im)
        dr.rectangle((0, 0, W, H), fill=PX_BG1)
        for x in range(0, W, S(40)):
            dr.line((x, 0, x, H), fill=(15, 21, 37))
        for y in range(0, H, S(40)):
            dr.line((0, y, W, y), fill=(15, 21, 37))
        if endline:
            big = brand_logo(S(44))
            im.paste(big, ((W - big.size[0]) // 2, S(40)), big)
            dr.text((W / 2, S(104)), endline.upper(), font=bebas(S(60)), fill=PX_TXT, anchor="ma")
        else:
            big = brand_logo(S(58))
            im.paste(big, ((W - big.size[0]) // 2, S(58)), big)
            dr.text((W / 2, S(150)), label + "  " + sub.upper(), font=bebas(S(48)), fill=PX_TXT, anchor="ma")
        rank = sorted(range(2), key=lambda i: -cands[i]["final"])
        tie = abs(cands[0]["final"] - cands[1]["final"]) < 0.5
        if tie:
            rank = [0, 1]
        L, R, RH_ = S(250), W - S(250), S(176)
        for r_, i in enumerate(rank):
            c = cands[i]
            y = S(222) + r_ * (RH_ + S(20))
            rrect(dr, (L, y, R, y + RH_), S(20), fill=mix(PX_PANEL, c["col"], 0.10), outline=c["col"] if r_ == 0 and not tie else PX_LINE, width=S(3) if r_ == 0 and not tie else S(2))
            av = avatar(c, S(128), S)
            im.paste(av, (L + S(22), y + (RH_ - av.size[1]) // 2), av)
            dr.text((L + S(176), y + S(48)), c["name"], font=barlow(S(36), "Bold"), fill=PX_TXT, anchor="la")
            if c.get("role"):
                dr.text((L + S(176), y + S(96)), c["role"], font=barlow(S(25), "Medium"), fill=PX_MUTE, anchor="la")
            Dp = Digits(bebas(S(110)), c["col"])
            txt = fmt(c["final"])
            Dp.draw_text(im, R - S(28) - Dp.width(txt), y + RH_ / 2 - (Dp.h - 2 * Dp.pad) / 2, txt, mix(c["col"], (255, 255, 255), 0.35))
        dr.text((W / 2, S(640)), "Midpoint, cents" if endline else "Midpoint, cents  ·  " + te(T).strftime(f"%a, %b %-d, %H:%M {ET_LABEL}"), font=barlow(S(26), "SemiBold"), fill=PX_MUTE, anchor="ma")
        return im

    ec = end_card() if NE else None
    XF = min(12, NE)
    frame = None
    for n in range(NA + NH + NE):
        if n < NA + NH:
            if n < NA + 24 or chart_last is None:
                chart_last = chart_frame(n)
            frame = chart_last
        else:
            k = n - NA - NH
            frame = Image.blend(chart_last, ec, min(1.0, (k + 1) / XF)) if k < XF else ec
        ff.stdin.write(frame.tobytes())
    ff.stdin.close()
    ff.wait()
    frame.save(still)
    return {"out": out, "still": still, "window": [t0.isoformat(), t1.isoformat()], "final": {c["abbr"]: c["final"] for c in cands}}


def main():
    cfg = json.load(open(sys.argv[1]))
    result = render(cfg)
    print(json.dumps(result))


if __name__ == "__main__":
    main()

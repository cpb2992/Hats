"""Renders the Hats icon set into assets/: the app's tilted blue ball cap, no words.

The cap is the same sticker the app uses in its header (src/personal/hatArt.ts, "cap", tilted
-10°). It's lopsided (a big dome, a long brim to the left), so centering its outline makes it
look off. Each icon places it by its visual center instead: halfway between the outline's center
and the center of mass, set a touch above the middle (where eyes read "centered").

    pip install cairosvg pillow numpy && python3 scripts/make_icons.py [out_dir] [background]
"""
import io
import os
import sys

import cairosvg
import numpy as np
from PIL import Image

OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets")
BG = sys.argv[2] if len(sys.argv) > 2 else "#F7C948"  # the app's sun yellow

INK = "#1D2D45"
SKY = "#8DB8EA"
BLUE = "#3D65A2"
TILT = -10

# The cap on its 64×64 grid, as in hatArt.ts.
DOME = "M14 44 C14 26 23 16 34 16 C46 16 53 27 53 44 Z"
SEAM = "M33 17 C29 24 28 32 28 38"
BILL = "M3 47 Q4 40 16 42 L53 43.5 Q58 48 52 51 L9 51 Q3 51 3 47 Z"


def cap_art(mono=None):
    """The cap's shapes. mono="solid" is its white silhouette; mono="cuts" the lines cut out of it."""
    if mono == "solid":
        return (
            f'<path d="{DOME}" fill="#fff" stroke="#fff" stroke-width="2.6" stroke-linejoin="round"/>'
            f'<path d="{BILL}" fill="#fff" stroke="#fff" stroke-width="2.6" stroke-linejoin="round"/>'
            f'<circle cx="34" cy="15.5" r="2.8" fill="#fff" stroke="#fff" stroke-width="1.8"/>'
        )
    if mono == "cuts":
        return (
            f'<path d="{SEAM}" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/>'
            '<path d="M16.5 42.1 L52.5 43.6" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>'
        )
    return (
        f'<path d="{DOME}" fill="{SKY}" stroke="{INK}" stroke-width="2.6" stroke-linejoin="round"/>'
        f'<path d="M24.5 22 Q27 19 30.5 18" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity="0.55"/>'
        f'<path d="{SEAM}" fill="none" stroke="{INK}" stroke-width="1.6" stroke-linecap="round" opacity="0.35"/>'
        f'<path d="{BILL}" fill="{BLUE}" stroke="{INK}" stroke-width="2.6" stroke-linejoin="round"/>'
        f'<circle cx="34" cy="15.5" r="2.8" fill="{BLUE}" stroke="{INK}" stroke-width="1.8"/>'
    )


def cap(cx, cy, width, mono=None):
    """The tilted cap, `width` px across its 64-grid box, its box centered on (cx, cy)."""
    s = width / 64
    return f'<g transform="translate({cx} {cy}) rotate({TILT}) scale({s}) translate(-32 -32)">{cap_art(mono)}</g>'


def svg(size, body, bg=None):
    rect = f'<rect width="{size}" height="{size}" fill="{bg}"/>' if bg else ""
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 {size} {size}">{rect}{body}</svg>'


def alpha(markup, size):
    png = cairosvg.svg2png(bytestring=markup.encode(), output_width=size, output_height=size)
    return np.array(Image.open(io.BytesIO(png)).convert("RGBA"))[..., 3] / 255


def placed(size, span, *, above=0.02, mono=None, shadow=False):
    """The cap scaled so its widest side is `span` px, its visual center just above the middle."""
    probe = 1024
    a = alpha(svg(probe, cap(probe / 2, probe / 2, probe * 0.6)), probe)
    ys, xs = np.nonzero(a > 0.5)
    seen_w = max(xs.max() - xs.min(), ys.max() - ys.min())
    width = probe * 0.6 * span / seen_w * (size / probe)
    a = alpha(svg(size, cap(size / 2, size / 2, width)), size)
    ys, xs = np.nonzero(a > 0.5)
    total = a.sum()
    mass_x = (a * np.arange(size)[None, :]).sum() / total
    mass_y = (a * np.arange(size)[:, None]).sum() / total
    seen_x = 0.5 * (xs.min() + xs.max()) / 2 + 0.5 * mass_x
    seen_y = 0.5 * (ys.min() + ys.max()) / 2 + 0.5 * mass_y
    cx = size / 2 + (size / 2 - seen_x)
    cy = size / 2 + (size / 2 - above * size - seen_y)
    shade = ""
    if shadow:
        # A soft shadow under the brim so the cap sits on something.
        bottom = ys.max() + (cy - size / 2)
        shade = (
            f'<defs><filter id="blur" x="-50%" y="-50%" width="200%" height="200%">'
            f'<feGaussianBlur stdDeviation="{size * 0.012}"/></filter></defs>'
            f'<ellipse cx="{size / 2}" cy="{bottom + size * 0.03}" rx="{span * 0.36}" ry="{size * 0.028}" '
            f'fill="{INK}" opacity="0.16" filter="url(#blur)"/>'
        )
    return shade + cap(cx, cy, width, mono=mono)


def write_mono(name, size, span):
    """Android's themed icon: only alpha counts, so the seams are cut out of a white silhouette."""
    solid = alpha(svg(size, placed(size, span, mono="solid")), size)
    cuts = alpha(svg(size, placed(size, span, mono="cuts")), size)
    a = np.clip(solid - cuts, 0, 1)
    rgba = np.zeros((size, size, 4), dtype=np.uint8)
    rgba[..., :3] = 255
    rgba[..., 3] = (a * 255).round().astype(np.uint8)
    Image.fromarray(rgba).save(os.path.join(OUT, name))


def write(name, markup, size):
    os.makedirs(OUT, exist_ok=True)
    cairosvg.svg2png(bytestring=markup.encode(), write_to=os.path.join(OUT, name), output_width=size, output_height=size)


# The full icon (iOS, Play listing): the cap fills about two thirds of the tile.
write("icon.png", svg(1024, placed(1024, 700), bg=BG), 1024)
# Android shows the middle 72/108 of these layers, cut to the phone's shape; keep the cap inside
# the 66/108 safe circle (about 626 px of 1024) so no launcher shape clips the brim.
write("android-icon-background.png", svg(1024, "", bg=BG), 1024)
write("android-icon-foreground.png", svg(1024, placed(1024, 450)), 1024)
write_mono("android-icon-monochrome.png", 1024, 450)
write("favicon.png", svg(48, placed(48, 40), bg=BG), 48)
print("icons written to", os.path.normpath(OUT))

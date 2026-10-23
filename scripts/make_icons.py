"""Renders the Hats icon set (a navy ball cap with cream stitching) into assets/.

The cap is lopsided (a big dome on the left, a thin brim to the right), so centering its outline
makes it look low and left. Each icon is placed by its visual center instead: halfway between the
outline's center and the center of mass across, three quarters toward the mass down, set a touch
above the middle (where eyes read "centered").

    pip install cairosvg pillow numpy && python3 scripts/make_icons.py
"""
import io
import os

import cairosvg
import numpy as np
from PIL import Image

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets")

CAP = "M4 15a7 7 0 0 1 14 0c2.5 0 4 .6 4.5 1.6-2 .7-5.5.8-8.5.4H9c-3 0-5-.8-5-2z"

# A navy ball cap with cream stitching and a gold button. Light backgrounds get true navy;
# the dark app gets a navy lifted a shade so it still reads on ink.
NAVY = "#1C2F57"
NAVY_ON_DARK = "#243C70"
STITCH = "#F3F1EA"
BUTTON = "#F2C14E"
CREAM = "#F3F1EA"
INK = "#0D110F"


def seams(stitch=STITCH, button=BUTTON):
    return (
        f'<path d="M5.6 14.8a5.4 5.4 0 0 1 10.8 0" fill="none" stroke="{stitch}" stroke-width="0.32" stroke-dasharray="0.55 0.4" stroke-linecap="round"/>'
        f'<path d="M11 8c-1.5 2-2 4.5-2 7M11 8c1.5 2 2.2 4.5 2.2 7" fill="none" stroke="{stitch}" stroke-width="0.36" stroke-dasharray="0.55 0.4" stroke-linecap="round"/>'
        f'<path d="M14.6 16.4c2.6.2 5-.1 6.6-.6" fill="none" stroke="{stitch}" stroke-width="0.32" stroke-dasharray="0.55 0.4" stroke-linecap="round" stroke-opacity="0.8"/>'
        f'<path d="M4.4 15.5c3 .5 9.6.5 13.6-.5" fill="none" stroke="{stitch}" stroke-width="0.45" stroke-linecap="round"/>'
        f'<circle cx="11" cy="7.75" r="0.75" fill="{button}"/>'
    )


def cap(cx, cy, width, fill=NAVY, seams_on=True):
    s = width / 18.5
    inner = f'<path d="{CAP}" fill="{fill}"/>' + (seams() if seams_on else "")
    return f'<g transform="translate({cx} {cy}) scale({s}) translate(-13.25 -12.6)">{inner}</g>'


def svg(size, body, bg=None):
    rect = f'<rect width="{size}" height="{size}" fill="{bg}"/>' if bg else ""
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 {size} {size}">{rect}{body}</svg>'


def alpha(markup, size):
    png = cairosvg.svg2png(bytestring=markup.encode(), output_width=size, output_height=size)
    return np.array(Image.open(io.BytesIO(png)).convert("RGBA"))[..., 3] / 255


def placed_cap(size, width, *, above=0.018, fill=NAVY, seams=True):
    """The cap drawn so its visual center sits just above the middle of a size×size canvas."""
    a = alpha(svg(size, cap(size / 2, size / 2, width)), size)
    ys, xs = np.nonzero(a > 0.5)
    total = a.sum()
    mass_x = (a * np.arange(size)[None, :]).sum() / total
    mass_y = (a * np.arange(size)[:, None]).sum() / total
    box_x, box_y = (xs.min() + xs.max()) / 2, (ys.min() + ys.max()) / 2
    seen_x = 0.5 * box_x + 0.5 * mass_x
    seen_y = 0.25 * box_y + 0.75 * mass_y
    cx = size / 2 + (size / 2 - seen_x)
    cy = size / 2 + (size / 2 - above * size - seen_y)
    return cap(cx, cy, width, fill=fill, seams_on=seams)


def write(name, markup, size):
    cairosvg.svg2png(bytestring=markup.encode(), write_to=os.path.join(OUT, name), output_width=size, output_height=size)


stitch = f'<rect x="72" y="72" width="880" height="880" rx="190" fill="none" stroke="{NAVY}" stroke-opacity="0.28" stroke-width="10" stroke-dasharray="30 24"/>'
write("icon.png", svg(1024, stitch + placed_cap(1024, 600), bg=CREAM), 1024)
write("android-icon-background.png", svg(1024, "", bg=CREAM), 1024)
# Android shows the middle 72/108 of these layers, cut to the phone's shape; keep the brim inside the 66/108 safe circle.
write("android-icon-foreground.png", svg(1024, placed_cap(1024, 510)), 1024)
write("android-icon-monochrome.png", svg(1024, placed_cap(1024, 510, fill="#FFFFFF", seams=False)), 1024)
# The splash sits on the app's dark ink, so it uses the lifted navy.
write("splash-icon.png", svg(512, placed_cap(512, 400, fill=NAVY_ON_DARK)), 512)
write("favicon.png", svg(48, placed_cap(48, 40, seams=False), bg=CREAM), 48)
write("notification-icon.png", svg(96, placed_cap(96, 84, fill="#FFFFFF", seams=False)), 96)
print("icons written to", os.path.normpath(OUT))

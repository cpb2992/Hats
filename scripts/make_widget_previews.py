"""Renders the widget-picker preview images for Hats' home-screen widgets into assets/widget-preview/.

Needs the app fonts installed (Bricolage Grotesque, Inter Tight) so the text matches:
    mkdir -p ~/.fonts && cp assets/fonts/*.ttf ~/.fonts && fc-cache -f && python3 scripts/make_widget_previews.py
"""
import os

import cairosvg

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "widget-preview")
CAP = "M4 15a7 7 0 0 1 14 0c2.5 0 4 .6 4.5 1.6-2 .7-5.5.8-8.5.4H9c-3 0-5-.8-5-2z"
MIC = "M9 5a3 3 0 0 1 6 0v6a3 3 0 0 1-6 0zM19 10v1a7 7 0 0 1-14 0v-1M12 18v4"
SPED = "M3 20h5v-5h5v-5h5V5h3"
BG, INK, INK2, GOLD, ONG = "#161C19", "#F3F1EA", "#9AA39D", "#F2C14E", "#0D110F"
D = "font-family:'Bricolage Grotesque';font-weight:600"
S = "font-family:'Inter Tight';font-weight:600"
B = "font-family:'Inter Tight';font-weight:700"
M = "font-family:'Inter Tight';font-weight:500"


NAVY = "#243C70"


def cap(x, y, w):
    """The navy cap mark (cream center seams and band, gold button), as the widgets draw it."""
    s = w / 20
    return (f'<g transform="translate({x} {y}) scale({s}) translate(-3 -6.5)"><path d="{CAP}" fill="{NAVY}"/>'
            f'<path d="M11 8c-1.5 2-2 4.5-2 7M11 8c1.5 2 2.2 4.5 2.2 7" fill="none" stroke="{INK}" stroke-width="0.7" stroke-dasharray="0.8 0.55" stroke-linecap="round"/>'
            f'<path d="M4.4 15.5c3 .5 9.6.5 13.6-.5" fill="none" stroke="{INK}" stroke-width="0.6" stroke-linecap="round"/>'
            f'<circle cx="11" cy="7.75" r="0.95" fill="{GOLD}"/></g>')


def header(label, status, w):
    return (cap(32, 32, 48) +
            f'<text x="92" y="52" style="{B};font-size:24px" fill="{GOLD}">{label}</text>'
            f'<text x="{w - 32}" y="52" text-anchor="end" style="{S};font-size:24px" fill="{INK2}">{status}</text>')


def svg(w, h, body, bg=BG):
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}"><rect width="{w}" height="{h}" rx="48" fill="{bg}"/>{body}</svg>'


def write(name, markup, w, h):
    cairosvg.svg2png(bytestring=markup.encode(), write_to=f"{OUT}/{name}", output_width=w, output_height=h)


W, H = 640, 300
patch = (f'<g transform="translate(32 220)"><circle cx="24" cy="24" r="22" fill="#3E5C9A"/>'
         f'<circle cx="24" cy="24" r="18.5" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1.3" stroke-dasharray="2.2 1.9"/>'
         f'<g transform="translate(13 13) scale(.917)"><path d="{SPED}" fill="none" stroke="{INK}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></g></g>')
now = (header('NOW', 'RBR · 46 min free', W) +
       f'<text x="32" y="130" style="{D};font-size:40px" fill="{INK}">Sign the progress note</text>'
       f'<text x="32" y="176" style="{D};font-size:40px" fill="{INK}">for A.R.</text>' + patch +
       f'<text x="94" y="252" style="{M};font-size:24px" fill="{INK2}">SPED · 10 min</text>'
       f'<rect x="410" y="216" width="112" height="56" rx="28" fill="{GOLD}"/>'
       f'<path d="M438 232v24l20-12z" fill="{ONG}"/><text x="466" y="253" style="{B};font-size:26px" fill="{ONG}">10m</text>'
       f'<circle cx="572" cy="244" r="27" fill="none" stroke="{INK}" stroke-opacity=".25" stroke-width="2"/>'
       f'<path d="M560 245l8 8 16-17" fill="none" stroke="{INK}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>')
write('now.png', svg(W, H, now), W, H)

students = [('J.S.', '2 · +1'), ('A.R.', '1 · x/n'), ('D.K.', '0 · +1'), ('M.T.', '1 · x/n')]
cells = ''
for i, (ini, sub) in enumerate(students):
    cx = 90 + i * 153
    cells += (f'<circle cx="{cx}" cy="170" r="48" fill="#3E5C9A" stroke="#fff" stroke-opacity=".45" stroke-width="3" stroke-dasharray="6 5"/>'
              f'<text x="{cx}" y="180" text-anchor="middle" style="{B};font-size:26px" fill="{INK}">{ini}</text>'
              f'<text x="{cx}" y="258" text-anchor="middle" style="{S};font-size:22px" fill="{GOLD if not sub.startswith("0") else INK2}">{sub}</text>')
log = header('CASELOAD', '4 logged today', W) + cells
write('log.png', svg(W, H, log), W, H)

SW, SH = 320, 150
say = (f'<g transform="translate(40 51) scale(2)"><path d="{MIC}" fill="none" stroke="{ONG}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></g>'
       f'<text x="104" y="86" style="{D};font-size:28px" fill="{ONG}">Say anything</text>')
write('say.png', svg(SW, SH, say, bg=GOLD), SW, SH)
print('previews written')

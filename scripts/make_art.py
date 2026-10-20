#!/usr/bin/env python3
"""Draw the themed SVG illustrations in img/art/ (used where no photo exists).

    python3 scripts/make_art.py

Each illustration is the same sunny background (sand sky, yellow sun, two blue
waves) with one line-drawn icon in navy and yellow. Add a name + icon below to
make a new one and reference it from data/content.js as  art: "<name>".
"""
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "img" / "art"
OUT.mkdir(parents=True, exist_ok=True)

NAVY, BLUE, SKY, YEL, YELD, SAND, WHITE = "#0B3D91", "#1B6CA8", "#2E9CCA", "#FFC93C", "#F9B233", "#FFFBF2", "#FFFFFF"

BG = f"""<defs>
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF3C4"/><stop offset="1" stop-color="#E3F2FA"/></linearGradient>
</defs>
<rect width="800" height="500" fill="url(#sky)"/>
<circle cx="660" cy="110" r="70" fill="{YEL}"/>
<circle cx="660" cy="110" r="92" fill="none" stroke="{YELD}" stroke-width="3" stroke-dasharray="10 14" opacity=".6"/>
<path d="M0 400 C 140 360, 260 440, 400 400 S 660 360, 800 400 V500 H0Z" fill="{SKY}" opacity=".35"/>
<path d="M0 430 C 160 400, 240 470, 400 440 S 640 400, 800 440 V500 H0Z" fill="{BLUE}" opacity=".45"/>
"""
SN = f'stroke="{NAVY}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"'   # after an explicit fill
S6N = f'stroke="{NAVY}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"'
S = f'fill="none" {SN}'
S6 = f'fill="none" {S6N}'
SY = f'fill="none" stroke="{YELD}" stroke-width="8" stroke-linecap="round"'

ICONS = {
    # camera with flame and motion arcs
    "fire-motion": f"""
<rect x="230" y="190" width="260" height="170" rx="22" fill="{WHITE}" {SN}/>
<rect x="300" y="150" width="120" height="40" rx="12" fill="{WHITE}" {SN}/>
<circle cx="360" cy="275" r="52" fill="{WHITE}" {SN}/><circle cx="360" cy="275" r="24" fill="{BLUE}"/>
<path d="M560 330 c-40-30-40-80 0-110 c-5 35 20 45 20 70 c25-15 25-45 15-70 c45 35 40 95 -35 110z" fill="{YEL}" stroke="{YELD}" stroke-width="6" stroke-linejoin="round"/>
<path d="M160 230 a90 90 0 0 0 0 90" {SY}/><path d="M120 200 a140 140 0 0 0 0 150" {SY} opacity=".6"/>
""",
    # LoRa antenna mast with waves over a field
    "lora": f"""
<path d="M400 120 V380" {S}/><path d="M340 380 H460" {S}/><path d="M370 380 L400 250 L430 380" {S6}/>
<circle cx="400" cy="120" r="16" fill="{YEL}" stroke="{NAVY}" stroke-width="8"/>
<path d="M330 150 a90 90 0 0 1 0 -60" {SY}/><path d="M290 175 a140 140 0 0 1 0 -110" {SY} opacity=".7"/>
<path d="M470 150 a90 90 0 0 0 0 -60" {SY}/><path d="M510 175 a140 140 0 0 0 0 -110" {SY} opacity=".7"/>
<rect x="150" y="320" width="70" height="60" rx="10" fill="{WHITE}" {S6N}/><path d="M185 320 V280" {S6}/><circle cx="185" cy="275" r="8" fill="{YEL}"/>
<rect x="580" y="320" width="70" height="60" rx="10" fill="{WHITE}" {S6N}/><path d="M615 320 V280" {S6}/><circle cx="615" cy="275" r="8" fill="{YEL}"/>
""",
    # open book with device -> cloud chain
    "handbook": f"""
<path d="M160 180 Q270 150 390 190 V380 Q270 340 160 370 Z" fill="{WHITE}" {SN}/>
<path d="M620 180 Q510 150 390 190 V380 Q510 340 620 370 Z" fill="{WHITE}" {SN}/>
<path d="M200 230 H340 M200 270 H340 M200 310 H320" {S6} opacity=".5"/>
<rect x="430" y="250" width="50" height="40" rx="8" fill="{YEL}" stroke="{NAVY}" stroke-width="6"/>
<path d="M480 270 H520" {S6}/>
<path d="M530 290 a25 25 0 0 1 10 -48 a30 30 0 0 1 56 8 a22 22 0 0 1 -6 40 z" fill="{SKY}" stroke="{NAVY}" stroke-width="6"/>
""",
    # ESP32 board with wifi arcs
    "esp32": f"""
<rect x="250" y="170" width="300" height="200" rx="18" fill="{WHITE}" {SN}/>
<rect x="330" y="220" width="140" height="100" rx="10" fill="{NAVY}"/>
<text x="400" y="280" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="30" font-weight="700" fill="{YEL}">ESP32</text>
<g {S6}><path d="M250 200 H220 M250 240 H220 M250 280 H220 M250 320 H220 M550 200 H580 M550 240 H580 M550 280 H580 M550 320 H580"/></g>
<path d="M200 150 a60 60 0 0 0 -60 -60" {SY}/><path d="M200 110 a100 100 0 0 0 -100 -100" {SY} opacity=".6"/>
<circle cx="285" cy="200" r="10" fill="{YEL}"/>
""",
    # task timeline bars (RTOS)
    "rtos": f"""
<rect x="180" y="150" width="440" height="220" rx="18" fill="{WHITE}" {SN}/>
<g stroke-width="22" stroke-linecap="round">
<path d="M230 200 H330 M380 200 H420" stroke="{BLUE}"/><path d="M230 250 H260 M300 250 H330 M370 250 H400 M440 250 H470 M510 250 H540" stroke="{YELD}"/>
<path d="M230 300 H560" stroke="{SKY}"/><path d="M230 340 H280 M450 340 H500" stroke="{NAVY}"/></g>
<circle cx="560" cy="210" r="30" fill="{YEL}" stroke="{NAVY}" stroke-width="8"/><path d="M560 195 V212 L572 220" {S6}/>
""",
    # chat bubbles
    "chatbot": f"""
<path d="M180 160 h300 a30 30 0 0 1 30 30 v110 a30 30 0 0 1 -30 30 h-200 l-60 50 v-50 h-40 a30 30 0 0 1 -30 -30 v-110 a30 30 0 0 1 30 -30z" fill="{WHITE}" {SN}/>
<path d="M220 215 H440 M220 255 H380" {S6} opacity=".5"/>
<path d="M620 250 h-180 a30 30 0 0 0 -30 30 v70 a30 30 0 0 0 30 30 h120 l60 45 v-45 a30 30 0 0 0 30 -30 v-70 a30 30 0 0 0 -30 -30z" fill="{YEL}" stroke="{NAVY}" stroke-width="10" stroke-linejoin="round"/>
<circle cx="470" cy="315" r="9" fill="{NAVY}"/><circle cx="520" cy="315" r="9" fill="{NAVY}"/><circle cx="570" cy="315" r="9" fill="{NAVY}"/>
""",
    # camera counting hens
    "poultry-vision": f"""
<rect x="150" y="150" width="200" height="120" rx="16" fill="{WHITE}" {SN}/><circle cx="250" cy="210" r="38" fill="{WHITE}" {SN}/><circle cx="250" cy="210" r="16" fill="{BLUE}"/>
<path d="M350 210 L450 260 M350 210 L450 330" {S6} stroke-dasharray="14 12" opacity=".6"/>
<g fill="{YEL}" stroke="{NAVY}" stroke-width="7"><ellipse cx="500" cy="300" rx="42" ry="30"/><ellipse cx="600" cy="320" rx="42" ry="30"/><ellipse cx="560" cy="250" rx="42" ry="30"/></g>
<g fill="{NAVY}"><circle cx="470" cy="290" r="5"/><circle cx="570" cy="310" r="5"/><circle cx="530" cy="240" r="5"/></g>
<rect x="470" y="150" width="130" height="50" rx="12" fill="{NAVY}"/><text x="535" y="185" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="28" font-weight="700" fill="{YEL}">n = 3</text>
""",
    # eye with grid
    "cv": f"""
<path d="M170 260 Q400 90 630 260 Q400 430 170 260 Z" fill="{WHITE}" {SN}/>
<circle cx="400" cy="260" r="70" fill="{SKY}" stroke="{NAVY}" stroke-width="10"/><circle cx="400" cy="260" r="30" fill="{NAVY}"/><circle cx="420" cy="240" r="10" fill="{WHITE}"/>
<rect x="300" y="170" width="200" height="180" rx="10" fill="none" stroke="{YELD}" stroke-width="6" stroke-dasharray="12 10"/>
""",
    # cloud pipeline
    "aws-pipeline": f"""
<rect x="130" y="240" width="90" height="70" rx="12" fill="{YEL}" stroke="{NAVY}" stroke-width="8"/>
<path d="M220 275 H290" {S6}/><path d="M275 262 L292 275 L275 288" {S6}/>
<rect x="300" y="240" width="90" height="70" rx="12" fill="{WHITE}" {S6N}/>
<path d="M390 275 H460" {S6}/><path d="M445 262 L462 275 L445 288" {S6}/>
<path d="M480 330 a40 40 0 0 1 10 -78 a52 52 0 0 1 100 10 a36 36 0 0 1 -8 68 z" fill="{WHITE}" {SN}/>
<path d="M525 330 V380 M525 380 H640" {S6}/>
<g stroke-width="18" stroke-linecap="round"><path d="M640 380 V340" stroke="{BLUE}"/><path d="M670 380 V320" stroke="{YELD}"/><path d="M700 380 V350" stroke="{SKY}"/></g>
""",
    # tiny chip with sparkline
    "tinyml": f"""
<rect x="280" y="170" width="240" height="200" rx="20" fill="{WHITE}" {SN}/>
<g {S6}><path d="M280 210 H240 M280 250 H240 M280 290 H240 M280 330 H240 M520 210 H560 M520 250 H560 M520 290 H560 M520 330 H560 M320 170 V130 M360 170 V130 M400 170 V130 M440 170 V130 M480 170 V130 M320 370 V410 M360 370 V410 M400 370 V410 M440 370 V410 M480 370 V410"/></g>
<path d="M310 300 L340 300 L360 240 L380 330 L400 270 L420 300 L440 230 L460 300 L490 300" fill="none" stroke="{BLUE}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
<circle cx="440" cy="230" r="12" fill="{YEL}" stroke="{NAVY}" stroke-width="5"/>
""",
    # cloud with building blocks
    "aws-arch": f"""
<path d="M250 330 a55 55 0 0 1 15 -108 a70 70 0 0 1 135 12 a48 48 0 0 1 -10 96 z" fill="{WHITE}" {SN}/>
<g stroke="{NAVY}" stroke-width="7"><rect x="430" y="300" width="70" height="60" rx="8" fill="{YEL}"/><rect x="510" y="300" width="70" height="60" rx="8" fill="{SKY}"/><rect x="470" y="230" width="70" height="60" rx="8" fill="{WHITE}"/></g>
<path d="M330 380 H600" {S6} opacity=".4"/>
""",
    # wifi arcs with location pin
    "wifi": f"""
<path d="M400 360 m-14 0 a14 14 0 1 0 28 0 a14 14 0 1 0 -28 0" fill="{NAVY}"/>
<path d="M330 300 a100 100 0 0 1 140 0" {S}/><path d="M280 250 a170 170 0 0 1 240 0" {S} opacity=".75"/><path d="M230 200 a240 240 0 0 1 340 0" {S} opacity=".5"/>
<path d="M560 330 c0 -40 -30 -60 -30 -60 c-30 0 -30 20 -30 60 l30 50 z" fill="{YEL}" stroke="{NAVY}" stroke-width="8" stroke-linejoin="round"/><circle cx="530" cy="300" r="10" fill="{NAVY}"/>
""",
    # simulation: chart with target band
    "simulation": f"""
<rect x="170" y="150" width="460" height="230" rx="18" fill="{WHITE}" {SN}/>
<rect x="200" y="215" width="400" height="26" fill="{YEL}" opacity=".6"/>
<path d="M200 350 C 260 350, 300 230, 340 225 S 420 240, 460 228 S 540 232, 600 228" fill="none" stroke="{BLUE}" stroke-width="9" stroke-linecap="round"/>
<g stroke="{NAVY}" stroke-width="14" stroke-linecap="round"><path d="M210 400 H290 M330 400 H350 M400 400 H420 M470 400 H490 M540 400 H560"/></g>
""",
    # certificate placeholder
    "certificate": f"""
<rect x="150" y="110" width="500" height="300" rx="16" fill="{WHITE}" {S6N}/>
<rect x="175" y="135" width="450" height="250" rx="8" fill="none" stroke="{YELD}" stroke-width="4" stroke-dasharray="10 8"/>
<path d="M220 200 H580 M250 240 H550 M290 280 H510" stroke="{BLUE}" stroke-width="8" stroke-linecap="round" opacity=".35"/>
<circle cx="560" cy="340" r="34" fill="{YEL}" stroke="{NAVY}" stroke-width="6"/><path d="M545 370 L535 420 L560 400 L585 420 L575 370" fill="{BLUE}"/>
<text x="330" y="350" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="22" font-weight="700" fill="{NAVY}">scan to be added</text>
""",
}

for name, icon in ICONS.items():
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" role="img" aria-label="{name} illustration">\n{BG}{icon}</svg>\n'
    (OUT / f"{name}.svg").write_text(svg)
    print("ok", name)

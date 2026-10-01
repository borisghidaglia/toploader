"""
Builds Toploader Mart's sprites and fonts from the pokeemerald decompilation
(https://github.com/pret/pokeemerald), so the page uses the game's own pixels.

    git clone --depth 1 https://github.com/pret/pokeemerald.git /tmp/pokeemerald
    python3 -m venv .venv && .venv/bin/pip install pillow fonttools brotli skia-pathops
    .venv/bin/python scripts/extract-emerald.py /tmp/pokeemerald

Writes the PNGs and fonts to public/emerald/.
"""

import re
import struct
import sys
from pathlib import Path

import pathops
from fontTools.colorLib.builder import buildCOLR, buildCPAL
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from PIL import Image

SRC = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/pokeemerald")
APP = Path(__file__).resolve().parent.parent
SPRITES = APP / "public/emerald"
FONTS = APP / "public/emerald/fonts"


# --- GBA colors and graphics -------------------------------------------------


def gba_color(rgb):
    """Snap to the GBA's 15-bit color and expand it the way the decomp's .pal files do."""
    return tuple((c >> 3) * 255 // 31 for c in rgb[:3])


def png_palette(img):
    raw = img.getpalette()
    return [gba_color(raw[i : i + 3]) for i in range(0, len(raw), 3)]


def jasc(path):
    lines = (SRC / path).read_text().split("\n")
    return [gba_color(tuple(int(v) for v in line.split())) for line in lines[3 : 3 + int(lines[2])]]


def tiles_of(img):
    """8x8 tiles of palette indices, row-major."""
    px = img.load()
    w, h = img.size
    return [
        [[px[tx * 8 + x, ty * 8 + y] for x in range(8)] for y in range(8)]
        for ty in range(h // 8)
        for tx in range(w // 8)
    ]


def draw_tile(canvas, tile, x0, y0, pal, hflip=False, vflip=False):
    px = canvas.load()
    for y in range(8):
        for x in range(8):
            i = tile[7 - y if vflip else y][7 - x if hflip else x]
            if i:  # index 0 is transparent
                px[x0 + x, y0 + y] = (*pal[i], 255)


def u16s(path):
    data = (SRC / path).read_bytes()
    return list(struct.unpack(f"<{len(data) // 2}H", data))


def tilemap_entry(e):
    return e & 0x3FF, bool(e & 0x400), bool(e & 0x800)


def compose(tiles, pal, layout):
    """layout: rows of (tile index, hflip, vflip) -> RGBA image."""
    img = Image.new("RGBA", (len(layout[0]) * 8, len(layout) * 8), (0, 0, 0, 0))
    for r, row in enumerate(layout):
        for c, (t, h, v) in enumerate(row):
            draw_tile(img, tiles[t], c * 8, r * 8, pal, h, v)
    return img


def save(img, name):
    path = SPRITES / name
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, optimize=True)


# --- Windows ------------------------------------------------------------------


def windows():
    # The standard menu frame ("Type 1" in the options, the default).
    frame = Image.open(SRC / "graphics/text_window/1.png")
    tiles, pal = tiles_of(frame), png_palette(frame)
    save(compose(tiles, pal, [[(i + r * 3, False, False) for i in range(3)] for r in range(3)]), "window.png")

    # The overworld message box. It's drawn with two tile columns on the left and
    # right edge (see WindowFunc_DrawDialogueFrame), so it slices 8 / 16 / 8 / 16.
    box = Image.open(SRC / "graphics/text_window/message_box.png")
    tiles, pal = tiles_of(box), png_palette(box)
    top = [(1, False, False), (3, False, False), (4, False, False), (5, False, False), (6, False, False)]
    mid = [(7, False, False), (9, False, False), (9, False, False), (9, False, False), (10, False, False)]
    bottom = [(t, h, True) for t, h, _ in top]
    save(compose(tiles, pal, [top, mid, bottom]), "message-box.png")

    # The buy menu's list and description boxes, cut from its background tilemap.
    menu = Image.open(SRC / "graphics/shop/menu.png")
    tiles, pal = tiles_of(menu), png_palette(menu)
    n = (False, False)
    save(
        compose(tiles, pal, [[(2, *n), (4, *n), (5, *n)], [(17, *n), (13, *n), (18, *n)], [(2, False, True), (4, False, True), (5, False, True)]]),
        "list-window.png",
    )
    # The description box's corner tile also holds the foot of the item icon box
    # above it; drop that, and trim the empty rows so the outline sits on the edge.
    tiles[6] = [[0] * 8] * 2 + tiles[6][2:]
    box = compose(tiles, pal, [[(6, *n), (8, *n), (6, True, False)], [(20, *n), (1, *n), (20, True, False)], [(9, *n), (11, *n), (9, True, False)]])
    save(box.crop((0, 4, 24, 19)), "box.png")


def popup():
    """The wooden sign a town's name slides in on (map_name_popup.c), without the name."""
    wood = Image.open(SRC / "graphics/map_popup/wood.png")
    pal = png_palette(wood)
    edge = tiles_of(Image.open(SRC / "graphics/map_popup/wood_outline.png"))
    img = Image.new("RGBA", (96, 40), (0, 0, 0, 0))
    # Tiles 0-11 run along the top, 12-17 down the sides, 18-29 along the bottom (DrawMapNamePopUpFrame).
    for i in range(12):
        draw_tile(img, edge[i], i * 8, 0, pal)
        draw_tile(img, edge[18 + i], i * 8, 32, pal)
    for row in range(3):
        draw_tile(img, edge[12 + row * 2], 0, 8 + row * 8, pal)
        draw_tile(img, edge[13 + row * 2], 88, 8 + row * 8, pal)
    for i, tile in enumerate(tiles_of(wood)):
        draw_tile(img, tile, 8 + (i % 10) * 8, 8 + (i // 10) * 8, pal)
    save(img, "popup.png")
    return pal[2], pal[3]  # FONT_NARROW's text and shadow colors in this palette


# --- Small interface sprites --------------------------------------------------


def interface():
    arrows = Image.open(SRC / "graphics/interface/scroll_indicator.png")
    pal = png_palette(arrows)
    for frame, name in [(0, "scroll-left.png"), (1, "scroll-up.png")]:
        img = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
        src = arrows.crop((0, frame * 16, 16, frame * 16 + 16))
        for i, tile in enumerate(tiles_of(src)):
            draw_tile(img, tile, (i % 2) * 8, (i // 2) * 8, pal)
        save(img.crop(img.getbbox()), name)

    # The ▼ that waits at the end of a message. Index 1 is the window's white.
    arrow = Image.open(SRC / "graphics/fonts/down_arrow.png")
    pal = png_palette(arrow)
    img = Image.new("RGBA", (8, 16), (0, 0, 0, 0))
    px, out = arrow.load(), img.load()
    for y in range(16):
        for x in range(8):
            if px[x, y] > 1:
                out[x, y] = (*pal[px[x, y]], 255)
    save(img.crop(img.getbbox()), "down-arrow.png")

    # Summary-screen type icons, with the palette each type uses in game.
    palettes = {13: jasc("graphics/types/move_types_1.pal"), 14: jasc("graphics/types/move_types_2.pal"), 15: jasc("graphics/types/move_types_3.pal")}
    types = {"normal": 13, "fight": 13, "flying": 14, "poison": 14, "ground": 13, "rock": 13, "bug": 15, "ghost": 14, "steel": 13,
             "fire": 13, "water": 14, "grass": 15, "electric": 13, "psychic": 14, "ice": 14, "dragon": 15, "dark": 13}
    for name, slot in types.items():
        icon = Image.open(SRC / f"graphics/types/{name}.png")
        img = Image.new("RGBA", icon.size, (0, 0, 0, 0))
        for i, tile in enumerate(tiles_of(icon)):
            draw_tile(img, tile, (i % 4) * 8, (i // 4) * 8, palettes[slot])
        save(img.crop(img.getbbox()), f"types/{name}.png")


# --- The Poké Mart ------------------------------------------------------------


class Mart:
    """Renders metatiles from the Mart map (LAYOUT_MART: gTileset_Building + gTileset_Shop)."""

    W = 11

    def __init__(self):
        self.primary = tiles_of(Image.open(SRC / "data/tilesets/primary/building/tiles.png"))
        self.secondary = tiles_of(Image.open(SRC / "data/tilesets/secondary/shop/tiles.png"))
        self.pals = [jasc(f"data/tilesets/primary/building/palettes/{i:02}.pal") for i in range(6)] + [
            jasc(f"data/tilesets/secondary/shop/palettes/{i:02}.pal") for i in range(6, 13)
        ]
        self.pm = u16s("data/tilesets/primary/building/metatiles.bin")
        self.sm = u16s("data/tilesets/secondary/shop/metatiles.bin")
        self.map = [b & 0x3FF for b in u16s("data/layouts/Mart/map.bin")]
        self.attrs = u16s("data/tilesets/primary/building/metatile_attributes.bin")
        self.attrs2 = u16s("data/tilesets/secondary/shop/metatile_attributes.bin")

    def at(self, col, row):
        return self.map[row * self.W + col]

    def covers_objects(self, mid):
        """Whether the top layer draws over sprites (METATILE_LAYER_TYPE_NORMAL or SPLIT)."""
        attr = self.attrs[mid] if mid < 512 else self.attrs2[mid - 512]
        return attr >> 12 != 1

    def metatile(self, mid, layers=range(8), backdrop=True):
        """Bottom layer (0-3), then top layer (4-7), over the palette's backdrop color."""
        src, base = (self.pm, mid * 8) if mid < 512 else (self.sm, (mid - 512) * 8)
        img = Image.new("RGBA", (16, 16), (*self.pals[0][0], 255) if backdrop else (0, 0, 0, 0))
        for k in layers:
            t, h, v = tilemap_entry(src[base + k])
            tile = self.primary[t] if t < 512 else self.secondary[t - 512]
            draw_tile(img, tile, (k % 2) * 8, ((k % 4) // 2) * 8, self.pals[src[base + k] >> 12], h, v)
        return img

    def top(self, mid):
        return self.metatile(mid, range(4, 8), backdrop=False)

    def grid(self, rows):
        img = Image.new("RGBA", (len(rows[0]) * 16, len(rows) * 16))
        for r, row in enumerate(rows):
            for c, mid in enumerate(row):
                img.paste(self.metatile(mid), (c * 16, r * 16))
        return img


def clerk():
    """The Mart employee facing right, as they stand behind the counter in every Mart."""
    sheet = Image.open(SRC / "graphics/object_events/pics/people/mart_employee.png")
    pal = jasc("graphics/object_events/palettes/npc_1.pal")
    frame = sheet.crop((32, 0, 48, 32))  # frame 2 faces left
    img = Image.new("RGBA", (16, 32), (0, 0, 0, 0))
    for i, tile in enumerate(tiles_of(frame)):
        draw_tile(img, tile, (i % 2) * 8, (i // 2) * 8, pal)
    return img.transpose(Image.Transpose.FLIP_LEFT_RIGHT)


def mart():
    m = Mart()
    save(m.metatile(m.at(4, 6)), "floor.png")

    # The back wall as a repeating strip: glass cases, two fridges, the clock.
    # Row 2 is the floor in the wall's shadow, with the fridges' feet.
    glass, fridge_l, fridge_r, clock = (m.at(3, 0), m.at(3, 1)), (m.at(6, 0), m.at(6, 1)), (m.at(7, 0), m.at(7, 1)), (m.at(1, 0), m.at(1, 1))
    shadow = m.at(4, 2)
    unit = [glass, glass, fridge_l, fridge_r, fridge_l, fridge_r, clock, glass]
    feet = {fridge_l: m.at(6, 2), fridge_r: m.at(7, 2)}
    save(m.grid([[c[0] for c in unit], [c[1] for c in unit], [feet.get(c, shadow) for c in unit]]), "wall.png")

    # The counter corner of the Mart (map columns 0-3, rows 0-5) with the clerk at
    # their post on tile (1, 3). Like in game, top layers draw over the sprite.
    counter = m.grid([[m.at(c, r) for c in range(4)] for r in range(6)])
    counter.alpha_composite(clerk(), (16, 2 * 16))
    for row in (2, 3):
        if m.covers_objects(m.at(1, row)):
            counter.alpha_composite(m.top(m.at(1, row)), (16, row * 16))
    save(counter, "counter.png")

    # A potted plant and a double shelf, for the other side of the room.
    floor = m.at(4, 6)
    save(
        m.grid([
            [shadow, shadow],
            [floor, m.at(10, 3)],
            [m.at(6, 4), m.at(7, 4)],
            [m.at(6, 5), m.at(7, 5)],
            [m.at(6, 6), m.at(7, 6)],
            [m.at(6, 7), m.at(7, 7)],
        ]),
        "shelf.png",
    )
    # The plant's metatile also has the room's corner in its bottom layer; keep only the plant.
    shelf = Image.open(SPRITES / "shelf.png")
    shelf.alpha_composite(m.top(m.at(10, 2)), (16, 0))
    save(shelf, "shelf.png")


# --- Fonts --------------------------------------------------------------------

PIXEL = 64  # font units per GBA pixel: a 16px cell is a 1024-unit em
BASELINE = 12  # cell row the capitals stand on

# Emerald's charset has no "$" (it's the string terminator), so we draw one to
# match the digits: 5px wide, the stem poking out one pixel above and below.
DOLLAR = [
    "..#..",
    ".####",
    "#.#..",
    "#.#..",
    "#.#..",
    ".###.",
    "..#.#",
    "..#.#",
    "..#.#",
    "####.",
    "..#..",
]


def charmap():
    """Latin entries of charmap.txt as {character: code}."""
    out = {}
    for line in (SRC / "charmap.txt").read_text(encoding="utf-8").splitlines():
        m = re.match(r"^'(.+?)'\s*=\s*([0-9A-Fa-f]{2})\s*$", line.strip())
        if not m:
            continue
        ch = m.group(1).replace("\\'", "'")
        if len(ch) == 1 and ord(ch) < 0x3000 and ch != "$":
            out.setdefault(ch, int(m.group(2), 16))
    return out


def glyph_widths(name):
    body = re.search(rf"gFont{name}LatinGlyphWidths\[\] = \{{(.*?)\}};", (SRC / "src/fonts.c").read_text(), re.S).group(1)
    return [int(v) for v in re.findall(r"\d+", body)]


def outline(pixels):
    """Union of pixel squares as one clean TrueType outline."""
    path = pathops.Path()
    for x, y in pixels:
        left, top = x * PIXEL, (BASELINE - y) * PIXEL
        path.moveTo(left, top)
        path.lineTo(left + PIXEL, top)
        path.lineTo(left + PIXEL, top - PIXEL)
        path.lineTo(left, top - PIXEL)
        path.close()
    path = pathops.simplify(path, clockwise=True)
    pen = TTGlyphPen(None)
    path.draw(pen)
    return pen.glyph()


def build_font(sheet, widths_name, family, shadow):
    img = Image.open(SRC / f"graphics/fonts/{sheet}.png")
    px = img.load()
    widths = glyph_widths(widths_name)
    chars = charmap()

    def cell(code):
        # The game copies only the glyph's width and 15 rows of its cell
        # (CopyGlyphToWindow); some narrow cells have stray pixels past that.
        cx, cy, width = (code % 16) * 16, (code // 16) * 16, widths[code]
        grid = [[px[cx + x, cy + y] for x in range(width)] for y in range(15)]
        fg = [(x, y) for y in range(15) for x in range(width) if grid[y][x] == 1]
        sh = [(x, y) for y in range(15) for x in range(width) if grid[y][x] == 2]
        return fg, sh, width

    glyphs = {}  # name -> (fg, shadow, advance)
    cmap = {}
    for ch, code in chars.items():
        name = f"g{code:02X}"
        glyphs.setdefault(name, cell(code))
        cmap[ord(ch)] = name
    # Aliases for characters people type, mapped to the game's own glyphs.
    for alias, ch in {'"': "\u201c", "\u00a0": " ", "\u2011": "-"}.items():
        cmap[ord(alias)] = cmap[ord(ch)]
    # The arrows only have names in charmap.txt (UP_ARROW and so on).
    for char, code in {"\u2191": 0x79, "\u2193": 0x7A, "\u2190": 0x7B, "\u2192": 0x7C}.items():
        glyphs.setdefault(f"g{code:02X}", cell(code))
        cmap[ord(char)] = f"g{code:02X}"
    fg = {(x, y + 2) for y, row in enumerate(DOLLAR) for x, c in enumerate(row) if c == "#"}
    sh = {(x + dx, y + dy) for x, y in fg for dx, dy in [(1, 0), (0, 1), (1, 1)]} - fg
    glyphs["dollar"] = (sorted(fg), sorted(sh), 6)
    cmap[ord("$")] = "dollar"

    order = [".notdef"]
    outlines = {".notdef": TTGlyphPen(None).glyph()}
    metrics = {".notdef": (6 * PIXEL, 0)}
    layers = {}
    for name, (fg, sh, advance) in sorted(glyphs.items()):
        order += [name, f"{name}.shadow"]
        outlines[name] = outline(fg)
        outlines[f"{name}.shadow"] = outline(sh)
        metrics[name] = metrics[f"{name}.shadow"] = (advance * PIXEL, 0)
        if fg:
            # The game draws the shadow under the letter; 0xFFFF is the CSS text color.
            layers[name] = [(f"{name}.shadow", 0), (name, 0xFFFF)]

    fb = FontBuilder(16 * PIXEL, isTTF=True)
    fb.setupGlyphOrder(order)
    fb.setupCharacterMap(cmap)
    fb.setupGlyf(outlines)
    glyf = fb.font["glyf"]
    for name in order:
        glyf[name].recalcBounds(glyf)
    fb.setupHorizontalMetrics({name: (advance, getattr(glyf[name], "xMin", 0)) for name, (advance, _) in metrics.items()})
    ascent, descent = BASELINE * PIXEL, (16 - BASELINE) * PIXEL
    fb.setupHorizontalHeader(ascent=ascent, descent=-descent, lineGap=0)
    fb.setupNameTable({"familyName": family, "styleName": "Regular"})
    fb.setupOS2(
        version=4, sTypoAscender=ascent, sTypoDescender=-descent, sTypoLineGap=0,
        usWinAscent=ascent, usWinDescent=descent, fsSelection=0x40 | 0x80,  # REGULAR | USE_TYPO_METRICS
    )
    fb.setupPost()
    fb.font["COLR"] = buildCOLR(layers)
    fb.font["CPAL"] = buildCPAL([[tuple(c / 255 for c in shadow) + (1.0,)]])
    FONTS.mkdir(parents=True, exist_ok=True)
    fb.font.flavor = "woff2"
    fb.save(FONTS / f"{family.lower().replace(' ', '-')}.woff2")
    return len(cmap)


def main():
    SPRITES.mkdir(parents=True, exist_ok=True)
    windows()
    popup_text = popup()
    interface()
    mart()
    shadow = jasc("graphics/interface/std_menu.pal")[3]
    for sheet, widths_name, family in [("latin_normal", "Normal", "Emerald Normal"), ("latin_narrow", "Narrow", "Emerald Narrow")]:
        print(family, build_font(sheet, widths_name, family, shadow), "characters")
    print("text", jasc("graphics/interface/std_menu.pal")[1:4])
    menu = png_palette(Image.open(SRC / "graphics/shop/menu.png"))
    print("list", menu[10], menu[9], "border", menu[8])
    print("popup text", popup_text)


if __name__ == "__main__":
    main()

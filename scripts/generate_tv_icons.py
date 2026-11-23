import struct
import zlib
import os
import math

def make_png(width, height, get_pixel):
    raw_data = bytearray()
    for y in range(height):
        raw_data.append(0)  # filter type 0 (None)
        for x in range(width):
            r, g, b, a = get_pixel(x, y, width, height)
            raw_data.extend([r, g, b, a])

    def chunk(tag, data):
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)

    header = b'\x89PNG\r\n\x1a\n'
    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0))
    idat = chunk(b'IDAT', zlib.compress(bytes(raw_data), 9))
    iend = chunk(b'IEND', b'')
    return header + ihdr + idat + iend

def banner_pixel(x, y, w, h):
    # Dark modern karaoke gradient background
    nx = x / float(w)
    ny = y / float(h)
    
    # Background gradient from deep purple to dark blue/black
    r = int(18 + 15 * (1.0 - ny))
    g = int(14 + 10 * (1.0 - ny))
    b = int(28 + 20 * nx)

    # Center circle badge
    cx, cy = w * 0.5, h * 0.5
    dist = math.hypot(x - cx, y - cy)
    radius = h * 0.38
    
    if dist < radius:
        # Radial glow from rose to cyan
        angle = math.atan2(y - cy, x - cx)
        ratio = (math.sin(angle) + 1.0) / 2.0
        r = int(225 * ratio + 6 * (1.0 - ratio))
        g = int(29 * ratio + 182 * (1.0 - ratio))
        b = int(72 * ratio + 212 * (1.0 - ratio))
        
        # Inner dark core
        if dist < radius * 0.75:
            r = int(18 + 10 * ratio)
            g = int(16 + 10 * ratio)
            b = int(26 + 10 * ratio)
            
            # Simple stylized mic capsule in center
            if abs(x - cx) < 14 and abs(y - cy) < 22:
                r, g, b = 255, 255, 255

    return (min(255, r), min(255, g), min(255, b), 255)

def icon_pixel(x, y, w, h):
    cx, cy = w * 0.5, h * 0.5
    dist = math.hypot(x - cx, y - cy)
    radius = w * 0.44

    # Background
    r, g, b = 14, 15, 24

    if dist < radius:
        # Gradient
        ratio = (x + y) / float(w + h)
        r = int(225 * (1 - ratio) + 6 * ratio)
        g = int(29 * (1 - ratio) + 182 * ratio)
        b = int(72 * (1 - ratio) + 212 * ratio)

        if dist < radius * 0.8:
            r, g, b = 18, 16, 28
            # Center white symbol
            if abs(x - cx) < w * 0.12 and abs(y - cy) < h * 0.18:
                r, g, b = 255, 255, 255

    return (r, g, b, 255)

out_dir = os.path.abspath("android-tv/app/src/main/res/drawable")
os.makedirs(out_dir, exist_ok=True)

# 1. 320x180 Android TV Banner
banner_png = make_png(320, 180, banner_pixel)
with open(os.path.join(out_dir, "banner.png"), "wb") as f:
    f.write(banner_png)
print("Created banner.png (320x180)")

# 2. 192x192 App Icon
icon_png = make_png(192, 192, icon_pixel)
with open(os.path.join(out_dir, "ic_launcher.png"), "wb") as f:
    f.write(icon_png)
print("Created ic_launcher.png (192x192)")

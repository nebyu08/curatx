from PIL import Image, ImageDraw
import math

def create_cozy_icon(size):
    scale = 4
    img_size = size * scale
    img = Image.new("RGBA", (img_size, img_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    margin = int(img_size * 0.06)
    radius = int(img_size * 0.24)
    
    # Cozy dark obsidian squircle
    draw.rounded_rectangle(
        [(margin, margin), (img_size - margin, img_size - margin)],
        radius=radius,
        fill=(14, 17, 23, 255),
        outline=(245, 158, 11, 140),
        width=max(1, int(img_size * 0.025))
    )
    
    cx = img_size / 2
    cy = img_size / 2
    w = img_size * 0.52
    stroke_w = max(2, int(img_size * 0.08))
    
    # Warm amber / apricot strokes
    # Stroke 1: top-left to bottom-right (warm amber)
    x1, y1 = cx - w / 2, cy - w / 2
    x2, y2 = cx + w / 2, cy + w / 2
    draw.line([(x1, y1), (x2, y2)], fill=(245, 158, 11, 255), width=stroke_w)
    
    # Stroke 2: top-right to bottom-left (warm coral)
    x3, y3 = cx + w / 2, cy - w / 2
    x4, y4 = cx - w / 2, cy + w / 2
    draw.line([(x3, y3), (x4, y4)], fill=(251, 113, 133, 255), width=stroke_w)
    
    # Warm golden center dial / knob
    knob_radius = int(img_size * 0.11)
    draw.ellipse(
        [(cx - knob_radius, cy - knob_radius), (cx + knob_radius, cy + knob_radius)],
        fill=(255, 251, 235, 255),
        outline=(245, 158, 11, 255),
        width=max(1, int(img_size * 0.025))
    )
    
    return img.resize((size, size), Image.Resampling.LANCZOS)

for s in [16, 32, 48, 128]:
    icon = create_cozy_icon(s)
    icon.save(f"icons/icon{s}.png")
    print(f"Generated cozy icons/icon{s}.png")

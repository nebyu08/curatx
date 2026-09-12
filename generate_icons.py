from PIL import Image, ImageDraw
import math

def create_icon(size):
    # Create high-res image (4x supersampling for smooth antialiasing)
    scale = 4
    img_size = size * scale
    img = Image.new("RGBA", (img_size, img_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Background rounded rectangle
    margin = int(img_size * 0.06)
    radius = int(img_size * 0.22)
    # Background color: dark graphite #0f1419 matching modern X dark mode
    draw.rounded_rectangle(
        [(margin, margin), (img_size - margin, img_size - margin)],
        radius=radius,
        fill=(15, 20, 25, 255),
        outline=(29, 155, 240, 200),
        width=max(1, int(img_size * 0.02))
    )
    
    # Let's draw an X with filter sliders / tuning dots
    # Stylized X strokes:
    cx = img_size / 2
    cy = img_size / 2
    w = img_size * 0.55
    stroke_w = max(2, int(img_size * 0.085))
    
    # Color: X blue #1d9bf0 and violet accent #8a5cf6
    # Left stroke of X: top-left to bottom-right
    x1, y1 = cx - w / 2, cy - w / 2
    x2, y2 = cx + w / 2, cy + w / 2
    draw.line([(x1, y1), (x2, y2)], fill=(29, 155, 240, 255), width=stroke_w)
    
    # Right stroke of X: top-right to bottom-left
    x3, y3 = cx + w / 2, cy - w / 2
    x4, y4 = cx - w / 2, cy + w / 2
    draw.line([(x3, y3), (x4, y4)], fill=(138, 92, 246, 255), width=stroke_w)
    
    # Center tuning slider knob / glowing dot
    knob_radius = int(img_size * 0.12)
    draw.ellipse(
        [(cx - knob_radius, cy - knob_radius), (cx + knob_radius, cy + knob_radius)],
        fill=(255, 255, 255, 255),
        outline=(29, 155, 240, 255),
        width=max(1, int(img_size * 0.025))
    )
    
    # Downsample with Lanczos
    return img.resize((size, size), Image.Resampling.LANCZOS)

for s in [16, 32, 48, 128]:
    icon = create_icon(s)
    icon.save(f"icons/icon{s}.png")
    print(f"Generated icons/icon{s}.png")

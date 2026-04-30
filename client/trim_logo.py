from PIL import Image, ImageChops

def trim(im):
    bg = Image.new(im.mode, im.size, im.getpixel((0,0)))
    diff = ImageChops.difference(im, bg)
    diff = ImageChops.add(diff, diff, 2.0, -100)
    bbox = diff.getbbox()
    if bbox:
        return im.crop(bbox)
    return im

im = Image.open('public/logo.png')
# Convert to RGBA to ensure we can handle transparency if needed, 
# but mostly just to be safe.
if im.mode != 'RGBA':
    im = im.convert('RGBA')

# Trim whitespace
trimmed_im = trim(im)

# Save back
trimmed_im.save('public/logo.png')
print("Logo trimmed successfully!")

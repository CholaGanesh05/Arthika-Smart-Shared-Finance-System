from PIL import Image, ImageChops
import numpy as np

im = Image.open('C:\\Users\\CHOLA\\.gemini\\antigravity\\brain\\08e1b135-7155-4c2d-bf23-d18d1ee24a36\\media__1777562332472.png')
im = im.convert('RGBA')

# Convert to numpy array
data = np.array(im)

# Assuming background is white (255, 255, 255)
# Find all pixels that are NOT white (or close to white)
# We consider pixels with R, G, B all > 250 as white background
r, g, b, a = data[:,:,0], data[:,:,1], data[:,:,2], data[:,:,3]
non_white_pixels = (r < 250) | (g < 250) | (b < 250) | (a < 250)

# Find bounding box
coords = np.argwhere(non_white_pixels)
if len(coords) > 0:
    y0, x0 = coords.min(axis=0)
    y1, x1 = coords.max(axis=0) + 1  # slices are exclusive at the top
    
    # Crop the image
    cropped = im.crop((x0, y0, x1, y1))
    
    # Save it
    cropped.save('public/logo.png')
    print(f"Cropped from {im.size} to {cropped.size}")
else:
    print("No non-white pixels found?!")

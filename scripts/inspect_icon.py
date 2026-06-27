from PIL import Image

src = r'h:\世界杯娱乐项目\back\klpk-cgt-s-Org v2\public\icons\coin-yen.png'
img = Image.open(src).convert('RGBA')
w, h = img.size

# Inspect corners
print('Mode:', img.mode, 'Size:', (w, h))
print('Corner alpha:', img.getpixel((0, 0)))
print('Top edge samples:', [img.getpixel((i, 0))[3] for i in range(10)])
print('Center sample:', img.getpixel((w // 2, h // 2)))

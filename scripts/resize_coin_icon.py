from PIL import Image
import os

src = r'h:\世界杯娱乐项目\back\klpk-cgt-s-Org v2\public\icons\A_slightly_tilted_3D_golden_ye_2026-06-26T12-33-27.png'
dst = r'h:\世界杯娱乐项目\back\klpk-cgt-s-Org v2\public\icons\coin-yen.png'

img = Image.open(src).convert('RGBA')
# Resize to 2x retina size for 46px display
img.resize((92, 92), Image.Resampling.LANCZOS).save(dst, 'PNG')
print(f'Saved {dst} (92x92)')

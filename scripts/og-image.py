"""
Картинки бренда: превью ссылки в мессенджерах и соцсетях (public/og.jpg, 1200×630)
и иконки сайта (public/favicon.svg, favicon-48.png, apple-touch-icon.png, icon-192.png, icon-512.png).

Запуск (нужен Python 3 и Pillow: pip install pillow):
    python scripts/og-image.py

Стиль как на сайте: белый и сине-серый. Фото первого экрана без тонировки, слева — затемнение под текстом.
Знак — с фирменного логотипа (линия потолка, светильник, золотой край). Текст и телефон — в константах ниже.
"""
from PIL import Image, ImageDraw, ImageFont

PHOTO = 'src/assets/hero/ceiling.jpg'
TITLE = ['Натяжные потолки,', 'на которые', 'хочется смотреть']
SUBTITLE = 'Хасавюрт и весь Дагестан — замер бесплатно'
PHONE = '+7 928 598-34-32'
BRAND = 'SANTLADA'

NIGHT = (26, 38, 51)  # --color-night
GOLD = (200, 149, 95)  # золотой край в логотипе
WHITE = (255, 255, 255)

W, H = 1200, 630
FONTS = 'node_modules/@fontsource-variable/'


def font(family: str, subset: str, size: int, weight: int) -> ImageFont.FreeTypeFont:
    f = ImageFont.truetype(f'{FONTS}{family}/files/{family}-{subset}-wght-normal.woff2', size)
    f.set_variation_by_axes([weight])
    return f


def text(d: ImageDraw.ImageDraw, xy, s: str, family: str, size: int, weight: int, fill) -> None:
    """Кириллический и латинский наборы шрифта — разные файлы: латиницу, цифры и знаки рисуем латинским."""
    cyr, lat = font(family, 'cyrillic', size, weight), font(family, 'latin', size, weight)
    x, y = xy
    for ch in s:
        f = cyr if 0x400 <= ord(ch) <= 0x4FF else lat
        d.text((x, y), ch, font=f, fill=fill)
        x += f.getlength(ch)


def logo(size: int, bg=NIGHT, fg=WHITE) -> Image.Image:
    """Знак как в Logo.astro (координаты в поле 64×34); bg=None — без подложки."""
    k = 8  # рисуем крупнее и уменьшаем — так края гладкие
    s = size * k
    im = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if bg is not None:
        d.rounded_rectangle([0, 0, s - 1, s - 1], radius=round(s * 9 / 32), fill=bg)
    f = s * 0.8 / 64
    x0, y0 = s * 0.08, (s - 34 * f) / 2

    def pt(x, y):
        return (x0 + x * f, y0 + y * f)

    beam = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    ImageDraw.Draw(beam).polygon([pt(22.7, 18.6), pt(25.3, 18.6), pt(30, 31), pt(18, 31)], fill=(*fg, 70))
    im = Image.alpha_composite(im, beam)
    d = ImageDraw.Draw(im)
    d.polygon([pt(3, 19), pt(41, 2.2), pt(41, 4.6), pt(3.9, 19.5)], fill=fg)
    d.line([pt(3.4, 19.3), pt(21, 25)], fill=fg, width=max(1, round(0.9 * f)))
    d.line([pt(41, 3.3), pt(56, 9.6), pt(56, 31), pt(60.6, 28.8)], fill=GOLD, width=round(2.1 * f), joint='curve')
    cx, cy = pt(24, 18)
    d.ellipse([cx - 2 * f, cy - 0.9 * f, cx + 2 * f, cy + 0.9 * f], fill=fg)
    return im.resize((size, size), Image.LANCZOS)


# ── Превью ссылки ──
img = Image.new('RGB', (W, H), WHITE)

# Панель с фото и белым зазором по краям, как на сайте
gut, radius = 16, 40
pw, ph = W - gut * 2, H - gut * 2
photo = Image.open(PHOTO).convert('RGB')
scale = max(pw / photo.width, ph / photo.height)
photo = photo.resize((int(photo.width * scale), int(photo.height * scale)), Image.LANCZOS)
left, top = (photo.width - pw) // 2 + int(pw * 0.12), (photo.height - ph) // 2
left = min(left, photo.width - pw)
panel = photo.crop((left, top, left + pw, top + ph))

# Затемнение слева под текстом
shade = Image.new('RGBA', (pw, ph), (0, 0, 0, 0))
sd = ImageDraw.Draw(shade)
for x in range(pw):
    t = max(0.0, 1 - x / (pw * 0.72))
    sd.line([(x, 0), (x, ph)], fill=(*NIGHT, int(215 * t**1.1)))
panel = Image.alpha_composite(panel.convert('RGBA'), shade)

mask = Image.new('L', (pw, ph), 0)
ImageDraw.Draw(mask).rounded_rectangle([0, 0, pw - 1, ph - 1], radius=radius, fill=255)
img.paste(panel.convert('RGB'), (gut, gut), mask)

d = ImageDraw.Draw(img)
mark = logo(64, bg=None)
img.paste(mark, (66, 54), mark)
text(d, (136, 72), BRAND, 'unbounded', 30, 500, WHITE)

y = 190
for line in TITLE:
    text(d, (72, y), line, 'unbounded', 64, 300, WHITE)
    y += 76
text(d, (72, y + 34), SUBTITLE, 'onest', 28, 450, (226, 232, 238))
text(d, (72, y + 78), PHONE, 'onest', 32, 650, WHITE)

img.save('public/og.jpg', quality=88)

# ── Иконки сайта ──
with open('public/favicon.svg', 'w', encoding='utf-8', newline='\n') as f:
    f.write(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">\n'
        '  <rect width="32" height="32" rx="9" fill="#1a2633"/>\n'
        '  <g transform="translate(2.6 9.2) scale(0.42)">\n'
        '    <path d="M22.7 18.6h2.6L30 31H18Z" fill="#fff" fill-opacity="0.28"/>\n'
        '    <path d="M3 19 41 2.2v2.4L3.9 19.5Z" fill="#fff"/>\n'
        '    <path d="M3.4 19.3 21 25" stroke="#fff" stroke-width="1.2" stroke-linecap="round"/>\n'
        '    <path d="M41 3.3 56 9.6V31l4.6-2.2" fill="none" stroke="#c8955f" stroke-width="2.6"/>\n'
        '    <ellipse cx="24" cy="18" rx="2" ry="0.9" fill="#fff"/>\n'
        '  </g>\n'
        '</svg>\n'
    )
logo(48).save('public/favicon-48.png')
for size, name in ((192, 'icon-192.png'), (512, 'icon-512.png')):
    logo(size).save(f'public/{name}')
# У iPhone свои скругления — квадрат без прозрачных углов
touch = Image.new('RGB', (180, 180), NIGHT)
mark = logo(180)
touch.paste(mark, (0, 0), mark)
touch.save('public/apple-touch-icon.png')

print('OK: public/og.jpg и иконки')

# Иконка и заставка APK из иконки приложения (public/icon-*.png) вместо стандартных картинок Capacitor.
# Запуск из корня репозитория после `npx cap add android`: python3 native/android/icons.py
# Нужен Pillow (pip install pillow).
import pathlib
from PIL import Image, ImageDraw

RES = pathlib.Path('android/app/src/main/res')
FULL = Image.open('public/icon-maskable-512.png').convert('RGBA')  # картинка на весь квадрат, важное — в центре
SQUARE = Image.open('public/icon-512.png').convert('RGBA')  # скруглённый квадрат для старых Android
BG = '#060d1f'  # тот же тёмный фон, что у окна приложения (asosh_bg в install.sh)

DENSITY = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}


def fit(img, size):
    return img.resize((size, size), Image.LANCZOS)


def circle(img, size):
    out = fit(img, size)
    mask = Image.new('L', (size * 4, size * 4), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size * 4 - 1, size * 4 - 1), fill=255)
    out.putalpha(mask.resize((size, size), Image.LANCZOS))
    return out


for name, k in DENSITY.items():
    d = RES / f'mipmap-{name}'
    d.mkdir(parents=True, exist_ok=True)
    fit(SQUARE, round(48 * k)).save(d / 'ic_launcher.png')  # Android 7 и старше
    circle(FULL, round(48 * k)).save(d / 'ic_launcher_round.png')
    # Android 8+: слой 108 dp, телефон сам обрезает его кругом, «каплей» или квадратом
    fit(FULL, round(108 * k)).save(d / 'ic_launcher_foreground.png')

(RES / 'values').mkdir(parents=True, exist_ok=True)
(RES / 'values/ic_launcher_background.xml').write_text(
    f'<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">{BG}</color>\n</resources>\n',
    encoding='utf-8',
)
adaptive = (
    '<?xml version="1.0" encoding="utf-8"?>\n'
    '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n'
    '    <background android:drawable="@color/ic_launcher_background"/>\n'
    '    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>\n'
    '</adaptive-icon>\n'
)
(RES / 'mipmap-anydpi-v26').mkdir(parents=True, exist_ok=True)
for n in ('ic_launcher.xml', 'ic_launcher_round.xml'):
    (RES / 'mipmap-anydpi-v26' / n).write_text(adaptive, encoding='utf-8')

# Заставка при запуске: тёмный фон и иконка посередине (была белая с крестиком Capacitor)
splashes = sorted(RES.glob('drawable*/splash.png'))
for p in splashes:
    w, h = Image.open(p).size
    s = Image.new('RGBA', (w, h), BG)
    size = round(min(w, h) * 0.42)
    s.alpha_composite(fit(FULL, size), ((w - size) // 2, (h - size) // 2))
    s.convert('RGB').save(p)

# Android 12+ рисует заставку сам: фон делаем тёмным, иконка берётся из ic_launcher
styles = RES / 'values/styles.xml'
st = styles.read_text(encoding='utf-8')
if 'windowSplashScreenBackground' not in st:
    st = st.replace(
        '<item name="android:background">@drawable/splash</item>',
        '<item name="android:background">@drawable/splash</item>\n'
        f'        <item name="windowSplashScreenBackground">{BG}</item>',
        1,
    )
    styles.write_text(st, encoding='utf-8')

print(f'иконки: {len(DENSITY)} размеров, заставок: {len(splashes)}, splash-фон: {"windowSplashScreenBackground" in st}')

"""Transforma as texturas do Higgsfield (GPT Image 2.5) em mapas para o three.js.
- deixa cada imagem tileável (mistura com a cópia deslocada em meio tile)
- cor: pintura/latão (sRGB)
- normal e rugosidade derivados por passa-alta da luminância
- desgaste grande (pé e ombro) vira um mapa de oclusão separado (pintura-ao.jpg)
"""
import numpy as np
from PIL import Image, ImageFilter
import sys

SRC, OUT = sys.argv[1], sys.argv[2]


def seamless(a):
    h, w = a.shape[:2]
    b = np.roll(np.roll(a, h // 2, 0), w // 2, 1)
    y = np.minimum(np.arange(h), h - 1 - np.arange(h)) / (h / 2)
    x = np.minimum(np.arange(w), w - 1 - np.arange(w)) / (w / 2)
    m = np.minimum(y[:, None], x[None, :])
    m = np.clip(m / 0.35, 0, 1) ** 1.5  # borda: 100% da cópia deslocada; centro: original
    return a * m[..., None] + b * (1 - m[..., None]) if a.ndim == 3 else a * m + b * (1 - m)


def blur_wrap(a, r):
    """Desfoque gaussiano periódico (FFT): a borda do tile continua do outro lado."""
    h, w = a.shape
    fy = np.fft.fftfreq(h)[:, None]; fx = np.fft.fftfreq(w)[None, :]
    g = np.exp(-(fx ** 2 + fy ** 2) * (2 * np.pi * r) ** 2 / 2)
    return np.real(np.fft.ifft2(np.fft.fft2(a) * g))


def normal(hm, s):
    gx = (np.roll(hm, -1, 1) - np.roll(hm, 1, 1)) / 2
    gy = (np.roll(hm, -1, 0) - np.roll(hm, 1, 0)) / 2
    n = np.stack([-gx * s, gy * s, np.ones_like(hm)], -1)
    n /= np.linalg.norm(n, axis=-1, keepdims=True)
    return Image.fromarray(((n * .5 + .5) * 255).clip(0, 255).astype(np.uint8))


def lum(a):
    return a[..., 0] * .2126 + a[..., 1] * .7152 + a[..., 2] * .0722


def run(name, size, target_rgb, rough_base, rough_gain, nstr, normal_size):
    a = np.asarray(Image.open(f'{SRC}/{name}-hf.png').convert('RGB').resize((size, size), Image.LANCZOS), np.float32)
    a = seamless(a)
    # equilibra a média com a cor da norma, mantendo a variação da foto
    # ganho único na luminância: mantém o tom da foto e as lascas continuam cinza
    a = a * (lum(np.array(target_rgb, np.float32)[None, None]) / lum(a).mean())[..., None].squeeze()
    # tira a variação de baixa frequência do tile (era ela que marcava faixas na repetição); o desgaste grande vem do aoMap
    for ch in range(3):
        a[..., ch] = a[..., ch] - blur_wrap(a[..., ch], 48) + a[..., ch].mean()
    Image.fromarray(a.clip(0, 255).astype(np.uint8)).resize((normal_size, normal_size), Image.LANCZOS).save(f'{OUT}/{name}-cor.webp', quality=86, method=6)
    L = lum(a) / 255.0
    hp = L - blur_wrap(L, 6)            # detalhe fino (casca de laranja, riscos, marcas de torno)
    hp_s = hp / (hp.std() + 1e-6)
    # riscos e lascas são mais claros que o entorno → mais ásperos e levemente fundos
    scratch = np.clip(hp_s - 1.2, 0, None)
    rough = rough_base + rough_gain * np.clip(scratch / 3, 0, 1) + 0.02 * hp_s
    R = Image.fromarray((np.dstack([np.zeros_like(rough), rough, np.zeros_like(rough)]) * 255).clip(0, 255).astype(np.uint8))
    R.resize((normal_size // 2, normal_size // 2), Image.LANCZOS).save(f'{OUT}/{name}-rug.jpg', quality=85)
    hm = -hp_s * 0.6
    f = hm.shape[0] // normal_size
    small = hm.reshape(normal_size, f, normal_size, f).mean((1, 3)) * (1.0 if f == 1 else 1.4)
    normal(small, nstr).save(f'{OUT}/{name}-normal.webp', quality=82, method=6)


run('pintura', 2048, (0x15, 0x6C, 0x3F), 0.30, 0.38, 0.55, 1024)
run('latao', 1024, (0xC9, 0xA1, 0x4E), 0.24, 0.30, 0.45, 512)

# oclusão/sujeira em grande escala (o antigo pintura-cor procedural, só a luminância relativa)
old = np.asarray(Image.open(f'{OUT}/pintura-cor.proc.jpg').convert('L'), np.float32)
ao = old / np.percentile(old, 70)
Image.fromarray((ao.clip(0, 1) * 255).astype(np.uint8)).resize((512, 928), Image.LANCZOS).save(f'{OUT}/pintura-ao.jpg', quality=85)
print('ok')

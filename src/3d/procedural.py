"""Texturas procedurais do cilindro 3D (placeholder até as texturas da OpenAI).
Gera em site/img/3d/:
  pintura-cor.jpg     1024x1856  cor da pintura (u = volta do cilindro, v = perfil), com desgaste
  pintura-normal.png  512x512    tileável: casca de laranja + riscos finos
  pintura-rug.jpg     512x512    tileável: rugosidade (canal G)
  latao-rug.jpg       512x512    tileável: marcas de torno + manchas
  latao-normal.png    512x512    tileável
"""
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
import os, sys

OUT = sys.argv[1] if len(sys.argv) > 1 else "out"
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(1982)


def periodic_noise(h, w, sigma, seed=None):
    """Ruído gaussiano periódico (tileável) por filtro no domínio da frequência."""
    r = np.random.default_rng(seed) if seed is not None else rng
    n = r.standard_normal((h, w))
    fy = np.fft.fftfreq(h)[:, None]
    fx = np.fft.fftfreq(w)[None, :]
    f2 = fx ** 2 + fy ** 2
    filt = np.exp(-f2 * (2 * np.pi * sigma) ** 2 / 2)
    out = np.real(np.fft.ifft2(np.fft.fft2(n) * filt))
    out -= out.mean()
    out /= out.std() + 1e-9
    return out


def normal_from_height(hm, strength):
    gy, gx = np.gradient(hm)
    # bordas periódicas
    gx = (np.roll(hm, -1, 1) - np.roll(hm, 1, 1)) / 2
    gy = (np.roll(hm, -1, 0) - np.roll(hm, 1, 0)) / 2
    nx, ny, nz = -gx * strength, gy * strength, np.ones_like(hm)
    l = np.sqrt(nx ** 2 + ny ** 2 + nz ** 2)
    n = np.stack([nx / l, ny / l, nz / l], -1)
    return Image.fromarray(((n * 0.5 + 0.5) * 255).clip(0, 255).astype(np.uint8))


def wrap_lines(size, lines, width_px, blur):
    """Desenha linhas com cópias deslocadas para o tile fechar sem emenda."""
    W, H = size
    img = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(img)
    for (x0, y0, x1, y1, v) in lines:
        for ox in (-W, 0, W):
            for oy in (-H, 0, H):
                d.line((x0 + ox, y0 + oy, x1 + ox, y1 + oy), fill=int(v), width=width_px)
    if blur:
        img = img.filter(ImageFilter.GaussianBlur(blur))
    return np.asarray(img, dtype=np.float32) / 255.0


# ---------------- pintura: detalhes tileáveis ----------------
T = 512
peel = periodic_noise(T, T, 2.2, 1) * 0.6 + periodic_noise(T, T, 5, 2) * 0.4
lines = []
for _ in range(70):  # riscos finos, quase horizontais (manuseio, carrinho)
    x0, y0 = rng.uniform(0, T), rng.uniform(0, T)
    L = rng.uniform(20, 140)
    a = rng.normal(0, 0.10)
    lines.append((x0, y0, x0 + L * np.cos(a), y0 + L * np.sin(a), rng.uniform(90, 255)))
scr = wrap_lines((T, T), lines, 1, 0.6)
height = peel * 0.35 - scr * 1.4
normal_from_height(height, 1.1).save(f"{OUT}/pintura-normal.png", optimize=True)

rough = 0.30 + peel * 0.025 + scr * 0.32 + periodic_noise(T, T, 40, 3) * 0.03
Image.fromarray(np.dstack([np.zeros_like(rough), rough, np.zeros_like(rough)]).__mul__(255).clip(0, 255).astype(np.uint8)) \
    .save(f"{OUT}/pintura-rug.jpg", quality=88)

# ---------------- pintura: cor com desgaste (mapa único, sem repetição) ----------------
W, H = 1024, 1856
base = np.array([0x14, 0x6B, 0x3E], np.float32)  # verde oxigênio medicinal (NBR 12176), um tom abaixo do --verde-cil para o verniz
mott = periodic_noise(H, W, 60, 4) * 0.035 + periodic_noise(H, W, 14, 5) * 0.012
col = base[None, None, :] * (1 + mott[..., None])
v = np.linspace(1, 0, H)[:, None]  # linha 0 da imagem = topo do cilindro (flipY do three.js)

# sujeira e desgaste: mais no pé (onde arrasta) e no ombro (onde bate a mão)
foot = np.clip(1 - v / 0.09, 0, 1) ** 1.6
shoulder = np.exp(-((v - 0.80) / 0.05) ** 2)
grime = (periodic_noise(H, W, 9, 6) * 0.5 + 0.5)
col *= (1 - foot[..., None] * 0.28 * (0.6 + 0.4 * grime[..., None]))
col = col * (1 - 0.10 * shoulder[..., None] * np.clip(periodic_noise(H, W, 20, 7), 0, None)[..., None])

# lascas: pontos pequenos de aço cinza, concentrados no pé e no ombro
img = Image.fromarray(col.clip(0, 255).astype(np.uint8))
mask = Image.new("L", (W, H), 0)
dm = ImageDraw.Draw(mask)
for _ in range(260):
    zone = rng.random()
    if zone < 0.55:
        y = rng.uniform(0, 0.08)
    elif zone < 0.8:
        y = rng.uniform(0.74, 0.86)
    else:
        y = rng.uniform(0.1, 0.72)
    x = rng.uniform(0, W)
    r = rng.lognormal(0.2, 0.55)
    yy = (1 - y) * H
    pts = [(x + r * np.cos(t) * rng.uniform(.6, 1.4), yy + r * np.sin(t) * rng.uniform(.5, 1.2)) for t in np.linspace(0, 2 * np.pi, 7)[:-1]]
    for ox in (-W, 0, W):
        dm.polygon([(px + ox, py) for px, py in pts], fill=255)
mask = mask.filter(ImageFilter.GaussianBlur(0.5))
steel = Image.new("RGB", (W, H), (118, 124, 130))
img = Image.composite(steel, img, mask)
# halo escuro em volta da lasca (borda da tinta)
halo = mask.filter(ImageFilter.GaussianBlur(2.2))
arr = np.asarray(img, np.float32)
arr *= (1 - (np.asarray(halo, np.float32) / 255 - np.asarray(mask, np.float32) / 255).clip(0, 1)[..., None] * 0.45)
Image.fromarray(arr.clip(0, 255).astype(np.uint8)).save(f"{OUT}/pintura-cor.jpg", quality=86, optimize=True, progressive=True)

# ---------------- latão ----------------
turn = np.repeat(periodic_noise(T, 1, 0.8, 8), T, axis=1) * 0.7 + np.repeat(periodic_noise(T, 1, 3, 9), T, axis=1) * 0.3
smudge = periodic_noise(T, T, 26, 10)
normal_from_height(turn * 0.6 + periodic_noise(T, T, 1.5, 11) * 0.08, 0.9).save(f"{OUT}/latao-normal.png", optimize=True)
lr = 0.26 + turn * 0.03 + np.clip(smudge, 0, None) * 0.10
Image.fromarray(np.dstack([np.zeros_like(lr), lr, np.zeros_like(lr)]).__mul__(255).clip(0, 255).astype(np.uint8)) \
    .save(f"{OUT}/latao-rug.jpg", quality=88)
print("ok", OUT)

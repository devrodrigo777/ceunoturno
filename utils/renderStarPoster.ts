import type { Astro } from "../types";
import { mulberry32, xfnv1a,  svgToPng, generateCelestialSvg } from "./posterRng";

type Options = {
  sizePx?: number;          // ex: 3000
  usePhotoBg?: boolean;
  bgDim?: number;           // 0..1 (ex: 0.75)
  title?: string;           // ex: "ONDE TUDO COMEÇOU"
  subtitle?: string;        // ex: "Nosso primeiro beijo"
  footer?: string;          // ex: "São Paulo • 01/01/2024"
  worldW?: number;          // default 3000
  worldH?: number;          // default 2000
  markAstro?: boolean;      // default true
};

// #region HELPERS

function normalizeSpaces(text: string) {
  return (text ?? "").replace(/\s+/g, " ").trim();
}

function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
) {
  // Suporta quebras manuais (\n) também
  const paragraphs = text.split(/\r?\n/).map(t => t.trim()).filter(Boolean);
  const lines: string[] = [];

  for (const p of paragraphs) {
    const words = p.split(" ").filter(Boolean);
    let line = "";

    for (const word of words) {
      const test = line ? `${line} ${word}` : word;

      if (ctx.measureText(test).width <= maxWidth) {
        line = test;
        continue;
      }

      // Se a linha atual já tem conteúdo, fecha ela
      if (line) lines.push(line);

      // Se a palavra sozinha é maior que maxWidth, quebra a palavra
      if (ctx.measureText(word).width > maxWidth) {
        let chunk = "";
        for (const ch of word) {
          const testChunk = chunk + ch;
          if (ctx.measureText(testChunk).width <= maxWidth) {
            chunk = testChunk;
          } else {
            if (chunk) lines.push(chunk);
            chunk = ch;
          }
        }
        line = chunk; // resto vai virar linha atual
      } else {
        line = word;
      }
    }

    if (line) lines.push(line);
  }

  return lines;
}

function setFont(ctx: CanvasRenderingContext2D, weight: number, px: number) {
  // Mantém sua “pegada” de Inter e deixa o canvas calcular
  ctx.font = `${weight} ${Math.floor(px)}px "Montserrat", system-ui, sans-serif`;
}

function computeTextBlock(
  ctx: CanvasRenderingContext2D,
  text: string,
  boxWidth: number,
  boxHeight: number,
  opt: {
    weight?: number;
    maxFontPx: number;
    minFontPx: number;
    lineHeightMult?: number; // ex 1.15
  }
) {
  const weight = opt.weight ?? 800;
  const lineHeightMult = opt.lineHeightMult ?? 1.15;

  // Heurística: mensagens curtinhas começam maiores
  const t = normalizeSpaces(text);
  const shortBoost =
    t.length <= 30 ? 1.25 : t.length <= 60 ? 1.1 : 1.0;

  let fontPx = Math.floor(opt.maxFontPx * shortBoost);
  fontPx = Math.min(fontPx, opt.maxFontPx * 1.35);

  while (fontPx >= opt.minFontPx) {
    setFont(ctx, weight, fontPx);

    const lines = wrapTextLines(ctx, t, boxWidth);
    const lineHeight = fontPx * lineHeightMult;
    const totalH = lines.length * lineHeight;

    // Critério de caber: altura e largura (largura já é garantida pelo wrap)
    if (totalH <= boxHeight) {
      return { fontPx, lines, lineHeight, totalH };
    }

    fontPx -= 2; // passo (pode ser 1 se quiser mais preciso)
  }

  // Se ainda não coube, retorna no mínimo (vai caber “o máximo possível”)
  setFont(ctx, weight, opt.minFontPx);
  const lines = wrapTextLines(ctx, t, boxWidth);
  const lineHeight = opt.minFontPx * lineHeightMult;
  const totalH = lines.length * lineHeight;
  return { fontPx: opt.minFontPx, lines, lineHeight, totalH };
}

function drawCenteredMultilineText(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  xCenter: number,
  boxTop: number,
  boxHeight: number,
  lineHeight: number
) {
  // Centraliza o BLOCO verticalmente dentro da caixa
  const totalH = lines.length * lineHeight;
  let y = boxTop + (boxHeight - totalH) / 2 + lineHeight * 0.80; 
  // 0.80 é um ajuste de baseline (visual); se quiser, troque pra 0.75

  for (const line of lines) {
    ctx.fillText(line, xCenter, y);
    y += lineHeight;
  }
}
function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function mapWorldToPosterCircle(params: {
  x: number;
  y: number;
  worldW: number;
  worldH: number;
  cx: number;
  cy: number;
  R: number;
  fill?: number; // default 1.9
}) {
  const { x, y, worldW, worldH, cx, cy, R } = params;
  const fill = params.fill ?? 1.9;

  let nx = x / worldW; // 0..1
  let ny = y / worldH; // 0..1

  let dx = nx - 0.5; // -0.5..+0.5
  let dy = ny - 0.5;

  // Compensa aspect ratio (mundo 3000x2000 é mais largo)
  dy *= worldH / worldW; // 2000/3000

  // Amplifica pra ocupar mais o disco
  dx *= fill;
  dy *= fill;

  // Clamp no círculo unitário (garante que nunca sai do disco)
  const len = Math.hypot(dx, dy);
  if (len > 1) {
    dx /= len;
    dy /= len;
  }

  return { px: cx + dx * R, py: cy + dy * R };
}

function drawAstroMark(
  ctx: CanvasRenderingContext2D,
  astro: Astro,
  px: number,
  py: number,
  scale: number
) {
  const color = astro.color ?? "#FFFFFF";
  const base = Math.max(6, (astro.size ?? 12) * scale);

  // Glow (camada grande)
  ctx.save();
  ctx.globalAlpha = 0.14;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(px, py, base * 2.0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Glow soft extra (mais “nebula-like”)
  ctx.save();
  ctx.globalAlpha = astro.type === "nebula" ? 0.14 : 0.10;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(px, py, base * (astro.type === "nebula" ? 3.2 : 2.8), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Core
  ctx.save();
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(px, py, base * 0.70, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Highlight (pontinho branco)
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = "#FFFFFF";
  ctx.beginPath();
  ctx.arc(px - base * 0.18, py - base * 0.18, base * 0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Ring (planet)
  if (astro.type === "planet") {
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(-0.45);

    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = Math.max(1, base * 0.10);
    ctx.beginPath();
    ctx.ellipse(0, 0, base * 1.35, base * 0.45, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }
}

// #endregion

export async function renderStarPoster(
  astro: Astro,
  opts: Options = {}
): Promise<HTMLCanvasElement> {
  const size = opts.sizePx ?? 3000;
  const worldW = opts.worldW ?? 3000;
  const worldH = opts.worldH ?? 2000;

  if (document?.fonts?.ready) {
    await document.fonts.ready;
  }

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No 2D context");

  const seed = xfnv1a(`${astro.id}|${astro.created_at ?? ""}`);
  const rand = mulberry32(seed);

  // Fundo base
  ctx.fillStyle = "#07091f";
  ctx.fillRect(0, 0, size, size);

  // Foto de fundo (opcional)
  if (opts.usePhotoBg && astro.image_url) {
    try {
      const img = await loadImage(astro.image_url);
      const r = Math.max(size / img.width, size / img.height);
      const w = img.width * r;
      const h = img.height * r;
      const x = (size - w) / 2;
      const y = (size - h) / 2;
      ctx.drawImage(img, x, y, w, h);

      ctx.fillStyle = `rgba(0,0,0,${opts.bgDim ?? 0.75})`;
      ctx.fillRect(0, 0, size, size);
    } catch {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, size, size);
    }
  }

  // Área do mapa (círculo)
  const cx = size / 2;
  const cy = size * 0.40;
  const R = size * 0.28;

  // Borda do círculo
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = Math.max(2, size * 0.001);
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.stroke();

  // Clip no círculo
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.clip();

  // ========== MAPA REAL COM D3-CELESTIAL ==========
  try {
    // Pegue lat/lng e datetime do seu astro
    const lat = astro.starmap_lat ?? -15.8267; // Camaçari default
    const lng = astro.starmap_lng ?? -38.9633;
    const eventDate = astro.starmapDatetime
      ? new Date(astro.starmapDatetime)
      : new Date();

    const mapSizePx = Math.floor(R * 2); // diâmetro do círculo
    // const svgMap = await generateRealStarmap({
    //   lat,
    //   lng,
    //   datetime: eventDate,
    //   sizePx: mapSizePx,
    // });

    // Rasteriza SVG em canvas
    //const mapCanvas = await svgToPng(svgMap, mapSizePx, mapSizePx);
    // const svgText = await generateCelestialSvg({
    //   lat,
    //   lng,
    //   datetime: eventDate,
    //   sizePx: mapSizePx,
    // });
    
    const mapCanvas = await generateCelestialSvg({ lat, lng, datetime: eventDate, sizePx: mapSizePx });

    ctx.drawImage(
      mapCanvas,
      cx - mapSizePx / 2,
      cy - mapSizePx / 2,
      mapSizePx,
      mapSizePx
    );

    // Desenha no mapa do pôster (centralizado no círculo)
    const mapX = cx - mapSizePx / 2;
    const mapY = cy - mapSizePx / 2;
    //ctx.drawImage(mapCanvas, mapX, mapY, mapSizePx, mapSizePx);
    // ctx.drawImage(mapCanvas, cx - mapSizePx / 2, cy - mapSizePx / 2);
    // ctx.drawImage(mapCanvas, cx - mapSizePx/2, cy - mapSizePx/2, mapSizePx, mapSizePx);
  } catch (err) {
    console.warn("Erro ao gerar mapa real, usando fallback", err);
    // Fallback: grid + estrelas fake (seu código anterior)
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    for (let i = 1; i <= 5; i++) {
      ctx.beginPath();
      ctx.arc(cx, cy, (R * i) / 6, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
      ctx.stroke();
    }
    // Estrelas fake
    const stars: { x: number; y: number; b: number }[] = [];
    const n = 1500;
    for (let i = 0; i < n; i++) {
      const ang = rand() * Math.PI * 2;
      const u = rand();
      const rr = Math.sqrt(u) * R;
      const x = cx + Math.cos(ang) * rr;
      const y = cy + Math.sin(ang) * rr;
      const b = Math.pow(rand(), 3);
      stars.push({ x, y, b });
    }
    for (const s of stars) {
      const radius = 0.6 + s.b * 2.2;
      ctx.fillStyle = `rgba(255,255,255,${0.12 + s.b * 0.88})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Marca do astro (mesma lógica anterior)
  const shouldMark = opts.markAstro ?? true;
  if (shouldMark && typeof astro.x === "number" && typeof astro.y === "number") {
    const { px, py } = mapWorldToPosterCircle({
      x: astro.x,
      y: astro.y,
      worldW,
      worldH,
      cx,
      cy,
      R,
      fill: 1.9,
    });

    const jx = (rand() - 0.5) * R * 0.02;
    const jy = (rand() - 0.5) * R * 0.02;

    let dynamicScaleIncrement = 0.11;
    if (astro.type === "planet") dynamicScaleIncrement = 0.15;
    else if (astro.type === "nebula") dynamicScaleIncrement = 0.17;

    const astroScale = (R / 700) * dynamicScaleIncrement;
    drawAstroMark(ctx, astro, px + jx, py + jy, astroScale);

    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(px + jx, py + jy, Math.max(10, R * 0.03), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore(); // sai do clip

  // Textos (parte inferior)
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = `${Math.floor(size * 0.018)}px Inter, system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(astro.user_name ?? "Nosso primeiro beijo", cx, size * 0.74);

  const message = astro.message ?? "ONDE TUDO COMEÇOU";
  const boxWidth = size * 0.57;
  const boxHeight = size * 0.12;
  const boxTop = size * 0.76;

  ctx.save();
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  const block = computeTextBlock(ctx, message, boxWidth, boxHeight, {
    weight: 800,
    maxFontPx: Math.floor(size * 0.040),
    minFontPx: Math.floor(size * 0.016),
    lineHeightMult: 1.12,
  });

  setFont(ctx, 800, block.fontPx);
  drawCenteredMultilineText(ctx, block.lines, cx, boxTop, boxHeight, block.lineHeight);
  ctx.restore();

  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = `${Math.floor(size * 0.018)}px Inter, system-ui, sans-serif`;
  ctx.fillText(opts.footer ?? astro.coordinate ?? "", cx, size * 0.92);

  return canvas;
}

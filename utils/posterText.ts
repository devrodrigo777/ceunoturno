// #region HELPERS

import { Astro } from "@/types";

export function normalizeSpaces(text: string) {
  return (text ?? "").replace(/\s+/g, " ").trim();
}

export function wrapTextLines(
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

export function setFont(ctx: CanvasRenderingContext2D, weight: number, px: number) {
  // Mantém sua “pegada” de Inter e deixa o canvas calcular
  ctx.font = `${weight} ${Math.floor(px)}px "Montserrat", system-ui, sans-serif`;
}

export function computeTextBlock(
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

export function drawCenteredMultilineText(
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
export function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function mapWorldToPosterCircle(params: {
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

export function drawAstroMark(
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

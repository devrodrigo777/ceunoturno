// utils/renderCompassPoster.ts
import type { Astro } from "../types";
import { renderStarPoster } from "./renderStarPoster"; // seu arquivo existente [file:1]
import { mapWorldToPosterCircle, drawAstroMark, computeTextBlock, drawCenteredMultilineText, setFont } from "./posterText";
import { formatDate } from "./formatDate";

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

type Slot = {
  // “buraco” do mapa (em pixels do A4 template)
  x: number;
  y: number;
  w: number;
  h: number;
  // se for circular:
  shape?: "circle" | "rect"; // default circle
};

type Options = {
  templateSrc?: string;          // "./compass.png"
  slot: Slot;

  // foto opcional (50% em cima do preto)
  usePhotoBg?: boolean;
  photoOpacity?: number;         // default 0.5

  // tamanho do starPoster (quanto maior, mais nítido; 1500~2500 ok)
  starPosterSizePx?: number;

  // se seu template tem molduras por cima do mapa, desenhar por cima no final
  redrawTemplateOnTop?: boolean;
};

export async function renderCompassPoster(
  astro: Astro,
  opts: Options
): Promise<HTMLCanvasElement> {
  const templateSrc = opts.templateSrc ?? "./compass.png";
  const template = await loadImage(templateSrc);

  const W = template.naturalWidth || template.width;
  const H = template.naturalHeight || template.height;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No 2D context");

  // 1) base transparente + template
  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(template, 0, 0, W, H);

  // 2) prepara slot
  const shape = opts.slot.shape ?? "circle"; //opts.slot.shape ?? "circle";
  const cx = opts.slot.x + opts.slot.w / 2;
  const cy = opts.slot.y + opts.slot.h / 2;
  const R = Math.min(opts.slot.w, opts.slot.h) / 2;

  // 3) fundo preto total
  ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
    ctx.drawImage(template, 0, 0, W, H);
  // 3) fundo preto recortado no slot
//   ctx.save();
//   if (shape === "circle") {
//     ctx.beginPath();
//     ctx.arc(cx, cy, R, 0, Math.PI * 2);
//     ctx.clip();
//   } else {
//     ctx.beginPath();
//     ctx.rect(opts.slot.x, opts.slot.y, opts.slot.w, opts.slot.h);
//     ctx.clip();
//   }
//   ctx.fillStyle = "#000";
//   ctx.fillRect(opts.slot.x, opts.slot.y, opts.slot.w, opts.slot.h);
//   ctx.restore();

  // 4) foto opcional por cima do preto (opacidade 50%) — usa o mesmo campo do renderStarPoster
  // No seu renderStarPoster é astro.imageurl [file:1]
  const hasPhoto = !!astro?.image_path || !!astro?.image_url;
  const usePhoto = !!opts.usePhotoBg && hasPhoto;

  if (usePhoto) {
    try {
        const img = await loadImage((astro as any).image_path);

        // alvo: preencher o canvas inteiro (A4)
        const targetW = 2480;
        const targetH = 3507;

        // COVER proporcional (mantém aspecto e corta sobras)
        const scale = Math.max(targetW / img.width, targetH / img.height);
        const dw = img.width * scale;
        const dh = img.height * scale;

        // centraliza (pra cortar igualmente nas bordas)
        const dx = (targetW - dw) / 2;
        const dy = (targetH - dh) / 2;

        ctx.save();
        ctx.globalAlpha = opts.photoOpacity ?? 0.5;
        ctx.drawImage(img, dx, dy, dw, dh);
        ctx.restore();
    } catch {
        // ignora erro de load
    }
    }

    

  // 5) gera o “mapa correto” chamando renderStarPoster() (ele já faz o mapa real/fallback) [file:1]
  const starPosterCanvas = await renderStarPoster(astro, {
    sizePx: opts.starPosterSizePx ?? 2000,
    usePhotoBg: false, // importante: aqui NÃO, pq a foto é controlada no compass
    markAstro: true,
  });

  // 6) recorta o círculo do centro do starPoster e desenha dentro do slot
  // No renderStarPoster o círculo do mapa fica em:
  // cx = size/2, cy = size*0.40, R = size*0.28 [file:1]
  const sp = starPosterCanvas.width; // quadrado
  const srcCx = sp / 2;
  const srcCy = sp * 0.4;
  const srcR = sp * 0.28;

  const sx = Math.floor(srcCx - srcR);
  const sy = Math.floor(srcCy - srcR);
  const swh = Math.floor(srcR * 2);

  ctx.save();
  if (shape === "circle") {
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.clip();
  } else {
    ctx.beginPath();
    ctx.rect(opts.slot.x, opts.slot.y, opts.slot.w, opts.slot.h);
    ctx.clip();
  }

  // desenha preenchendo o slot
  ctx.globalAlpha = 1;
  ctx.drawImage(
    starPosterCanvas,
    sx, sy, swh, swh,               // source (círculo do mapa do poster)
    opts.slot.x, opts.slot.y, opts.slot.w, opts.slot.h // dest
  );
  ctx.restore();

  

  // 7) se precisar, redesenha o template por cima (molduras/linhas)
  if (opts.redrawTemplateOnTop ?? true) {
    ctx.drawImage(template, 0, 0, W, H);
  }

  ctx.save();
    ctx.globalAlpha = 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";

    const centerX = W / 2;

    // Subtitle (linha pequena)
    const subtitle = (opts.subtitle ?? astro.starmap_title ?? "").trim();
    if (subtitle) {
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.font = `${Math.floor(W * 0.025)}px "Montserrat", Inter, system-ui, sans-serif`;
    ctx.fillText(subtitle, centerX, H * 0.74);
    }

    // Title (auto-fit e multiline)
    const title = (opts.title ?? astro.message ?? "").trim();
    if (title) {
    const boxWidth = W * 0.70;
    const boxHeight = H * 0.09;
    const boxTop = H * 0.77;

    ctx.fillStyle = "#fff";

    const block = computeTextBlock(ctx, title, boxWidth, boxHeight, {
        weight: 800,
        maxFontPx: Math.floor(W * 0.055),
        minFontPx: Math.floor(W * 0.022),
        lineHeightMult: 1.10,
    });

    setFont(ctx, 800, block.fontPx);
    drawCenteredMultilineText(ctx, block.lines, centerX, boxTop, boxHeight, block.lineHeight);
    }

    // Footer (linha pequena)
    const footer = formatDate(astro.starmap_datetime, astro.starmap_hide_time ?? true)
    if (footer) {
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.font = `${Math.floor(W * 0.025)}px "Montserrat", Inter, system-ui, sans-serif`;
    ctx.fillText(footer, centerX, H * 0.90);
    }

    ctx.restore();

  return canvas;
}


/*ctx.save();
ctx.globalAlpha = 1;
ctx.textAlign = "center";
ctx.textBaseline = "alphabetic";

const cx = canvas.width / 2;
const size = canvas.width; // se for quadrado; senão use width

// 1) Subtitle (pequeno)
const subtitle = (opts.subtitle ?? astro.user_name ?? "").trim();
if (subtitle) {
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = `${Math.floor(size * 0.018)}px Inter, system-ui, sans-serif`;
  ctx.fillText(subtitle, cx, size * 0.74);
}

// 2) Title (auto-fit / multiline)
const title = (opts.title ?? astro.message ?? "").trim();
if (title) {
  const boxWidth = size * 0.57;
  const boxHeight = size * 0.12;
  const boxTop = size * 0.76;

  ctx.fillStyle = "#fff";

  const block = computeTextBlock(ctx, title, boxWidth, boxHeight, {
    weight: 800,
    maxFontPx: Math.floor(size * 0.040),
    minFontPx: Math.floor(size * 0.016),
    lineHeightMult: 1.12,
  });

  setFont(ctx, 800, block.fontPx);
  drawCenteredMultilineText(ctx, block.lines, cx, boxTop, boxHeight, block.lineHeight);
}

// 3) Footer (pequeno)
const footer = (opts.footer ?? astro.coordinate ?? "").trim();
if (footer) {
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = `${Math.floor(size * 0.018)}px Inter, system-ui, sans-serif`;
  ctx.fillText(footer, cx, size * 0.92);
}

ctx.restore();*/
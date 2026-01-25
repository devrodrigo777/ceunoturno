import type { Astro } from "../types";
import { mulberry32, xfnv1a,  svgToPng, generateCelestialSvg } from "./posterRng";
import { mapWorldToPosterCircle, drawAstroMark, computeTextBlock, drawCenteredMultilineText, setFont } from "./posterText";

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


export async function renderStarPoster(
  astro: Astro,
  opts: Options = {}
): Promise<HTMLCanvasElement> {
  const size = opts.sizePx ?? 3000;
  const worldW = opts.worldW ?? 3000;
  const worldH = opts.worldH ?? 2000;

  if (document?.fonts?.ready) {
    await Promise.race([
      document.fonts.ready,
      new Promise((r) => setTimeout(r, 2000)),
    ]);
  }

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No 2D context");

  const seed = xfnv1a(`${astro.id}|${astro.created_at ?? ""}`);
  const rand = mulberry32(seed);

  // Fundo base
  // ctx.fillStyle = "#07091f";
  // ctx.fillRect(0, 0, size, size);

  // Foto de fundo (opcional)
  // if (opts.usePhotoBg && astro.image_url) {
  //   try {
  //     const img = await loadImage(astro.image_url);
  //     const r = Math.max(size / img.width, size / img.height);
  //     const w = img.width * r;
  //     const h = img.height * r;
  //     const x = (size - w) / 2;
  //     const y = (size - h) / 2;
  //     ctx.drawImage(img, x, y, w, h);

  //     ctx.fillStyle = `rgba(0,0,0,${opts.bgDim ?? 0.75})`;
  //     ctx.fillRect(0, 0, size, size);
  //   } catch {
  //     ctx.fillStyle = "#000";
  //     ctx.fillRect(0, 0, size, size);
  //   }
  // }

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
  ctx.globalAlpha = 1;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = `${Math.floor(size * 0.018)}px Inter, system-ui, sans-serif`;
  ctx.textAlign = "center";
  console.log("alpha", ctx.globalAlpha, "font", ctx.font, "clip?", (ctx as any).clip);

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

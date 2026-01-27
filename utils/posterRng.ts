export function xfnv1a(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function waitForCanvas(parent: HTMLElement, timeoutMs = 8000) {
  const start = Date.now();

  while (true) {
    const c = parent.querySelector("canvas") as HTMLCanvasElement | null;

    if (c && c.width > 0 && c.height > 0) {
      const ctx = c.getContext("2d", { willReadFrequently: true });
      if (ctx) {
        const d = ctx.getImageData((c.width / 2) | 0, (c.height / 2) | 0, 1, 1).data;
        if (d[3] !== 0) return c; // alpha != 0 => tem algo desenhado
      }
    }

    if (Date.now() - start > timeoutMs) throw new Error("Canvas não foi pintado a tempo");
    await new Promise(r => setTimeout(r, 120));
  }
}

export async function waitForSvg(parent: HTMLElement, timeoutMs = 8000) {
  const start = Date.now();
  while (true) {
    const svg = parent.querySelector("svg") as SVGSVGElement | null;
    if (svg) return svg;
    if (Date.now() - start > timeoutMs) throw new Error("SVG não apareceu a tempo");
    await new Promise(r => setTimeout(r, 50));
  }
}

function exportSvgAsync(Celestial: any): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      Celestial.exportSVG((svgText: string) => {
        if (!svgText) reject(new Error("exportSVG retornou vazio"));
        else resolve(svgText);
      });
    } catch (e) {
      reject(e);
    }
  });
}


export async function svgToPng(
  svgEl: SVGSVGElement,
  targetWidth: number,
  targetHeight: number
): Promise<HTMLCanvasElement> {
  const svgClone = svgEl.cloneNode(true) as SVGSVGElement;
svgClone.setAttribute("width", String(targetWidth));
svgClone.setAttribute("height", String(targetHeight));
// opcional: garantir xmlns
svgClone.setAttribute("xmlns", "http://www.w3.org/2000/svg");

const svgText = new XMLSerializer().serializeToString(svgClone);

  const svgBlob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  const img = new Image();
  img.crossOrigin = "anonymous";

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = url;
  });

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No 2D context");

  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
  URL.revokeObjectURL(url);

  return canvas;
}

export async function generateCelestialSvg(params: {
  lat: number;
  lng: number;
  datetime: Date;
  sizePx: number;
}): Promise<HTMLCanvasElement> {
  const { lat, lng, datetime, sizePx } = params;

  const mapId = `celestial-map-${crypto.randomUUID()}`;
const formId = `celestial-form-${crypto.randomUUID()}`;

const wrap = document.createElement("div");
wrap.style.position = "fixed";
wrap.style.left = "0";
wrap.style.top = "0";
wrap.style.width = `${sizePx}px`;
wrap.style.height = `${sizePx}px`;
wrap.style.opacity = "0";
wrap.style.pointerEvents = "none";
wrap.style.zIndex = "-1";


const mapDiv = document.createElement("div");
mapDiv.id = mapId;
mapDiv.style.width = `${sizePx}px`;
mapDiv.style.height = `${sizePx}px`;

const formDiv = document.createElement("div");
formDiv.id = formId;

wrap.appendChild(mapDiv);
wrap.appendChild(formDiv);
document.body.appendChild(wrap);

  const Celestial = (window as any).Celestial;
  if (!Celestial) throw new Error("Celestial não carregou");

  // var config = {
  //   container: mapId,
  // width: sizePx,
  // projection: "stereo",
  // datapath: "https://cdn.jsdelivr.net/npm/d3-celestial@0.7.35/data/",
  // form: false,
  // controls: false,
  // interactive: false,
  // dsos: { show: false },
  // constellations: { show: false }
  // };
  var config = {
  width: sizePx,     // Default width, 0 = full parent width; height is determined by projection
  projection: "stereographic",  // Map projection used: airy, aitoff, armadillo, august, azimuthalEqualArea, azimuthalEquidistant, baker, berghaus, boggs, bonne, bromley, collignon, craig, craster, cylindricalEqualArea, cylindricalStereographic, eckert1, eckert2, eckert3, eckert4, eckert5, eckert6, eisenlohr, equirectangular, fahey, foucaut, ginzburg4, ginzburg5, ginzburg6, ginzburg8, ginzburg9, gringorten, hammer, hatano, healpix, hill, homolosine, kavrayskiy7, lagrange, larrivee, laskowski, loximuthal, mercator, miller, mollweide, mtFlatPolarParabolic, mtFlatPolarQuartic, mtFlatPolarSinusoidal, naturalEarth, nellHammer, orthographic, patterson, polyconic, rectangularPolyconic, robinson, sinusoidal, stereographic, times, twoPointEquidistant, vanDerGrinten, vanDerGrinten2, vanDerGrinten3, vanDerGrinten4, wagner4, wagner6, wagner7, wiechel, winkel3
  projectionRatio: null, // Optional override for default projection ratio
  transform: "equatorial", // Coordinate transformation: equatorial (default), ecliptic, galactic, supergalactic
  center: null,       // Initial center coordinates in equatorial transformation [hours, degrees, degrees],
                      // otherwise [degrees, degrees, degrees], 3rd parameter is orientation, null = default center
  orientationfixed: true,  // Keep orientation angle the same as center[2]
  background: { fill: "none", opacity: 0, stroke: "none", width: 1.5 },
  adaptable: false,    // Sizes are increased with higher zoom-levels
  interactive: false,  // Enable zooming and rotation with mousewheel and dragging
  disableAnimations: true, // Disable all animations
  form: false,        // Display settings form
  // location: true,    // Display location settings
  // geopos: [lat, lng], // Initial geoposition, [latitude, longitude
  controls: false,     // Display zoom controls
  lang: "",           // Language for names, so far only for constellations: de: german, es: spanish
                      // Default:en or empty string for english
  container: mapId,   // ID of parent element, e.g. div
  datapath: "https://cdn.jsdelivr.net/npm/d3-celestial@0.7.35/data/",  // Path/URL to data files, empty = subfolder 'data'
  // follow: "zenith",
  stars: {
    show: true,
    limit: 5.5,                 // você pode testar 5.5~7.0
    colors: false,            // look mais uniforme
    style: { fill: "#ffffff", opacity: 1 },

    // Nomes: desligue quase tudo
    designation: false,       // (no README é designation) [page:4]
    propername: false,        // [page:4]
    designationLimit: -99,
    propernameLimit: -99,
    size: 9,
    exponent: -0.28,
    data: "stars.6.json"
  },
  dsos: {
    show: false,    // Show Deep Space Objects
    limit: 6,      // Show only DSOs brighter than limit magnitude
    names: false,   // Show DSO names
    desig: false,   // Show short DSO names
    namelimit: 4,  // Show only names for DSOs brighter than namelimit
    namestyle: { fill: "#cccccc", font: "11px Helvetica, Arial, serif", align: "left", baseline: "top" },
    size: null,    // Optional seperate scale size for DSOs, null = stars.size
    exponent: 1.6, // Scale exponent for DSO size, larger = more non-linear
    data: 'dsos.bright.json',  // Data source for DSOs
    //data: 'dsos.6.json'  // Alternative broader data source for DSOs
    //data: 'dsos.14.json' // Alternative deeper data source for DSOs
    symbols: {  //DSO symbol styles
      gg: {shape: "circle", fill: "#ff0000"},                                 // Galaxy cluster
      g:  {shape: "ellipse", fill: "#ff0000"},                                // Generic galaxy
      s:  {shape: "ellipse", fill: "#ff0000"},                                // Spiral galaxy
      s0: {shape: "ellipse", fill: "#ff0000"},                                // Lenticular galaxy
      sd: {shape: "ellipse", fill: "#ff0000"},                                // Dwarf galaxy
      e:  {shape: "ellipse", fill: "#ff0000"},                                // Elliptical galaxy
      i:  {shape: "ellipse", fill: "#ff0000"},                                // Irregular galaxy
      oc: {shape: "circle", fill: "#ffcc00", stroke: "#ffcc00", width: 1.5},  // Open cluster
      gc: {shape: "circle", fill: "#ff9900"},                                 // Globular cluster
      en: {shape: "square", fill: "#ff00cc"},                                 // Emission nebula
      bn: {shape: "square", fill: "#ff00cc", stroke: "#ff00cc", width: 2},    // Generic bright nebula
      sfr:{shape: "square", fill: "#cc00ff", stroke: "#cc00ff", width: 2},    // Star forming region
      rn: {shape: "square", fill: "#00ooff"},                                 // Reflection nebula
      pn: {shape: "diamond", fill: "#00cccc"},                                // Planetary nebula
      snr:{shape: "diamond", fill: "#ff00cc"},                                // Supernova remnant
      dn: {shape: "square", fill: "#999999", stroke: "#999999", width: 2},    // Dark nebula grey
      pos:{shape: "marker", fill: "#cccccc", stroke: "#cccccc", width: 1.5}   // Generic marker
    }
  },
  constellations: {
    show: false,               // se sua build aceitar
    names: false,
    namesType: "iau",         // ou "desig" pra 3 letras
    nameStyle: {
      fill: "#cfc9a6",
      align: "center",
      baseline: "middle",
      font: ["600 14px Helvetica, Arial, sans-serif",
             "600 12px Helvetica, Arial, sans-serif",
             "600 11px Helvetica, Arial, sans-serif"]
    },
    lines: true,
    lineStyle: { stroke: "#cfcfcf", width: 2, opacity: 0.4 }, // (no README é lineStyle) [page:4]
    bounds: false
  },
  mw: {
    show: false,
    style: { fill: "#ffffff", opacity: 0.1 }
  },
  lines: {
    graticule: { show: true, stroke: "#cccccc", width: 0.7, opacity: 0.30 }, // era 0.6 [page:4]
    equatorial: { show: false, stroke: "#aaaaaa", width: 2.5, opacity: 0.8 },  // era 1.3 [page:4]
    ecliptic: { show: false }  ,
    galactic: { show: false },
    supergalactic: { show: true }
  },

  // Horizon/daylight: geralmente off pra poster “céu inteiro”
  horizon: { show: false },
  daylight: { show: false }
};


  Celestial.display(config);
  // timezone: o Celestial quer offset (em minutos)
const tz = datetime.getTimezoneOffset(); // ex.: Bahia ~ 180 (UTC-3)

// Atualiza a visão do céu para essa data/local
Celestial.skyview({
  date: datetime,
  location: [lat, lng], // [lat, lon]
  timezone: tz
});
  // opcional mas ajuda a “acordar” em cenários de layout/resize
  try {
  const svgText = await exportSvgAsync(Celestial);

  // garantir xmlns + tamanho
  const svgFixed = svgText.includes("xmlns=")
    ? svgText
    : svgText.replace("<svg", `<svg xmlns="http://www.w3.org/2000/svg"`);

  const tmp = document.createElement("div");
  tmp.innerHTML = svgFixed;

  const svgEl = tmp.querySelector("svg") as SVGSVGElement | null;
  if (!svgEl) throw new Error("exportSVG não retornou <svg>");

  svgEl.setAttribute("width", String(sizePx));
  svgEl.setAttribute("height", String(sizePx));

  const outCanvas = await svgToPng(svgEl, sizePx, sizePx);

  return outCanvas;
  } finally {
    wrap.remove();
  }
}
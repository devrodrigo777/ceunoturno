export function formatAstroDate(iso: string | number | Date, showRelative: boolean | null = true, hideTime: boolean | null = false) {
  const d = iso instanceof Date ? iso : new Date(iso);
  const now = new Date();
  
  // Comparação por dia (no fuso local)
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfThatDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const diffDays = Math.round(
    (startOfToday.getTime() - startOfThatDay.getTime()) / 86400000
  );

  var time = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);

  if(hideTime)
    time = "";
  else
    time = `às ${time}`;

  if(showRelative)
  {
    if (diffDays === 0) return `Hoje ${time}`;
    if (diffDays === 1) return `Ontem ${time}`;
  }

  const sameYear = d.getFullYear() === now.getFullYear();

  const datePart = new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    ...(sameYear ? {} : { year: "numeric" as const }),
  }).format(d);

  return `${datePart} ${time}`.trim();
}

function normalizePgTimestamp(input: string) {
  // "1997-09-24 12:00:00+00" -> "1997-09-24T12:00:00+00:00"
  return input
    .trim()
    .replace(" ", "T")
    .replace(/([+-]\d{2})$/, "$1:00"); // +00 -> +00:00
}

const PT_MONTHS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function parsePgParts(input: unknown) {
  if (!input) return null;
  const s = String(input).trim();

  // Casa exatamente o que você mostrou e variações comuns:
  // "1997-09-24 12:00:00+00"
  // "1997-09-24 12:00:00+00:00"
  // "1997-09-24T12:00:00Z"
  // "1997-09-24T12:00:00.000Z"
  const m = s.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(?:Z|([+-]\d{2})(?::?\d{2})?)?$/
  );
  if (!m) return null;

  const year = Number(m[1]);
  const month = Number(m[2]); // 1-12
  const day = Number(m[3]);
  const hour = Number(m[4]);
  const minute = Number(m[5]);

  if (
    !Number.isFinite(year) || month < 1 || month > 12 ||
    day < 1 || day > 31 || hour < 0 || hour > 23 || minute < 0 || minute > 59
  ) return null;

  return { year, month, day, hour, minute };
}

export function formatDate(
  raw: string | number | Date | null | undefined,
  hideTime: boolean | null = false
) {
  let _raw = raw;
  // Se vier Date de verdade, usa Intl (ok)
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    const datePart = new Intl.DateTimeFormat("pt-BR", {
      day: "numeric", month: "long", year: "numeric",
    }).format(raw);

    if (hideTime) return datePart;

    const timePart = new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit", minute: "2-digit",
    }).format(raw);

    return `${datePart} às ${timePart}`;
  }

  // Se vier number (epoch)
  if (typeof raw === "number") {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return "Data inválida";
    return formatDate(d, hideTime);
  }
  console.log(_raw);
  const p = parsePgParts(raw);
  if (!p) return "Data inválida";

  const monthName = PT_MONTHS[p.month - 1];
  const dateHuman = `${p.day} de ${monthName} de ${p.year}`;

  if (hideTime) return dateHuman;

  const hh = String(p.hour).padStart(2, "0");
  const mm = String(p.minute).padStart(2, "0");
  return `${dateHuman} às ${hh}:${mm}`;
}





export function buildEventISO(date: string, time: string, hideTime: boolean) {
  if (!date) return null;
  const hhmm = hideTime ? "12:00" : (time || "12:00"); // fallback
  // ISO local (sem timezone). Depois, no backend, você pode converter/guardar como timestamptz.
  return `${date}T${hhmm}:00`;
}

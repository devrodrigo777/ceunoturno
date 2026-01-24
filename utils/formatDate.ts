export function formatAstroDate(iso: string | number | Date) {
  const d = iso instanceof Date ? iso : new Date(iso);
  const now = new Date();

  // Comparação por dia (no fuso local)
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfThatDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const diffDays = Math.round(
    (startOfToday.getTime() - startOfThatDay.getTime()) / 86400000
  );

  const time = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);

  if (diffDays === 0) return `Hoje às ${time}`;
  if (diffDays === 1) return `Ontem às ${time}`;

  const sameYear = d.getFullYear() === now.getFullYear();

  const datePart = new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    ...(sameYear ? {} : { year: "numeric" as const }),
  }).format(d);

  return `${datePart} às ${time}`;
}

export function buildEventISO(date: string, time: string, hideTime: boolean) {
  if (!date) return null;
  const hhmm = hideTime ? "12:00" : (time || "12:00"); // fallback
  // ISO local (sem timezone). Depois, no backend, você pode converter/guardar como timestamptz.
  return `${date}T${hhmm}:00`;
}

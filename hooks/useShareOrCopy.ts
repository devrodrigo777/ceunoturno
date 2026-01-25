export const useShareOrCopy = async (
  url: string,
  title?: string,
  text?: string
) => {
  const shareData = { title, text, url };

  // 1) tenta share nativo (mobile / pwa)
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share(shareData);
      return { ok: true, mode: "share" as const };
    } catch {
      // cancelado ou não suportado → segue fallback
    }
  }

  // 2) fallback: copiar link
  try {
    await navigator.clipboard.writeText(url);
    
    return { ok: true, mode: "copy" as const };
  } catch {
    return { ok: false, mode: "none" as const };
  }
};

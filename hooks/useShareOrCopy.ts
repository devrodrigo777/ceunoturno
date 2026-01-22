export const useShareOrCopy = async (url: string, title?: string, text?: string) => {
  const shareData = { title, text, url };

  // 1) tenta share nativo
  if (navigator.canShare?.(shareData)) {
    try {
      await navigator.share(shareData); // abre o compartilhamento do SO/navegador
      return { ok: true, mode: "share" as const };
    } catch {
      // usuário cancelou ou falhou -> cai pro copy
    }
  }

  // 2) fallback: copiar
  try {
    await navigator.clipboard.writeText(url);
    return { ok: true, mode: "copy" as const };
  } catch {
    return { ok: false, mode: "none" as const };
  }
}
export function enforceVersionReset() {
  const currentVersion = import.meta.env.VITE_APP_VERSION;
  const version_key = "__version__";
  const prev = localStorage.getItem(version_key);

  if (prev && prev !== currentVersion) {
    // 1) Limpa storage (você consegue)
    localStorage.clear();
    sessionStorage.clear();

    // 2) Limpa cookies não-HttpOnly (você consegue)
    document.cookie.split(';').forEach(c => {
      const eqPos = c.indexOf('=');
      const name = (eqPos > -1 ? c.slice(0, eqPos) : c).trim();
      document.cookie = `${name}=; Max-Age=0; path=/`;
    });

    // 3) Opcional: se tiver Service Worker, desregistrar
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(regs => {
        regs.forEach(r => r.unregister());
      });
    }

    // 4) Recarrega “hard”
    location.reload();
    return;
  }

  localStorage.setItem(version_key, currentVersion);
}

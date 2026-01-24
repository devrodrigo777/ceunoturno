import React, { useCallback, useEffect } from "react";

type OverlayKey = 'dashboard' | 'sobre' | 'termos' | 'purchase' | 'preview' | 'astro';

type Params = {
  setOverlayStack: React.Dispatch<React.SetStateAction<OverlayKey[]>>;
  openOverlay: (k: OverlayKey, state?: any, url?: string) => void;
};

export function useBackHandler({ setOverlayStack, openOverlay }: Params) {
  useEffect(() => {
    const onPopState = () => {
      setOverlayStack((s) => s.slice(0, -1));
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [setOverlayStack]);

  const closeOverlay = useCallback(() => {
    history.back();
  }, []);

  const pushDashboard = useCallback(() => openOverlay("dashboard"), [openOverlay]);
  const pushSobre = useCallback(() => openOverlay("sobre"), [openOverlay]);
  const pushTermos = useCallback(() => openOverlay("termos"), [openOverlay]);

  return { closeOverlay, pushDashboard, pushSobre, pushTermos };
}

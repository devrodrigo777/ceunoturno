import { useCallback, useEffect } from "react";

type BackState = {
  isDashboardOpen: boolean;
  isModalSobreOpen: boolean; // se você ainda usa isso
  modalAberto: boolean;      // se "Sobre" é controlado por isso
  isModalTermosOpen: boolean;
};

type BackActions = {
  closeDashboard: () => void;
  openDashboard: () => void;

  closeSobre: () => void;
  openSobre: () => void;

  closeTermos: () => void;
  openTermos: () => void;

  closeAstroDetails: () => void;

  selectedAstroId: string | null
};

type Params = BackState & BackActions;

export function useBackHandler({
  isDashboardOpen,
  isModalSobreOpen,
  modalAberto,
  isModalTermosOpen,
  closeDashboard,
  openDashboard,
  closeSobre,
  openSobre,
  closeTermos,
  openTermos,
  selectedAstroId,
  closeAstroDetails
}: Params) {
  const handleBack = useCallback(() => {

    if (selectedAstroId) {
        closeAstroDetails();

        // opcional: limpar querystring ?astro=
        const url = new URL(window.location.href);
        url.searchParams.delete("astro");
        history.replaceState(history.state, "", url.toString());

        return;
    }

    // Prioridade: fecha o que está mais "em cima"
    if (isModalTermosOpen) {
      closeTermos();
      openDashboard();
      return;
    }

    if (isModalSobreOpen || modalAberto) {
      closeSobre();
      openDashboard();
      return;
    }

    if (isDashboardOpen) {
      closeDashboard();
      return;
    }
  }, [
    selectedAstroId,
    closeAstroDetails,
    isModalTermosOpen,
    isModalSobreOpen,
    modalAberto,
    isDashboardOpen,
    closeTermos,
    openDashboard,
    closeSobre,
    closeDashboard,
  ]);

  useEffect(() => {
    const onPopState = () => handleBack();
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [handleBack]);

  // helpers pra você usar nos botões e já empilhar no histórico
  const pushDashboard = useCallback(() => {
    openDashboard();
    history.pushState({ ui: "dashboard" }, "");
  }, [openDashboard]);

  const pushSobre = useCallback(() => {
    openSobre();
  }, [openSobre]);

  const pushTermos = useCallback(() => {
    openTermos();
  }, [openTermos]);

  return { handleBack, pushDashboard, pushSobre, pushTermos };
}

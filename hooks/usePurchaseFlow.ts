import React, { useCallback, useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "../services/supabaseClient";
import { Astro, AstroPosition, AstroType } from "../types";
import { buildEventISO } from "../utils/formatDate";

type Vec2 = { x: number; y: number };

type Params = {
    astros: Astro[];
    offset: Vec2;
    zoom: number;

    session: any; // mantém como any pra não travar agora
    isPurchaseModalOpen: boolean;
    selectedAstro: Astro | null;
    modalAberto: boolean;

    setAstros: React.Dispatch<React.SetStateAction<Astro[]>>;
    setPos: React.Dispatch<React.SetStateAction<AstroPosition>>;

    setClickMarker: React.Dispatch<React.SetStateAction<Vec2 | null>>;
    setErrorMarker: React.Dispatch<React.SetStateAction<Vec2 | null>>;
    setLoginMarker: React.Dispatch<React.SetStateAction<Vec2 | null>>;
    setIsPurchaseModalOpen: React.Dispatch<React.SetStateAction<boolean>>;

    SKY_W: number;
    SKY_H: number;
    MIN_ASTRO_DISTANCE: number;

    getStarRegion: (x: number, y: number) => AstroPosition;
    getVelocity: () => Vec2;

    setIsDashboardOpen:  React.Dispatch<React.SetStateAction<boolean>>;
    setErrorCircle: React.Dispatch<React.SetStateAction<{ x:number; y:number; r:number } | null>>;
    openOverlay: (k: any, state?: any, url?: string) => void;
};

export function usePurchaseFlow({
    astros,
    offset,
    zoom,
    session,
    isPurchaseModalOpen,
    selectedAstro,
    modalAberto,
    setAstros,
    setPos,
    setClickMarker,
    setErrorMarker,
    setLoginMarker,
    setIsPurchaseModalOpen,
    SKY_W,
    SKY_H,
    MIN_ASTRO_DISTANCE,
    getStarRegion,
    getVelocity,
    setIsDashboardOpen,
    setErrorCircle,
    openOverlay
}: Params) {
    const [quote, setQuote] = useState<any>(null);

    const [msg, setMsg] = useState("");
    const [titulo, setTitulo] = useState("");

    const [pendingCoords, setPendingCoords] = useState<Vec2 | null>(null);

    const [type, setType] = useState<AstroType>("star");
    const [color, setColor] = useState("#FFFFFF");

    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
    const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);

    // MAPA ESTELAR
    // hooks/usePurchaseFlow.ts
    const [starmapEnabled, setStarmapEnabled] = useState(false);
    const [starmapTitle, setStarmapTitle] = useState("");

    const [locationQuery, setLocationQuery] = useState("");
    const [locationResults, setLocationResults] = useState<
    Array<{ id: number; label: string; lat: number; lng: number }>
    >([]);
    const [locationLoading, setLocationLoading] = useState(false);

    const [selectedLocation, setSelectedLocation] = useState<{
    id: number;
    label: string;
    lat: number;
    lng: number;
    } | null>(null);

    const [eventDate, setEventDate] = useState(""); // "YYYY-MM-DD"
    const [eventTime, setEventTime] = useState(""); // "HH:mm"
    const [hideTime, setHideTime] = useState(false);
    const defaultUserName =
            session?.user?.user_metadata?.full_name ??
            session?.user?.user_metadata?.fullname ??
            session?.user?.user_metadata?.name ??
            "Viajante";
    

        useEffect(() => {
            if (!starmapEnabled) return;

            const q = locationQuery.trim();
            if (q.length < 3) {
                setLocationResults([]);
                setLocationLoading(false);
                return;
            }

            // Se o usuário editou depois de selecionar, invalida seleção
            if (selectedLocation && q !== selectedLocation.label) {
                setSelectedLocation(null);
            }

            let cancelled = false;
            setLocationLoading(true);

            const t = window.setTimeout(async () => {
                try {
                const { data, error } = await supabase.rpc("search_locations", { q });
                if (cancelled) return;

                if (error) throw new Error(error.message);
                setLocationResults((data ?? []) as any);
                } catch (e: any) {
                if (!cancelled) setLocationResults([]);
                } finally {
                if (!cancelled) setLocationLoading(false);
                }
            }, 350);

            return () => {
                cancelled = true;
                window.clearTimeout(t);
            };
            }, [starmapEnabled, locationQuery, selectedLocation]);





    const previewAstro: Astro | null = useMemo(() => {
        if (!pendingCoords) return null;

        return {
            id: "preview",
            user_id: session?.user?.id ?? "preview",
            user_name:
                session?.user?.user_metadata?.full_name ??
                session?.user?.user_metadata?.name ??
                "Explorador",
            message: msg || "",
            position: getStarRegion(pendingCoords.x, pendingCoords.y),
            type,
            color,
            size: type === "nebula" ? 33 : type === "planet" ? 18 : 12,
            x: Math.round(pendingCoords.x),
            y: Math.round(pendingCoords.y),
            coordinate: "PRÉVIA",
            created_at: Date.now(),
            image_url: imagePreviewUrl,
        };
    }, [pendingCoords, session, msg, type, color, imagePreviewUrl, getStarRegion]);

    const resetImage = useCallback(() => {
        setImageFile(null);
        if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
        setImagePreviewUrl(null);
        setUploadedImageUrl(null);
    }, [imagePreviewUrl]);

    const closePurchaseModal = useCallback(() => {
        // alert("fechou!");
        setQuote(null);
        setMsg("");
        setTitulo("");
        setPendingCoords(null);
        resetImage();
        setIsPurchaseModalOpen(false);
        setIsDashboardOpen(true);
    }, [resetImage, setIsPurchaseModalOpen, setIsDashboardOpen]);

    const onPickImage = useCallback(
        (file: File | null) => {
            setImageFile(file);

            if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
            setImagePreviewUrl(file ? URL.createObjectURL(file) : null);

            // se trocar imagem, invalida a URL antiga "cacheada"
            setUploadedImageUrl(null);
        },
        [imagePreviewUrl]
    );

    const removeImage = useCallback(() => {
        setImageFile(null);
        if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
        setImagePreviewUrl(null);
        setUploadedImageUrl(null);
    }, [imagePreviewUrl]);

    const handleMapClick = useCallback(
        async (clientX: number, clientY: number) => {
            // if (!isPurchaseModalOpen) return;
            const v = getVelocity();
            if (!(Math.abs(v.x) < 0.5 && Math.abs(v.y) < 0.5)) return;

            const canvasX = (clientX - offset.x) / zoom;
            const canvasY = (clientY - offset.y) / zoom;

            // Remove o brilho após 2 segundos para não poluir a tela
            setTimeout(() => setClickMarker(null), 2000);

            const tooCloseAstro = astros
            .map(a => ({ a, d: Math.hypot(a.x - canvasX, a.y - canvasY) }))
            .filter(x => (x.d < MIN_ASTRO_DISTANCE))
            .sort((p, q) => p.d - q.d);//[0]?.a;

            if (tooCloseAstro.length > 0) {
                var filter_outside_size = tooCloseAstro.filter(x => (x.d > x.a.size));

                if(filter_outside_size.length > 0) {
                    setErrorMarker({ x: canvasX, y: canvasY });

                    setErrorCircle({
                        x: tooCloseAstro[0].a.x,
                        y: tooCloseAstro[0].a.y,
                        r: MIN_ASTRO_DISTANCE,
                    });

                    setTimeout(() => {
                        setErrorMarker(null);
                        setErrorCircle(null);
                    }, 1500);
                }
                
                return;
            }

            // const isTooClose = astros.some(
            //     (a) => Math.hypot(a.x - canvasX, a.y - canvasY) < MIN_ASTRO_DISTANCE
            // );

            // if (isTooClose) {
            //     setErrorMarker({ x: canvasX, y: canvasY });
            //     setTimeout(() => setErrorMarker(null), 1500);
            //     return;
            // }

            setClickMarker({ x: canvasX, y: canvasY });
            setPendingCoords({ x: canvasX, y: canvasY });

            const zonaCalculada = getStarRegion(canvasX, canvasY);
            setPos(zonaCalculada);

            if (!session?.user){
                setLoginMarker({ x: canvasX, y: canvasY-25 });
                setTimeout(() => setLoginMarker(null), 1500);
                return;
            }

            const { data, error } = await supabase.rpc("quote_astro", {
                p_x: Math.round(canvasX),
                p_y: Math.round(canvasY),
            });

            if (error) return;
            setQuote(data);

            openOverlay("purchase", { ui: "purchase" });
            // setIsPurchaseModalOpen(true);
        },
        [
            isPurchaseModalOpen,
            selectedAstro,
            modalAberto,
            getVelocity,
            offset.x,
            offset.y,
            zoom,
            astros,
            MIN_ASTRO_DISTANCE,
            session,
            getStarRegion,
            setPos,
            setClickMarker,
            setErrorMarker,
            setLoginMarker,
            setIsPurchaseModalOpen,
            openOverlay,
        ]
    );

    const uploadAstroImageIfNeeded = useCallback(async (): Promise<string | null> => {
        if (!imageFile || !session?.user) return null;

        const mime = imageFile.type; // ex: "image/jpeg"
        const ext = mime === "image/jpeg" ? "jpg"
        : mime === "image/png" ? "png"
        : mime === "image/webp" ? "webp"
        : null;

        if (!ext) {
            toast.error("Formato de imagem não permitido.");
            return;
        }

        const fileName = `${session.user.id}/${crypto.randomUUID()}.${ext}`;

        const { error: uploadError } = await supabase.storage
            .from("astro-images")
            .upload(fileName, imageFile, {
                cacheControl: "3600",
                upsert: false,
                contentType: imageFile.type,
            });

        if (uploadError) throw new Error(uploadError.message);

        const { data } = supabase.storage.from("astro-images").getPublicUrl(fileName);
        return data.publicUrl;
    }, [imageFile, session]);

    const handlePurchase = useCallback(async () => {
        if (!session?.user) return toast.error("É necessário login para continuar.");
        if (!pendingCoords) return;

        try {

            if (starmapEnabled) {
                if (!starmapTitle && !starmapTitle?.trim()) return toast.error("Defina um título válido para o quadro.");
                if (!selectedLocation) return toast.error("Selecione uma cidade da lista.");
                if (!eventDate) return toast.error("Selecione a data do evento.");
                if(!eventTime && !hideTime) return toast.error("Selecione a hora do evento.");
            }

            const starmapDatetime = starmapEnabled
                ? buildEventISO(eventDate, eventTime, hideTime)
                : null;
            const imageUrl = uploadedImageUrl ?? (await uploadAstroImageIfNeeded());
            setUploadedImageUrl(imageUrl);

            

            const { data, error } = await supabase.rpc("purchase_astro", {
                p_message: msg,
                p_x: Math.round(pendingCoords.x),
                p_y: Math.round(pendingCoords.y),
                p_type: type,
                p_color: color,
                p_image_path: imageUrl,

                // >>> QUADRO ESTELAR
                p_starmap_enabled: starmapEnabled,
                p_starmap_title: starmapEnabled ? (starmapTitle.trim() || null) : null,
                p_starmap_location_label: starmapEnabled ? selectedLocation?.label ?? null : null,
                p_starmap_lat: starmapEnabled ? selectedLocation?.lat ?? null : null,
                p_starmap_lng: starmapEnabled ? selectedLocation?.lng ?? null : null,
                p_starmap_datetime: starmapEnabled ? starmapDatetime : null,
                p_starmap_hide_time: starmapEnabled ? hideTime : false,
            });

            if (error) throw new Error(error.message);

            const novoAstro = data;

            setAstros((prev) => {
                const existe = prev.some((a) => a.id === novoAstro.id);
                if (existe) return prev;
                return [...prev, novoAstro];
            });

            toast.success("O cosmos acolhe sua nova descoberta!");
            closePurchaseModal();
        } catch (err: any) {
            toast.error(err.message || "Erro na comunicação estelar.");
        }
    }, [
        session,
        pendingCoords,
        uploadedImageUrl,
        uploadAstroImageIfNeeded,
        msg,
        type,
        color,
        setAstros,
        closePurchaseModal,
        starmapEnabled,
        starmapTitle,
        selectedLocation,
        eventDate,
        hideTime
    ]);

    // Útil pro minimapa do modal (sem mudar termos)
    const minimapDotStyle = useMemo(() => {
        if (!quote) return null;
        return {
            left: `${(quote.x / SKY_W) * 100}%`,
            top: `${(quote.y / SKY_H) * 100}%`,
            transform: "translate(-50%, -50%)",
            backgroundColor: color,
            boxShadow: `0 0 15px ${color}`,
        } as const;
    }, [quote, SKY_W, SKY_H, color]);

    return {
        // estados e setters que o App/Modal já usam
        quote,
        setQuote,

        msg,
        setMsg,
        titulo,
        setTitulo,

        pendingCoords,
        setPendingCoords,

        type,
        setType,
        color,
        setColor,

        imageFile,
        imagePreviewUrl,
        uploadedImageUrl,

        previewAstro,

        // ações
        handleMapClick,
        closePurchaseModal,
        handlePurchase,
        onPickImage,
        removeImage,

        // helpers
        minimapDotStyle,

        // starmap locations
        starmapEnabled, setStarmapEnabled,
        starmapTitle, setStarmapTitle,
        locationQuery, setLocationQuery,
        locationResults, setLocationResults,
        locationLoading,
        selectedLocation, setSelectedLocation,
        eventDate, setEventDate,
        eventTime, setEventTime,
        hideTime, setHideTime,
        defaultUserName
    };
}
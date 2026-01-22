import React, { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "../services/supabaseClient";
import { Astro, AstroPosition, AstroType } from "../types";

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
    setIsPurchaseModalOpen: React.Dispatch<React.SetStateAction<boolean>>;

    SKY_W: number;
    SKY_H: number;
    MIN_ASTRO_DISTANCE: number;

    getStarRegion: (x: number, y: number) => AstroPosition;
    getVelocity: () => Vec2;

    setIsDashboardOpen:  React.Dispatch<React.SetStateAction<boolean>>;
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
    setIsPurchaseModalOpen,
    SKY_W,
    SKY_H,
    MIN_ASTRO_DISTANCE,
    getStarRegion,
    getVelocity,
    setIsDashboardOpen
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
        alert("fechou!");
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
            if (isPurchaseModalOpen || selectedAstro || modalAberto) return;

            const v = getVelocity();
            if (!(Math.abs(v.x) < 0.5 && Math.abs(v.y) < 0.5)) return;

            const canvasX = (clientX - offset.x) / zoom;
            const canvasY = (clientY - offset.y) / zoom;

            // Remove o brilho após 2 segundos para não poluir a tela
            setTimeout(() => setClickMarker(null), 2000);

            const isTooClose = astros.some(
                (a) => Math.hypot(a.x - canvasX, a.y - canvasY) < MIN_ASTRO_DISTANCE
            );

            if (isTooClose) {
                setErrorMarker({ x: canvasX, y: canvasY });
                setTimeout(() => setErrorMarker(null), 1500);
                return;
            }

            setClickMarker({ x: canvasX, y: canvasY });
            setPendingCoords({ x: canvasX, y: canvasY });

            const zonaCalculada = getStarRegion(canvasX, canvasY);
            setPos(zonaCalculada);

            if (!session?.user) return;

            const { data, error } = await supabase.rpc("quote_astro", {
                p_x: Math.round(canvasX),
                p_y: Math.round(canvasY),
            });

            if (error) return;
            setQuote(data);
            setIsPurchaseModalOpen(true);
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
            setIsPurchaseModalOpen,
        ]
    );

    const uploadAstroImageIfNeeded = useCallback(async (): Promise<string | null> => {
        if (!imageFile || !session?.user) return null;

        const ext = imageFile.name.split(".").pop() || "jpg";
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
            const imageUrl = uploadedImageUrl ?? (await uploadAstroImageIfNeeded());
            setUploadedImageUrl(imageUrl);

            const { data, error } = await supabase.rpc("purchase_astro", {
                p_message: msg,
                p_x: Math.round(pendingCoords.x),
                p_y: Math.round(pendingCoords.y),
                p_type: type,
                p_color: color,
                p_image_path: imageUrl,
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
    };
}
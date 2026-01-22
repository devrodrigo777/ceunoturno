import React, { useCallback, useEffect, useRef, useState } from 'react';

type Vec2 = { x: number; y: number };

type Params = {
    skyW: number;
    skyH: number;

    initialOffset?: Vec2;
    initialZoom?: number;

    friction?: number;
    lerp?: number;
    minZ?: number;
    maxZ?: number;
    dragSensitivity?: number;

    // Você usa isso pra evitar iniciar drag quando clicar em botões/itens clicáveis
    isBlockedTarget?: (target: HTMLElement) => boolean;
    isBlocked: boolean;
}

export function useSkyViewport({
    skyW,
    skyH,
    initialOffset,
    initialZoom = 0.7,
    friction = 0.9,
    lerp = 0.05,
    minZ = 0.95,
    maxZ = 1.5,
    dragSensitivity = 1,
    isBlocked = false,
    isBlockedTarget = (target) =>
        !!target.closest(".clickable") || !!target.closest("button"),
}: Params) {
    const [offset, setOffset] = useState<Vec2>(() => {
        if (initialOffset) return initialOffset;

        return {
            x: -(skyW / 4 + (window.innerWidth / 2)),
            y: -(skyH / 4 - (window.innerHeight / 2))
        };
    });

    const [zoom, setZoom] = useState(initialZoom);

    const targetOff = useRef({ ...offset });
    const currentOff = useRef({ ...offset });

    const targetZoom = useRef(0.7);
    const currentZoom = useRef(0.7);

    const velocity = useRef({ x: 0, y: 0 });
    const lastMousePos = useRef({ x: 0, y: 0 });

    const [isDragging, setIsDragging] = useState(false);
    const pinchDist = useRef<number | null>(null);
    const touchStartPos = useRef({ x: 0, y: 0 });

    // Main Loop for Smooth Transitions
    const animate = useCallback(() => {
        // if (!isDragging) {
        velocity.current.x *= friction;
        velocity.current.y *= friction;
        targetOff.current.x += velocity.current.x;
        targetOff.current.y += velocity.current.y;
        // }

        currentZoom.current += (targetZoom.current - currentZoom.current) * lerp;
        const sW = skyW * currentZoom.current;
        const sH = skyH * currentZoom.current;

        // Boundary constraints
        if (sW <= window.innerWidth) targetOff.current.x = (window.innerWidth - sW) / 2;
        else targetOff.current.x = Math.min(0, Math.max(window.innerWidth - sW, targetOff.current.x));

        if (sH <= window.innerHeight) targetOff.current.y = (window.innerHeight - sH) / 2;
        else targetOff.current.y = Math.min(0, Math.max(window.innerHeight - sH, targetOff.current.y));

        currentOff.current.x += (targetOff.current.x - currentOff.current.x) * lerp;
        currentOff.current.y += (targetOff.current.y - currentOff.current.y) * lerp;

        setOffset({ x: currentOff.current.x, y: currentOff.current.y });
        setZoom(currentZoom.current);
        // requestAnimationFrame(animate);
    }, [isDragging]);

    useEffect(() => {
        let frameId: number;

        const loop = () => {
            animate();
            frameId = requestAnimationFrame(loop);
        };

        frameId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(frameId); // Isso mata o loop antigo antes de criar um novo
    }, [animate]);

    const handleZoom = useCallback(
        (delta: number, cx: number, cy: number) => {
            const prevZ = targetZoom.current;
            const newZ = Math.min(maxZ, Math.max(minZ, prevZ + delta));
            const ratio = newZ / prevZ;

            targetOff.current.x = cx - (cx - targetOff.current.x) * ratio;
            targetOff.current.y = cy - (cy - targetOff.current.y) * ratio;

            targetZoom.current = newZ;
        }, [maxZ, minZ]
    );

    useEffect(() => {
        const wheel = (e: WheelEvent) => {
            const target = e.target as HTMLElement | null;
            e.preventDefault();

            if (isBlocked) return;
            
            if (target?.closest(".modal-content") || target?.closest("[data-modal]")) return;

            handleZoom(-e.deltaY * 0.001, e.clientX, e.clientY);
        };

        window.addEventListener('wheel', wheel, { passive: false });
        return () => window.removeEventListener('wheel', wheel);
    }, [handleZoom, isBlocked, isBlockedTarget]);

    const onStart = useCallback(
        (cx: number, cy: number, target: HTMLElement) => {
            if (target.closest('.clickable') || target.closest('button')) return;
            setIsDragging(true);
            velocity.current = { x: 0, y: 0 };
            lastMousePos.current = { x: cx, y: cy };

            // Salva o ponto inicial para comparação no final
            touchStartPos.current = { x: cx, y: cy };
        }, [isBlockedTarget]
    );

    const onMove = useCallback(
        (cx: number, cy: number) => {
            if (!isDragging) return;
            const delta = { x: cx - lastMousePos.current.x, y: cy - lastMousePos.current.y };
            velocity.current = { x: delta.x * 0.1 + velocity.current.x * 0.9, y: delta.y * 0.1 + velocity.current.y * 0.9 };
            lastMousePos.current = { x: cx, y: cy };
            targetOff.current.x += (velocity.current.x * 0.8) * dragSensitivity;
            targetOff.current.y += (velocity.current.y * 0.8) * dragSensitivity;
        }, [isDragging, dragSensitivity]
    );

    const onTouch = useCallback(
        (e: React.TouchEvent) => {
            if (e.touches.length === 2) {
                const dist = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );

                if (pinchDist.current) {
                    handleZoom(
                        (dist - pinchDist.current) * 0.005,
                        (e.touches[0].clientX + e.touches[1].clientX) / 2,
                        (e.touches[0].clientY + e.touches[1].clientY) / 2
                    );
                }

                pinchDist.current = dist;
            } else if (e.touches.length === 1) {
                onMove(e.touches[0].clientX, e.touches[0].clientY);
            }
        }, [handleZoom, onMove]
    );

    const stopDragging = useCallback(() => {
        setIsDragging(false);
        pinchDist.current = null;
    }, []);

    const getTouchStart = useCallback(() => touchStartPos.current, []);
    const getVelocity = useCallback(() => velocity.current, []);
    const setDragging = useCallback((v: boolean) => setIsDragging(v), []);

    return {
        offset,
        zoom,
        isDragging,

        // refs úteis fora do hook (ex.: focar astro)
        targetOff,
        currentZoom,

        // handlers
        handleZoom,
        onStart,
        onMove,
        onTouch,
        stopDragging,

        // pra você reaproveitar a lógica de "tap vs drag" no App
        getTouchStart,
        getVelocity,
        setDragging,
    };
};
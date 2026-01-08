import React, { useRef, useState, useEffect } from 'react';

interface Transform {
    scale: number;
    x: number;
    y: number;
}

interface MediaPreviewProps {
    file: File;
    transform: Transform;
    onTransformChange: (t: Transform) => void;
    backgroundColor: string;
    aspectRatio?: number; // width / height
}

type HandleType = 'nw' | 'ne' | 'se' | 'sw' | 'n' | 'e' | 's' | 'w';

export function MediaPreview({ file, transform, onTransformChange, backgroundColor, aspectRatio = 1 }: MediaPreviewProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [mediaUrl, setMediaUrl] = useState<string>('');
    const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

    // Measurements for the "fitted" image (0 transforms)
    const [fittedRect, setFittedRect] = useState({ width: 0, height: 0, left: 0, top: 0 });

    const [isDragging, setIsDragging] = useState(false);
    const [dragType, setDragType] = useState<'move' | HandleType | null>(null);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [startTransform, setStartTransform] = useState<Transform>({ scale: 1, x: 0, y: 0 });

    // Snapping State
    const [isSnappedX, setIsSnappedX] = useState(false);
    const [isSnappedY, setIsSnappedY] = useState(false);

    useEffect(() => {
        const url = URL.createObjectURL(file);
        setMediaUrl(url);

        const img = new Image();
        img.onload = () => {
            setNaturalSize({ width: img.width, height: img.height });
        };
        img.src = url;

        if (file.type.startsWith('video/')) {
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.onloadedmetadata = () => {
                setNaturalSize({ width: video.videoWidth, height: video.videoHeight });
            };
            video.src = url;
        }

        return () => URL.revokeObjectURL(url);
    }, [file]);

    // Track container size
    useEffect(() => {
        if (!containerRef.current) return;
        const obs = new ResizeObserver((entries) => {
            const { width, height } = entries[0].contentRect;
            setContainerSize({ width, height });
        });
        obs.observe(containerRef.current);
        return () => obs.disconnect();
    }, []);

    // Calculate fitted rect whenever sizes change
    useEffect(() => {
        if (naturalSize.width === 0 || containerSize.width === 0) return;

        const containerAspect = containerSize.width / containerSize.height;
        const mediaAspect = naturalSize.width / naturalSize.height;

        let width, height;

        if (mediaAspect > containerAspect) {
            // Media is wider than container provided aspect (bound by width)
            width = containerSize.width;
            height = width / mediaAspect;
        } else {
            // Media is taller (bound by height)
            height = containerSize.height;
            width = height * mediaAspect;
        }

        setFittedRect({
            width,
            height,
            left: (containerSize.width - width) / 2,
            top: (containerSize.height - height) / 2
        });
    }, [naturalSize, containerSize, aspectRatio]); // aspectRatio triggers container resize effectively

    const handleMouseDown = (e: React.MouseEvent, type: 'move' | HandleType) => {
        e.stopPropagation();
        e.preventDefault();
        setIsDragging(true);
        setDragType(type);
        setDragStart({ x: e.clientX, y: e.clientY });
        setStartTransform({ ...transform });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !containerRef.current) return;

        const deltaX = e.clientX - dragStart.x;
        const deltaY = e.clientY - dragStart.y;

        // Calculate current box dimensions in pixels based on startTransform
        const currentW = fittedRect.width * startTransform.scale;
        const currentH = fittedRect.height * startTransform.scale;

        const centerX = containerSize.width / 2 + startTransform.x * containerSize.width;
        const centerY = containerSize.height / 2 + startTransform.y * containerSize.height;

        const currentLeft = centerX - currentW / 2;
        const currentTop = centerY - currentH / 2;

        if (dragType === 'move') {
            // Simple Pan
            let shiftX = deltaX / containerSize.width;
            let shiftY = deltaY / containerSize.height;

            let newTx = startTransform.x + shiftX;
            let newTy = startTransform.y + shiftY;

            // --- Snapping Logic ---
            // Threshold: 3% of respective dimension
            const THRESHOLD = 0.03;

            // Check X Snap
            if (Math.abs(newTx) < THRESHOLD) {
                newTx = 0;
                setIsSnappedX(true);
            } else {
                setIsSnappedX(false);
            }

            // Check Y Snap
            if (Math.abs(newTy) < THRESHOLD) {
                newTy = 0;
                setIsSnappedY(true);
            } else {
                setIsSnappedY(false);
            }

            onTransformChange({
                ...startTransform,
                x: newTx,
                y: newTy
            });
            return;
        }

        // Handle Resizing (Simplified for brevity, same logic as before but could add snap scale if needed)
        // For now, we only snap position (pan) as requested ("center magnet").

        let newX = currentLeft;
        let newY = currentTop;
        let newW = currentW;
        let newH = currentH;

        if (dragType?.includes('e')) newW = currentW + deltaX;
        if (dragType?.includes('w')) {
            newW = currentW - deltaX;
            newX = currentLeft + deltaX;
        }
        if (dragType?.includes('s')) newH = currentH + deltaY;
        if (dragType?.includes('n')) {
            newH = currentH - deltaY;
            newY = currentTop + deltaY;
        }

        // Apply Aspect Ratio Constraint for corner drag
        if (dragType?.length === 2) {
            const aspect = currentW / currentH;
            if (dragType.includes('w') || dragType.includes('e')) {
                newH = newW / aspect;
                if (dragType.includes('n')) newY = currentTop + (currentH - newH);
            }
        }

        const newScale = newW / fittedRect.width;
        const newCenterX = newX + newW / 2;
        const newCenterY = newY + newH / 2;
        const newTransformX = (newCenterX - containerSize.width / 2) / containerSize.width;
        const newTransformY = (newCenterY - containerSize.height / 2) / containerSize.height;

        onTransformChange({
            scale: Math.max(0.1, newScale),
            x: newTransformX,
            y: newTransformY
        });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        setDragType(null);
        // Clear snapping indicators on release (optional, or keep them if at 0)
        setIsSnappedX(false);
        setIsSnappedY(false);
    };

    // Also clear snap if transform moved away by other means? 
    // Effect to detect center?
    useEffect(() => {
        if (!isDragging) {
            setIsSnappedX(transform.x === 0);
            setIsSnappedY(transform.y === 0);
        }
    }, [transform, isDragging]);

    const boxStyle: React.CSSProperties = {
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: fittedRect.width,
        height: fittedRect.height,
        transform: `translate(-50%, -50%) translate(${transform.x * containerSize.width}px, ${transform.y * containerSize.height}px) scale(${transform.scale})`,
        transformOrigin: 'center',
    };

    const isVideo = file.type.startsWith('video/');

    const handleClasses = "absolute w-3 h-3 bg-blue-500 border border-white rounded-full z-20 hover:scale-125 transition-transform shadow";

    const pos = {
        nw: { top: -6, left: -6, cursor: 'nw-resize' },
        n: { top: -6, left: '50%', marginLeft: -6, cursor: 'n-resize' },
        ne: { top: -6, right: -6, cursor: 'ne-resize' },
        e: { top: '50%', right: -6, marginTop: -6, cursor: 'e-resize' },
        se: { bottom: -6, right: -6, cursor: 'se-resize' },
        s: { bottom: -6, left: '50%', marginLeft: -6, cursor: 's-resize' },
        sw: { bottom: -6, left: -6, cursor: 'sw-resize' },
        w: { top: '50%', left: -6, marginTop: -6, cursor: 'w-resize' },
    };

    return (
        <div
            className="relative w-full border-2 border-slate-700 rounded-xl overflow-hidden bg-slate-900 select-none"
            style={{
                backgroundColor,
                aspectRatio: `${aspectRatio}`
            }}
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            {/* Grid for visual ref */}
            <div className="absolute inset-0 pointer-events-none opacity-20 z-0 grid grid-cols-3 grid-rows-3">
                {[...Array(9)].map((_, i) => (
                    <div key={i} className="border border-slate-500/30"></div>
                ))}
            </div>

            {/* Snap Guidelines */}
            {isSnappedX && (
                <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-blue-500 z-10 -ml-px shadow-[0_0_8px_rgba(59,130,246,0.8)] animate-pulse" />
            )}
            {isSnappedY && (
                <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-blue-500 z-10 -mt-px shadow-[0_0_8px_rgba(59,130,246,0.8)] animate-pulse" />
            )}

            {/* Transformable Box containing Media */}
            <div style={boxStyle} className="group">
                {/* Media */}
                <div
                    className="w-full h-full cursor-move"
                    onMouseDown={(e) => handleMouseDown(e, 'move')}
                >
                    {isVideo ? (
                        <video
                            src={mediaUrl}
                            className="w-full h-full object-contain pointer-events-none"
                            muted loop autoPlay playsInline
                        />
                    ) : (
                        <img
                            src={mediaUrl}
                            className="w-full h-full object-contain pointer-events-none"
                            alt="preview"
                        />
                    )}
                </div>

                {/* Handles */}
                {Object.entries(pos).map(([key, style]) => (
                    <div
                        key={key}
                        className={handleClasses}
                        style={{ ...style }}
                        onMouseDown={(e) => handleMouseDown(e, key as HandleType)}
                    />
                ))}

                {/* Border outline */}
                <div className="absolute inset-0 border border-blue-500 opacity-0 group-hover:opacity-50 pointer-events-none transition-opacity" />
            </div>
            {/* Safe Zone Overlay - Only for Portrait (9:16) */}
            {Math.abs(aspectRatio - 9 / 16) < 0.01 && (
                <div className="absolute inset-0 pointer-events-none z-30">
                    {/* Top Danger Zone - Removed for L-shape (Safe at Top) */}
                    {/* <div className="absolute top-0 left-0 right-0 h-[14%] bg-black/50" /> */}

                    {/* Bottom Danger Zone (Yellow) */}
                    <div className="absolute bottom-0 left-0 right-0 h-[30%] bg-yellow-500/40" />
                    <div className="absolute bottom-[89%] left-0 right-0 h-[35%] bg-yellow-500/40" />

                    {/* Left Danger Zone (Yellow) - Extended to top since Top zone is removed */}
                    <div className="absolute top-0 bottom-[30%] left-[94%] w-[6%] bg-yellow-500/40" />
                    <div className="absolute top-0 bottom-[30%] left-0 w-[6%] bg-yellow-500/40" />
                    <div className="absolute top-[50%] bottom-[30%] right-[6%] w-[15%] bg-yellow-500/40" />

                    {/* Right Danger Zone - Removed for L-shape (Safe at Right) */}
                    {/* <div className="absolute top-[14%] bottom-[35%] right-0 w-[6%] bg-black/50" /> */}
                </div>
            )}

            {/* Safe Zone Overlay - Landscape (16:9) AND Square (1:1) */}
            {(Math.abs(aspectRatio - 16 / 9) < 0.01 || Math.abs(aspectRatio - 1) < 0.01) && (
                <div className="absolute inset-0 pointer-events-none z-30">
                    {/* Top 5% */}
                    <div className="absolute top-0 left-0 right-0 h-[5%] bg-yellow-500/40" />
                    {/* Bottom 8% */}
                    <div className="absolute bottom-0 left-0 right-0 h-[8%] bg-yellow-500/40" />
                    {/* Left 5% (between top and bottom to avoid overlap) */}
                    <div className="absolute top-[5%] bottom-[8%] left-0 w-[5%] bg-yellow-500/40" />
                    {/* Right 5% (between top and bottom to avoid overlap) */}
                    <div className="absolute top-[5%] bottom-[8%] right-0 w-[5%] bg-yellow-500/40" />
                </div>
            )}
        </div>
    );
}

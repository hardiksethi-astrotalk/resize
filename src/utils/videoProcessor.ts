import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

export async function loadFFmpeg(): Promise<FFmpeg> {
    if (ffmpeg) return ffmpeg;
    if (loadPromise) return loadPromise;

    loadPromise = (async () => {
        // Check for SharedArrayBuffer support
        if (!window.SharedArrayBuffer) {
            throw new Error('SharedArrayBuffer is not available. This browser environment does not support client-side video processing.');
        }

        const instance = new FFmpeg();

        // Log FFmpeg messages to console for debugging
        instance.on('log', ({ message }) => {
            console.log('[FFmpeg]', message);
        });

        // Global progress logging (optional, can be removed if too noisy)
        instance.on('progress', ({ progress: _progress }) => {
            // console.log(`[FFmpeg] Global Progress: ${_progress * 100}%`);
        });

        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';

        try {
            await instance.load({
                coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
                wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
            });

            ffmpeg = instance;
            return instance;
        } catch (e) {
            loadPromise = null; // Reset promise on failure
            throw e;
        }
    })();

    return loadPromise;
}

export async function processVideo(
    file: File,
    targetWidth: number,
    targetHeight: number,
    backgroundColor: string,
    userScale: number = 1,
    panX: number = 0,
    panY: number = 0,
    onProgress?: (progress: number) => void
): Promise<string> {
    // 1. Get exact input dimensions (using DOM video element)
    const dims = await getVideoDimensions(file);
    const iw = dims.width;
    const ih = dims.height;

    // 2. Load FFmpeg
    const instance = await loadFFmpeg();

    // Attach progress listener if callback provided
    const progressHandler = ({ progress }: { progress: number }) => {
        if (onProgress) onProgress(progress);
    };

    if (onProgress) {
        instance.on('progress', progressHandler);
    }

    const inputName = 'input.mp4';
    const outputName = 'output.mp4';

    try {
        // 3. Write input file
        await instance.writeFile(inputName, await fetchFile(file));

        // 4. Calculate Dimensions & Filters
        // Ensure even target dimensions for libx264 (macroblock requirement)
        const padW = targetWidth % 2 !== 0 ? targetWidth - 1 : targetWidth;
        const padH = targetHeight % 2 !== 0 ? targetHeight - 1 : targetHeight;

        // Scale calculation: "Contain" logic
        const scaleFactor = Math.min(padW / iw, padH / ih) * userScale;

        // New dimensions for the scaled video
        let newW = Math.round(iw * scaleFactor);
        let newH = Math.round(ih * scaleFactor);

        // Ensure scaled dimensions are even
        if (newW % 2 !== 0) newW -= 1;
        if (newH % 2 !== 0) newH -= 1;

        // Safety check for 0 dimensions
        newW = Math.max(2, newW);
        newH = Math.max(2, newH);

        // Calculate Padding/Positioning
        const xPos = (padW - newW) / 2 + (padW * panX);
        const yPos = (padH - newH) / 2 + (padH * panY);

        // Pad dimensions
        const superW = Math.max(padW, newW);
        const superH = Math.max(padH, newH);

        // Pad positions
        const padX = Math.max(0, xPos);
        const padY = Math.max(0, yPos);

        // Crop positions
        const cropX = Math.max(0, -xPos);
        const cropY = Math.max(0, -yPos);

        // Convert hex color (#RRGGBB) to (0xRRGGBB) for FFmpeg safety
        const safeColor = backgroundColor.startsWith('#')
            ? backgroundColor.replace('#', '0x')
            : backgroundColor;

        // Construct robust filter chain
        const filter = [
            `scale=w=${newW}:h=${newH}:flags=lanczos`,
            `setsar=1`,
            `pad=w=${superW}:h=${superH}:x=${padX.toFixed(2)}:y=${padY.toFixed(2)}:color=${safeColor}`,
            `crop=w=${padW}:h=${padH}:x=${cropX.toFixed(2)}:y=${cropY.toFixed(2)}`
        ].join(',');

        console.log('[VideoProcessor] Dimensions:', { iw, ih, padW, padH, newW, newH, xPos, yPos });
        console.log('[VideoProcessor] Filter:', filter);

        // 5. Execute FFmpeg

        // Cleanup previous outputs if any
        try { await instance.deleteFile(outputName); } catch { }

        console.time('[VideoProcessor] Encoding Time');
        const exitCode = await instance.exec([
            '-v', 'error',         // Reduce logging noise
            '-i', inputName,       // Input
            '-vf', filter,         // Video Filter Chain
            '-map', '0:v',         // Map First Video Stream
            '-map', '0:a?',        // Map First Audio Stream (Optional if exists)
            '-c:v', 'libx264',     // Encode Video H.264
            '-pix_fmt', 'yuv420p', // Pixel Format for Player Compatibility
            '-preset', 'ultrafast',// Fast encoding
            '-threads', '4',       // Use multi-threading
            '-c:a', 'aac',         // Encode Audio AAC
            outputName             // Output
        ]);
        console.timeEnd('[VideoProcessor] Encoding Time');

        if (exitCode !== 0) {
            throw new Error(`FFmpeg exited with non-zero code: ${exitCode}`);
        }

        // 6. Read and Return Output
        const data = await instance.readFile(outputName) as any;

        if (!data || data.length === 0) {
            throw new Error('Output file is empty (0 bytes)');
        }

        console.log(`[VideoProcessor] Success! Output size: ${data.length} bytes`);

        const blob = new Blob([data], { type: 'video/mp4' });
        return URL.createObjectURL(blob);

    } catch (err) {
        console.error('[VideoProcessor] Execution Error:', err);
        throw new Error('Video encoding failed. See console logs for details: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
        // Clean up listeners
        if (onProgress) {
            try {
                // @ts-ignore - 'off' might be missing in type definitions but usually exists on EventEmitter
                instance.off('progress', progressHandler);
            } catch (e) {
                // Fallback or ignore if off is not supported
            }
        }

        // Cleanup memory
        try {
            await instance.deleteFile(inputName);
            await instance.deleteFile(outputName);
        } catch { }
    }
}

// Helper: Fetch file to Uint8Array
async function fetchFile(file: File): Promise<Uint8Array> {
    return new Uint8Array(await file.arrayBuffer());
}

// Helper: Get Video Dimensions via DOM
function getVideoDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
            resolve({ width: video.videoWidth, height: video.videoHeight });
            URL.revokeObjectURL(video.src);
        };
        video.onerror = () => {
            reject(new Error("Failed to load video metadata. File may be corrupted or format unsupported."));
        };
        video.src = URL.createObjectURL(file);
    });
}

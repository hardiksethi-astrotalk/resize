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

        instance.on('progress', ({ progress }) => {
            console.log(`[FFmpeg] Progress: ${progress * 100}%`);
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
    backgroundColor: string
): Promise<string> {
    const instance = await loadFFmpeg();

    const inputName = 'input.mp4';
    const outputName = 'output.mp4';

    // Write file to in-memory FS
    await instance.writeFile(inputName, await fetchFile(file));

    // Ensure even dimensions for libx264
    const w = targetWidth % 2 !== 0 ? targetWidth - 1 : targetWidth;
    const h = targetHeight % 2 !== 0 ? targetHeight - 1 : targetHeight;

    // Construct filter string
    const filter = [
        `scale=${w}:${h}:force_original_aspect_ratio=decrease`,
        `pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:color=${backgroundColor}`
    ].join(',');

    console.log('[VideoProcessor] Starting processing with filter:', filter);

    // Run FFmpeg command
    try {
        // Cleanup previous runs just in case
        try { await instance.deleteFile(outputName); } catch { }

        await instance.exec([
            '-i', inputName,
            '-vf', filter,
            '-c:v', 'libx264', // Re-encode video
            '-preset', 'ultrafast', // Speed over compression
            '-c:a', 'copy', // Copy audio
            outputName
        ]);
    } catch (err) {
        console.error('[VideoProcessor] FFmpeg exec failed:', err);
        throw new Error('Video encoding failed');
    }

    // Read the result
    try {
        const data = await instance.readFile(outputName) as any;
        const blob = new Blob([data], { type: 'video/mp4' });
        return URL.createObjectURL(blob);
    } catch (err) {
        console.error('[VideoProcessor] Could not read output file:', err);
        throw new Error('Failed to generate output video');
    } finally {
        try {
            await instance.deleteFile(inputName);
            await instance.deleteFile(outputName);
        } catch (e) { /* ignore cleanup errors */ }
    }
}

// Helper to fetch file data
async function fetchFile(file: File): Promise<Uint8Array> {
    return new Uint8Array(await file.arrayBuffer());
}

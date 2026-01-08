export async function processImage(
    file: File,
    targetWidth: number,
    targetHeight: number,
    backgroundColor: string,
    userScale: number = 1,
    panX: number = 0,
    panY: number = 0
): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                URL.revokeObjectURL(url);
                reject(new Error('Could not get canvas context'));
                return;
            }

            // Fill background
            ctx.fillStyle = backgroundColor;
            ctx.fillRect(0, 0, targetWidth, targetHeight);

            // Calculate scale and position to fit image
            const baseScale = Math.min(
                targetWidth / img.width,
                targetHeight / img.height
            );

            // Apply user adjustments
            const finalScale = baseScale * userScale;

            const drawWidth = img.width * finalScale;
            const drawHeight = img.height * finalScale;

            // Base centered position + Pan offset
            // Pan is percentage of target, so we shift by targetWidth * panX
            const x = (targetWidth - drawWidth) / 2 + (targetWidth * panX);
            const y = (targetHeight - drawHeight) / 2 + (targetHeight * panY);

            ctx.drawImage(img, x, y, drawWidth, drawHeight);

            const resultUrl = canvas.toDataURL(file.type);
            URL.revokeObjectURL(url);
            resolve(resultUrl);
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load image'));
        };

        img.src = url;
    });
}

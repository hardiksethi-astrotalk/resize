export async function processImage(
    file: File,
    targetWidth: number,
    targetHeight: number,
    backgroundColor: string
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
            const scale = Math.min(
                targetWidth / img.width,
                targetHeight / img.height
            );

            const drawWidth = img.width * scale;
            const drawHeight = img.height * scale;
            const x = (targetWidth - drawWidth) / 2;
            const y = (targetHeight - drawHeight) / 2;

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

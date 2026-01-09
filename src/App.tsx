import { useState } from 'react';
import { UploadZone } from './components/UploadZone';
import { ColorPicker } from './components/ColorPicker';
import { MediaPreview } from './components/MediaPreview';
import { RESIZE_CONFIGS, ResizeConfig } from './utils/types';
import { processImage } from './utils/imageProcessor';
import { processVideo } from './utils/videoProcessor';
import { Layers, Download, Loader2, RefreshCcw, LayoutTemplate } from 'lucide-react';

function App() {
    const [file, setFile] = useState<File | null>(null);
    const [bgColor, setBgColor] = useState('#000000');
    const [customFilename, setCustomFilename] = useState('');

    // State to hold transform for each resize config, keyed by label
    const [transforms, setTransforms] = useState<Record<string, { scale: number; x: number; y: number }>>({});

    // Granular processing state
    const [processingStates, setProcessingStates] = useState<Record<string, boolean>>({});

    // Progress state: 0 to 1
    const [progress, setProgress] = useState<Record<string, number>>({});

    // Global processing lock for batch operations
    const [isGlobalProcessing, setIsGlobalProcessing] = useState(false);

    const getTransform = (label: string) => {
        return transforms[label] || { scale: 1, x: 0, y: 0 };
    };

    const updateTransform = (label: string, newTransform: { scale: number; x: number; y: number }) => {
        setTransforms(prev => ({
            ...prev,
            [label]: newTransform
        }));
    };

    const handleFileSelect = (selectedFile: File) => {
        setFile(selectedFile);
        // Default filename is the original name without extension
        const nameWithoutExt = selectedFile.name.substring(0, selectedFile.name.lastIndexOf('.')) || selectedFile.name;
        setCustomFilename(nameWithoutExt);
        // Reset transforms
        setTransforms({});
        // Reset progress
        setProgress({});
    };

    // Helper to generate the result URL
    const generateUrl = async (config: ResizeConfig, onProgress?: (p: number) => void): Promise<{ url: string, ext: string } | null> => {
        if (!file) return null;

        const transform = getTransform(config.label);
        let url = '';

        if (file.type.startsWith('video/')) {
            url = await processVideo(
                file,
                config.width,
                config.height,
                bgColor,
                transform.scale,
                transform.x,
                transform.y,
                onProgress
            );
        } else {
            // Image processing is sync usually or very fast, but could add progress if needed
            url = await processImage(
                file,
                config.width,
                config.height,
                bgColor,
                transform.scale,
                transform.x,
                transform.y
            );
            if (onProgress) onProgress(1); // Immediate completion
        }

        const ext = file.type.startsWith('video/') ? 'mp4' : 'png';
        return { url, ext };
    };

    const handleDownload = async (config: ResizeConfig) => {
        if (!file) return;

        setProcessingStates(prev => ({ ...prev, [config.label]: true }));
        setProgress(prev => ({ ...prev, [config.label]: 0 }));

        try {
            const result = await generateUrl(config, (p) => {
                setProgress(prev => ({ ...prev, [config.label]: p }));
            });
            if (!result) throw new Error("Generation failed");

            // Extract format suffix (square, landscape, portrait)
            const suffix = config.label.split(' ')[0].toLowerCase();
            const finalName = `${customFilename || 'output'}.${suffix}.${result.ext}`;

            // Trigger download
            const link = document.createElement('a');
            link.href = result.url;
            link.download = finalName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Note: We don't revoke immediately to allow browser to handle the download,
            // but ideally we'd track these and cleanup. 
            // For this simple app, letting garbage collection handle distinct blob URLs is acceptable 
            // or we could use a timeout.
            setTimeout(() => URL.revokeObjectURL(result.url), 60000); // 1 min timeout

        } catch (error: any) {
            console.error(`Processing failed for ${config.label}:`, error);
            alert(`Failed to process ${config.label}: ${error.message}`);
        } finally {
            setProcessingStates(prev => ({ ...prev, [config.label]: false }));
        }
    };

    // Sequential "Download All" - Triggers individual downloads one by one
    const handleDownloadAll = async () => {
        if (!file) return;
        setIsGlobalProcessing(true);

        try {
            for (const config of RESIZE_CONFIGS) {
                // We await each download to ensure they don't fight for resources too much
                // and to give the browser time to initiate the download.
                await handleDownload(config);

                // Small buffer to ensure browser registers separate downloads
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        } catch (error: any) {
            console.error('Batch processing failed:', error);
            alert(`Batch download stopped: ${error.message}`);
        } finally {
            setIsGlobalProcessing(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 p-8">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header */}
                <header className="flex items-center gap-3 border-b border-slate-800 pb-6">
                    <div className="p-3 bg-blue-600 rounded-xl shadow-lg shadow-blue-900/20">
                        <Layers className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                            Hardik Resizes Your File
                        </h1>
                        <p className="text-slate-400">Automation created by Hardik Sethi, Intern, Astrotalk</p>
                    </div>
                </header>

                <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* Sidebar: Global Settings */}
                    <div className="lg:col-span-3 space-y-6">
                        <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 space-y-6 lg:sticky lg:top-8">
                            <section>
                                <h2 className="text-lg font-semibold mb-4 text-slate-200">1. Media</h2>
                                <UploadZone
                                    onFileSelect={handleFileSelect}
                                    isLoading={Object.values(processingStates).some(Boolean) || isGlobalProcessing}
                                />
                                {file && (
                                    <div className="mt-3 space-y-3">
                                        <div className="p-3 bg-slate-800 rounded-lg border border-slate-700 flex items-center justify-between">
                                            <span className="truncate text-sm text-slate-300 max-w-[150px]">{file.name}</span>
                                            <button
                                                onClick={() => setFile(null)}
                                                className="text-xs text-red-400 hover:text-red-300"
                                                disabled={isGlobalProcessing}
                                            >
                                                Remove
                                            </button>
                                        </div>

                                        {/* Custom Filename Input */}
                                        <div>
                                            <label className="text-xs font-medium text-slate-400 mb-1 block">Output Filename</label>
                                            <input
                                                type="text"
                                                value={customFilename}
                                                onChange={(e) => setCustomFilename(e.target.value)}
                                                placeholder="Enter filename"
                                                disabled={isGlobalProcessing || Object.values(processingStates).some(Boolean)}
                                                className="w-full bg-slate-800 border-slate-600 rounded-md py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                            />
                                        </div>
                                    </div>
                                )}
                            </section>

                            <hr className="border-slate-700" />

                            <section>
                                <h2 className="text-lg font-semibold mb-4 text-slate-200">2. Background</h2>
                                <ColorPicker
                                    color={bgColor}
                                    onChange={setBgColor}
                                    disabled={Object.values(processingStates).some(Boolean) || isGlobalProcessing}
                                />
                            </section>
                        </div>
                    </div>

                    {/* Main Area: Interactive Cards */}
                    <div className="lg:col-span-9 space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-semibold text-slate-200">3. Edit & Export</h2>
                            {file && (
                                <button
                                    onClick={handleDownloadAll}
                                    disabled={isGlobalProcessing || Object.values(processingStates).some(Boolean)}
                                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg font-medium transition-all shadow-lg shadow-emerald-900/20 active:scale-[0.98] text-sm"
                                >
                                    {isGlobalProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <LayoutTemplate className="w-4 h-4" />}
                                    Download All
                                </button>
                            )}
                        </div>

                        {file ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {RESIZE_CONFIGS.map((config) => {
                                    const transform = getTransform(config.label);
                                    const isProcessing = processingStates[config.label];
                                    const currentProgress = progress[config.label] || 0;

                                    return (
                                        <div key={config.label} className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden flex flex-col shadow-xl">
                                            {/* Card Header */}
                                            <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-8 bg-blue-500 rounded-full"></div>
                                                    <div>
                                                        <h3 className="font-semibold text-slate-200">{config.label}</h3>
                                                        <p className="text-xs text-slate-400">{config.width} x {config.height}</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => updateTransform(config.label, { scale: 1, x: 0, y: 0 })}
                                                    className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors"
                                                    title="Reset transform"
                                                >
                                                    <RefreshCcw className="w-4 h-4" />
                                                </button>
                                            </div>

                                            {/* Preview Area */}
                                            <div className="p-4 flex-1 bg-slate-900/50 flex flex-col items-center justify-center min-h-[300px]">
                                                <div className="w-full max-w-[280px]">
                                                    <MediaPreview
                                                        file={file}
                                                        transform={transform}
                                                        onTransformChange={(t) => updateTransform(config.label, t)}
                                                        backgroundColor={bgColor}
                                                        aspectRatio={config.width / config.height}
                                                    />
                                                </div>
                                            </div>

                                            {/* Footer / Controls */}
                                            <div className="p-4 border-t border-slate-700 bg-slate-800/50 space-y-3">
                                                <div className="flex justify-between text-xs text-slate-500 font-mono">
                                                    <span>Scale: {transform.scale.toFixed(2)}x</span>
                                                    <span>Pan: {transform.x.toFixed(2)}, {transform.y.toFixed(2)}</span>
                                                </div>

                                                <div className="relative w-full">
                                                    <button
                                                        onClick={() => handleDownload(config)}
                                                        disabled={isProcessing || isGlobalProcessing}
                                                        className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 active:scale-[0.98] relative overflow-hidden z-10"
                                                    >
                                                        {isProcessing ? (
                                                            <>
                                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                                <span>{currentProgress > 0 ? `${Math.round(currentProgress * 100)}%` : 'Processing...'}</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Download className="w-5 h-5" />
                                                                <span>Download</span>
                                                            </>
                                                        )}
                                                    </button>

                                                    {isProcessing && currentProgress > 0 && (
                                                        <div
                                                            className="absolute bottom-0 left-0 h-1 bg-green-500 transition-all duration-300 z-20"
                                                            style={{ width: `${Math.min(100, currentProgress * 100)}%` }}
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="h-96 border-2 border-dashed border-slate-700 rounded-3xl flex flex-col items-center justify-center text-slate-500 bg-slate-800/20 gap-4">
                                <div className="p-4 bg-slate-800 rounded-full">
                                    <Layers className="w-8 h-8 opacity-50" />
                                </div>
                                <div className="text-center">
                                    <h3 className="text-lg font-medium text-slate-300">No Media Selected</h3>
                                    <p className="text-sm">Upload a photo or video to start editing</p>
                                </div>
                            </div>
                        )}
                    </div>

                </main>
            </div>
        </div>
    );
}

export default App;

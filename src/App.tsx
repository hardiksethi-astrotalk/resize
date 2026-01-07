import { useState } from 'react';
import { UploadZone } from './components/UploadZone';
import { ColorPicker } from './components/ColorPicker';
import { ResultCard } from './components/ResultCard';
import { RESIZE_CONFIGS, ProcessedMedia } from './utils/types';
import { processImage } from './utils/imageProcessor';
import { processVideo } from './utils/videoProcessor';
import { Layers } from 'lucide-react';

function App() {
    const [file, setFile] = useState<File | null>(null);
    const [bgColor, setBgColor] = useState('#000000');
    const [isProcessing, setIsProcessing] = useState(false);
    const [results, setResults] = useState<Record<string, ProcessedMedia>>({});

    const handleFileSelect = (selectedFile: File) => {
        setFile(selectedFile);
        setResults({}); // Clear previous results
    };

    const handleProcess = async () => {
        if (!file) return;

        setIsProcessing(true);
        setResults({});

        try {
            const isVideo = file.type.startsWith('video/');
            if (isVideo) {
                // Serialize video processing
                for (const config of RESIZE_CONFIGS) {
                    try {
                        const url = await processVideo(file, config.width, config.height, bgColor);
                        const res: ProcessedMedia = {
                            ...config,
                            url,
                            originalName: file.name,
                            type: 'video'
                        };
                        setResults(prev => ({ ...prev, [config.label]: res }));
                    } catch (error) {
                        console.error(`Error processing ${config.label}:`, error);
                    }
                }
            } else {
                // Parallel image processing is fine
                const promises = RESIZE_CONFIGS.map(async (config) => {
                    try {
                        const url = await processImage(file, config.width, config.height, bgColor);
                        return {
                            ...config,
                            url,
                            originalName: file.name,
                            type: 'image'
                        } as ProcessedMedia;
                    } catch (error) {
                        console.error(`Error processing ${config.label}:`, error);
                        return null;
                    }
                });

                const processedResults = await Promise.all(promises);
                const resultsMap: Record<string, ProcessedMedia> = {};
                processedResults.forEach((res) => {
                    if (res) resultsMap[res.label] = res;
                });
                setResults(resultsMap);
            }
        } catch (error: any) {
            console.error('Processing failed:', error);
            const msg = error instanceof Error ? error.message : 'Unknown error';
            alert(`Processing failed: ${msg}. Check console for details.`);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 p-8">
            <div className="max-w-6xl mx-auto space-y-8">

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

                <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left Column: Controls */}
                    <div className="space-y-6">
                        <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 space-y-6">
                            <section>
                                <h2 className="text-lg font-semibold mb-4 text-slate-200">1. Upload Media</h2>
                                <UploadZone
                                    onFileSelect={handleFileSelect}
                                    isLoading={isProcessing}
                                />
                                {file && (
                                    <div className="mt-3 p-3 bg-slate-800 rounded-lg border border-slate-700 flex items-center justify-between">
                                        <span className="truncate text-sm text-slate-300 max-w-[200px]">{file.name}</span>
                                        <button
                                            onClick={() => setFile(null)}
                                            className="text-xs text-red-400 hover:text-red-300"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                )}
                            </section>

                            <hr className="border-slate-700" />

                            <section>
                                <h2 className="text-lg font-semibold mb-4 text-slate-200">2. Background Style</h2>
                                <ColorPicker
                                    color={bgColor}
                                    onChange={setBgColor}
                                    disabled={isProcessing}
                                />
                            </section>

                            <button
                                onClick={handleProcess}
                                disabled={!file || isProcessing}
                                className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500 rounded-xl font-bold text-lg shadow-lg hover:shadow-blue-900/20 transition-all active:scale-[0.98]"
                            >
                                {isProcessing ? 'Processing...' : 'Generate Resizes'}
                            </button>
                        </div>
                    </div>

                    {/* Right Column: Results */}
                    <div className="lg:col-span-2 space-y-6">
                        <h2 className="text-xl font-semibold text-slate-200">3. Download Results</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-[calc(100%-3rem)]">
                            {RESIZE_CONFIGS.map((config) => (
                                <div key={config.label} className="min-h-[300px]">
                                    <ResultCard
                                        label={config.label}
                                        width={config.width}
                                        height={config.height}
                                        result={results[config.label]}
                                        isLoading={isProcessing}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                </main>
            </div>
        </div>
    );
}

export default App;

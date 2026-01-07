import React from 'react';
import { Download, Loader2 } from 'lucide-react';
import { ProcessedMedia } from '../utils/types';

interface ResultCardProps {
    result?: ProcessedMedia;
    isLoading?: boolean;
    label: string;
    width: number;
    height: number;
}

export const ResultCard: React.FC<ResultCardProps> = ({ result, isLoading, label, width, height }) => {
    const handleDownload = () => {
        if (!result) return;

        const link = document.createElement('a');
        link.href = result.url;
        link.download = `resized-${label.toLowerCase().replace(/\s+/g, '-')}-${result.originalName}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden flex flex-col h-full">
            <div className="p-4 border-b border-slate-700 bg-slate-900/50 flex justify-between items-center">
                <div>
                    <h3 className="font-semibold text-slate-100">{label}</h3>
                    <p className="text-xs text-slate-400">{width} x {height}</p>
                </div>

                <button
                    onClick={handleDownload}
                    disabled={!result || isLoading}
                    className="p-2 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg transition-colors text-white"
                    title="Download"
                >
                    <Download className="w-5 h-5" />
                </button>
            </div>

            <div className="flex-1 bg-slate-900/30 relative flex items-center justify-center p-4 min-h-[200px]">
                {isLoading ? (
                    <div className="flex flex-col items-center gap-3 text-slate-400">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                        <span className="text-sm">Processing...</span>
                    </div>
                ) : result ? (
                    <div className="relative w-full h-full flex items-center justify-center">
                        {result.type === 'video' ? (
                            <video
                                src={result.url}
                                controls
                                className="max-w-full max-h-[300px] shadow-lg rounded bg-black"
                            />
                        ) : (
                            <img
                                src={result.url}
                                alt={label}
                                className="max-w-full max-h-[300px] object-contain shadow-lg rounded"
                            />
                        )}
                    </div>
                ) : (
                    <div className="text-slate-600 text-sm">
                        Waiting for upload...
                    </div>
                )}
            </div>
        </div>
    );
};

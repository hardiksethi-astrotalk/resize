import React, { useCallback, useState } from 'react';
import { Upload, FileVideo, FileImage } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

interface UploadZoneProps {
    onFileSelect: (file: File) => void;
    isLoading?: boolean;
}

export const UploadZone: React.FC<UploadZoneProps> = ({ onFileSelect, isLoading }) => {
    const [isDragOver, setIsDragOver] = useState(false);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            onFileSelect(e.dataTransfer.files[0]);
        }
    }, [onFileSelect]);

    const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onFileSelect(e.target.files[0]);
        }
    }, [onFileSelect]);

    return (
        <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={twMerge(
                "relative w-full h-64 border-2 border-dashed rounded-xl transition-all duration-300 flex flex-col items-center justify-center cursor-pointer overflow-hidden group",
                isDragOver
                    ? "border-blue-500 bg-blue-500/10"
                    : "border-slate-700 hover:border-slate-500 hover:bg-slate-800/50",
                isLoading && "opacity-50 pointer-events-none"
            )}
        >
            <input
                type="file"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={handleFileInput}
                accept="image/*,video/*"
                disabled={isLoading}
            />

            <div className="flex flex-col items-center gap-4 p-6 text-center">
                <div className={twMerge(
                    "p-4 rounded-full bg-slate-800 transition-transform duration-300",
                    isDragOver ? "scale-110" : "group-hover:scale-105"
                )}>
                    {isDragOver ? (
                        <Upload className="w-8 h-8 text-blue-500" />
                    ) : (
                        <div className="flex gap-2">
                            <FileImage className="w-8 h-8 text-slate-400" />
                            <FileVideo className="w-8 h-8 text-slate-400" />
                        </div>
                    )}
                </div>

                <div>
                    <p className="text-lg font-medium text-slate-200">
                        {isDragOver ? "Drop file here" : "Click or drag file to upload"}
                    </p>
                    <p className="text-sm text-slate-400 mt-1">
                        Supports Images and Videos
                    </p>
                </div>
            </div>
        </div>
    );
};

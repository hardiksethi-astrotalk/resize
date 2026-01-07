import React from 'react';
import { twMerge } from 'tailwind-merge';

interface ColorPickerProps {
    color: string;
    onChange: (color: string) => void;
    disabled?: boolean;
}

const PRESETS = [
    '#000000', // Black
    '#FFFFFF', // White
    '#F43F5E', // Rose
    '#3B82F6', // Blue
    '#10B981', // Emerald
    '#F59E0B', // Amber
    '#8B5CF6', // Violet
];

export const ColorPicker: React.FC<ColorPickerProps> = ({ color, onChange, disabled }) => {
    return (
        <div className="flex flex-col gap-3">
            <label className="text-sm font-medium text-slate-400">Background Color</label>
            <div className="flex flex-wrap gap-3 items-center">
                {PRESETS.map((preset) => (
                    <button
                        key={preset}
                        onClick={() => onChange(preset)}
                        disabled={disabled}
                        className={twMerge(
                            "w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-blue-500",
                            color === preset ? "border-blue-500 scale-110" : "border-transparent"
                        )}
                        style={{ backgroundColor: preset }}
                        aria-label={`Select color ${preset}`}
                    />
                ))}

                <div className="h-8 w-px bg-slate-700 mx-2" />

                <div className="relative flex items-center gap-2">
                    <input
                        type="color"
                        value={color}
                        onChange={(e) => onChange(e.target.value)}
                        disabled={disabled}
                        className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0"
                    />
                    <span className="text-sm font-mono text-slate-400 uppercase">{color}</span>
                </div>
            </div>
        </div>
    );
};

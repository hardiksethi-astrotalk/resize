export type MediaType = 'image' | 'video';

export interface ProcessedMedia {
    url: string;
    width: number;
    height: number;
    label: string;
    originalName: string;
    type: MediaType;
}

export interface ResizeConfig {
    width: number;
    height: number;
    label: string;
}

export const RESIZE_CONFIGS: ResizeConfig[] = [
    { width: 1000, height: 1000, label: 'Square (1:1)' },
    { width: 1920, height: 1080, label: 'Landscape (16:9)' },
    { width: 1080, height: 1920, label: 'Portrait (9:16)' },
];

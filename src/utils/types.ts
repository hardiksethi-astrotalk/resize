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
    { width: 1200, height: 1200, label: 'Square Size (1:1)' },
    { width: 2133, height: 1200, label: 'Landscape Size (16:9)' },
    { width: 1200, height: 2133, label: 'Portrait Size (9:16)' },
];

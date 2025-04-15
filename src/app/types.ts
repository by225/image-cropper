// app/types.ts

import { UseToastOptions } from '@chakra-ui/react';

export interface CropSettings {
  x: number;
  y: number;
  width: number;
  height: number;
  aspectRatio: number;
}

// url and objectUrl both point to the same resource initially
// url is preserved for history while objectUrl is used for cleanup
export interface ImageData {
  id: string;
  file: File;
  url: string;
  objectUrl: string;
  cropped: boolean;
  cropHistory: {
    x: number;
    y: number;
    width: number;
    height: number;
  }[];
  cropSettings?: CropSettings;
}

// Type definition for the modern File System Access API
export type ShowSaveFilePicker = (options: {
  suggestedName?: string;
  types?: Array<{
    description: string;
    accept: Record<string, string[]>;
  }>;
}) => Promise<{
  createWritable: () => Promise<{
    write: (blob: Blob) => Promise<void>;
    close: () => Promise<void>;
  }>;
}>;

export type ToastMessage = UseToastOptions & {
  status: 'warning' | 'error' | 'success' | 'info';
  title: string;
  description: string;
};

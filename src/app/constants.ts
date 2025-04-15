// app/constants.ts

export const TEXT = {
  TITLE: 'Image Cropper',
  THEME: {
    LIGHT: 'Light Mode',
    DARK: 'Dark Mode'
  },
  CROP_MEMORY: {
    LABEL: 'Remember Crop Rectangle:',
    OPTIONS: {
      PER_IMAGE: 'Per Image',
      GLOBAL: 'Global'
    }
  },
  UPLOAD: {
    PROMPT: 'Click here to upload or drop images anywhere (max 10)'
  },
  CROP_HISTORY: {
    TITLE: 'Crop History',
    UNITS: '(in pixels)',
    EMPTY: 'No crops yet',
    COLUMNS: {
      X: 'X',
      Y: 'Y',
      WIDTH: 'Width',
      HEIGHT: 'Height'
    }
  },
  BUTTONS: {
    CROP: 'Crop',
    CANCEL: 'Cancel',
    CROP_DOWNLOAD: 'Crop & Download'
  },
  MODAL: {
    TITLE: 'Crop Image',
    ORIGINAL_LABEL: 'Original:',
    ASPECT_RATIO_LABEL: 'Aspect Ratio:',
    ASPECT_RATIOS: {
      FREE: {
        VALUE: 'free',
        LABEL: 'Free-form'
      },
      ORIGINAL: {
        VALUE: 'original',
        LABEL: 'Original'
      },
      SQUARE: {
        VALUE: '1:1',
        LABEL: '1:1'
      }
    },
    SAVE_ON_CANCEL: 'Save on Cancel'
  },
  TOASTS: {
    LIMIT: {
      TITLE: 'Images ignored',
      DESC: {
        AT_LIMIT: (count: number) =>
          `${count} ${count === 1 ? 'image' : 'images'} ignored because of limit`,
        PARTIAL: (added: number, ignored: number) =>
          `${added === 1 ? 'First image' : `First ${added} images`} added, ${ignored} ${ignored === 1 ? 'image was' : 'images were'} ignored due to limit.`
      }
    },
    DUPLICATES: {
      TITLE: 'Duplicates detected',
      DESC: (count: number) =>
        `${count} duplicate ${count === 1 ? 'file was' : 'files were'} ignored`
    },
    INVALID_TYPE: {
      TITLE: 'Invalid files',
      DESC: (count: number) =>
        `${count} ${count === 1 ? 'file' : 'files'} ignored (only ${Object.values(ACCEPTED_TYPES).flat().join(', ')} files are accepted)`
    },
    FILE_SIZE: {
      TITLE: 'File too large',
      DESC: (filename: string) => `${filename} exceeds maximum size of 10MB`
    },
    MIME_MISMATCH: {
      TITLE: 'Mismatched file type',
      DESC: (filename: string, mimeType: string) =>
        `${filename}: File extension doesn't match its content type (${mimeType})`
    },
    INVALID_IMAGES: {
      TITLE: 'Invalid images',
      DESC: (count: number) =>
        `${count} ${count === 1 ? 'image was' : 'images were'} invalid or corrupted`
    },
    LOAD_ERROR: {
      TITLE: 'Error',
      DESC: 'Failed to load image'
    }
  },
  OVERLAY: {
    PROCESSING: 'Processing images...'
  }
};

export const ACCEPTED_TYPES: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp']
};

export const TIMING = {
  DEBOUNCE: 50,
  FADE_OUT: 200,
  TOAST_DELAY: 300,
  TRANSITION: '0.2s'
};

export const MAX_FILE_SIZE = 10 * 1024 * 1024;

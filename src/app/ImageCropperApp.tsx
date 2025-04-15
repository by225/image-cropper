// app/ImageCropperApp.tsx

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
// prettier-ignore
import { Box, Flex, useDisclosure, VStack, Text, Select, useToast,
  Switch, FormControl, FormLabel, useColorMode, Spinner
} from '@chakra-ui/react';
import { ReactCropperElement } from 'react-cropper';
import { CropSettings, ImageData, ToastMessage, ShowSaveFilePicker } from './types';
import { TEXT, ACCEPTED_TYPES, TIMING, MAX_FILE_SIZE } from './constants';
import { ImageGrid } from './ImageGrid';
import { CropModal } from './CropModal';

export const ImageCropperApp: React.FC = () => {
  const [images, setImages] = useState<ImageData[]>([]);
  const [currentImage, setCurrentImage] = useState<ImageData | null>(null);
  const [activeCropSettings, setActiveCropSettings] = useState<CropSettings>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    aspectRatio: 0
  });
  const [globalCropSettings, setGlobalCropSettings] = useState<CropSettings | null>(null);
  const [isPerImageCrop, setIsPerImageCrop] = useState(true);
  const [originalDimensions, setOriginalDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedAspectRatio, setSelectedAspectRatio] = useState(
    TEXT.MODAL.ASPECT_RATIOS.FREE.VALUE
  );
  const [saveOnCancel, setSaveOnCancel] = useState(false);
  const [initialCropSettings, setInitialCropSettings] = useState<CropSettings | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cropperRef = useRef<ReactCropperElement>(null);
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const objectUrlsToCleanup = useRef<string[]>([]);
  const { colorMode, toggleColorMode } = useColorMode();

  const toast = useToast({
    position: 'bottom',
    duration: 6000,
    isClosable: true,
    variant: 'solid',
    status: 'warning'
  });

  const createToastMessage = useCallback(
    (
      type:
        | 'limit'
        | 'duplicate'
        | 'invalid-type'
        | 'file-size'
        | 'mime-mismatch'
        | 'invalid-image'
        | 'load-error',
      params?: {
        count?: number;
        filename?: string;
        mimeType?: string;
        added?: number;
        ignored?: number;
      },
      immediate = false
    ): ToastMessage => {
      const message: ToastMessage = {
        position: 'bottom',
        duration: 6000,
        isClosable: true,
        variant: 'solid',
        status: 'warning',
        title: '',
        description: ''
      };

      switch (type) {
        case 'limit':
          message.title = TEXT.TOASTS.LIMIT.TITLE;
          if (params?.ignored === undefined) {
            message.description = TEXT.TOASTS.LIMIT.DESC.AT_LIMIT(params?.count || 0);
          } else {
            message.description = TEXT.TOASTS.LIMIT.DESC.PARTIAL(params.added || 0, params.ignored);
          }
          break;

        case 'duplicate':
          message.title = TEXT.TOASTS.DUPLICATES.TITLE;
          message.description = TEXT.TOASTS.DUPLICATES.DESC(params?.count || 0);
          break;

        case 'invalid-type':
          message.title = TEXT.TOASTS.INVALID_TYPE.TITLE;
          message.description = TEXT.TOASTS.INVALID_TYPE.DESC(params?.count || 0);
          break;

        case 'file-size':
          message.title = TEXT.TOASTS.FILE_SIZE.TITLE;
          message.description = TEXT.TOASTS.FILE_SIZE.DESC(params?.filename || '');
          break;

        case 'mime-mismatch':
          message.title = TEXT.TOASTS.MIME_MISMATCH.TITLE;
          message.description = TEXT.TOASTS.MIME_MISMATCH.DESC(
            params?.filename || '',
            params?.mimeType || ''
          );
          break;

        case 'invalid-image':
          message.status = 'error';
          message.title = TEXT.TOASTS.INVALID_IMAGES.TITLE;
          message.description = TEXT.TOASTS.INVALID_IMAGES.DESC(params?.count || 0);
          break;

        case 'load-error':
          message.status = 'error';
          message.title = TEXT.TOASTS.LOAD_ERROR.TITLE;
          message.description = TEXT.TOASTS.LOAD_ERROR.DESC;
          break;
      }

      if (immediate) {
        toast(message);
      }

      return message;
    },
    [toast]
  );

  const existingFilenames = useMemo(() => new Set(images.map((img) => img.file.name)), [images]);

  const addUrlForCleanup = (url: string) => {
    objectUrlsToCleanup.current.push(url);
  };

  const removeUrlFromCleanup = (url: string) => {
    objectUrlsToCleanup.current = objectUrlsToCleanup.current.filter((u) => u !== url);
  };

  const validateImage = useCallback((file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      try {
        const img = new window.Image();
        const objectUrl = URL.createObjectURL(file);
        addUrlForCleanup(objectUrl);
        const timeout = setTimeout(() => {
          URL.revokeObjectURL(objectUrl);
          removeUrlFromCleanup(objectUrl);
          resolve(false);
        }, 10000);

        img.onload = () => {
          clearTimeout(timeout);
          URL.revokeObjectURL(objectUrl);
          removeUrlFromCleanup(objectUrl);
          // Check for valid dimensions
          if (
            img.width === 0 ||
            img.height === 0 ||
            img.width > 16384 ||
            img.height > 16384 ||
            img.width < 16 ||
            img.height < 16
          ) {
            resolve(false);
            return;
          }

          // Test image integrity by attempting to draw and read a 1x1 sample
          try {
            const canvas = document.createElement('canvas');
            canvas.width = Math.min(img.width, 1);
            canvas.height = Math.min(img.height, 1);
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve(false);
              return;
            }

            ctx.drawImage(img, 0, 0, 1, 1);
            ctx.getImageData(0, 0, 1, 1);

            resolve(true);
          } catch (error) {
            console.error('Image validation failed:', error);
            resolve(false);
          }
        };

        img.onerror = () => {
          clearTimeout(timeout);
          URL.revokeObjectURL(objectUrl);
          removeUrlFromCleanup(objectUrl);
          resolve(false);
        };

        img.src = objectUrl;
      } catch (error) {
        console.warn('Image validation failed:', error);
        resolve(false);
      }
    });
  }, []);

  const processFiles = useCallback(
    (files: File[]) => {
      if (isProcessing) return;
      if (files.length === 0) return;

      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
        processingTimeoutRef.current = null;
      }

      toast.closeAll();
      setIsProcessing(true);

      processingTimeoutRef.current = setTimeout(async () => {
        const messages: Array<{
          title: string;
          description: string;
          status: 'warning' | 'success' | 'error' | 'info';
        }> = [];

        // Check limit first
        const remainingSlots = Math.max(0, 10 - images.length);
        if (remainingSlots === 0) {
          messages.push(createToastMessage('limit', { count: files.length }));
          setTimeout(() => setIsProcessing(false), TIMING.FADE_OUT);
          setTimeout(() => messages.forEach((msg) => toast(msg)), TIMING.TOAST_DELAY);
          return;
        }

        // Filter out non-image files by size & MIME type
        const imageFiles = files.filter((f) => {
          if (!Object.keys(ACCEPTED_TYPES).includes(f.type)) return false;

          if (f.size > MAX_FILE_SIZE) {
            messages.push(createToastMessage('file-size', { filename: f.name }));
            return false;
          }

          const extension = getFileExtension(f.name);
          const acceptedExtensions = ACCEPTED_TYPES[f.type];
          if (!acceptedExtensions.includes(`.${extension}`)) {
            messages.push(
              createToastMessage('mime-mismatch', { filename: f.name, mimeType: f.type })
            );
            return false;
          }

          return true;
        });
        const invalidTypeCount = files.length - imageFiles.length;

        if (invalidTypeCount > 0) {
          messages.push(createToastMessage('invalid-type', { count: invalidTypeCount }));
          if (imageFiles.length === 0) {
            setTimeout(() => setIsProcessing(false), TIMING.FADE_OUT);
            setTimeout(() => messages.forEach((msg) => toast(msg)), TIMING.TOAST_DELAY);
            return;
          }
        }

        // Filter duplicates
        const nonDuplicateFiles = imageFiles.filter((file) => !existingFilenames.has(file.name));
        const duplicateCount = imageFiles.length - nonDuplicateFiles.length;

        if (duplicateCount > 0) {
          messages.push(createToastMessage('duplicate', { count: duplicateCount }));
          if (nonDuplicateFiles.length === 0) {
            setTimeout(() => setIsProcessing(false), TIMING.FADE_OUT);
            setTimeout(() => messages.forEach((msg) => toast(msg)), TIMING.TOAST_DELAY);
            return;
          }
        }

        // Process files: validate images, create object URLs, and update state
        const filesToProcess = nonDuplicateFiles.slice(0, remainingSlots);
        const ignoredDueToLimit = Math.max(0, nonDuplicateFiles.length - remainingSlots);
        let invalidImageCount = 0;

        if (filesToProcess.length === 0) {
          if (ignoredDueToLimit > 0) {
            messages.push(
              createToastMessage('limit', {
                added: filesToProcess.length,
                ignored: ignoredDueToLimit
              })
            );
          }
          setTimeout(() => setIsProcessing(false), TIMING.FADE_OUT);
          setTimeout(() => messages.forEach((msg) => toast(msg)), TIMING.TOAST_DELAY);
          return;
        }

        for (const file of filesToProcess) {
          try {
            const isValid = await validateImage(file);
            if (isValid) {
              const objectUrl = URL.createObjectURL(file);
              addUrlForCleanup(objectUrl);
              const newImage = {
                id: `${file.name}-${Date.now()}`,
                file,
                url: objectUrl,
                objectUrl: objectUrl,
                cropped: false,
                cropHistory: []
              };
              setImages((prev) => [...prev, newImage]);
            } else {
              invalidImageCount++;
            }
          } catch (error) {
            console.error('Error processing image:', error);
            invalidImageCount++;
          }
        }

        if (invalidImageCount > 0) {
          messages.push(createToastMessage('invalid-image', { count: invalidImageCount }));
        }

        if (ignoredDueToLimit > 0) {
          messages.push(
            createToastMessage('limit', {
              added: filesToProcess.length - invalidImageCount,
              ignored: ignoredDueToLimit
            })
          );
        }

        setTimeout(() => setIsProcessing(false), TIMING.FADE_OUT);
        setTimeout(() => messages.forEach((msg) => toast(msg)), TIMING.TOAST_DELAY);
      }, TIMING.DEBOUNCE);
    },
    [images, toast, isProcessing, validateImage, existingFilenames, createToastMessage]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const files = Array.from(e.dataTransfer.files);
      processFiles(files);
    },
    [processFiles]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    processFiles(files);
  };

  // Opens crop modal with settings based on mode:
  // Per-Image: image settings -> default
  // Global: global -> image -> default
  const openCropModal = (image: ImageData) => {
    setCurrentImage(image);
    const img = new window.Image();

    const cleanup = () => {
      img.onload = null;
      img.onerror = null;
    };

    img.onerror = (event) => {
      console.error('Image load error details:', {
        event,
        imageUrl: image.url,
        imageState: image
      });
      cleanup();
      createToastMessage('load-error', undefined, true);
      onClose();
    };

    img.onload = () => {
      const dimensions = { width: img.width, height: img.height };

      setOriginalDimensions(dimensions);

      // Default centered 50% crop
      const defaultSettings: CropSettings = {
        width: dimensions.width / 2,
        height: dimensions.height / 2,
        x: dimensions.width / 4,
        y: dimensions.height / 4,
        aspectRatio: 0
      };

      const initialSettings = isPerImageCrop
        ? image.cropSettings || defaultSettings
        : globalCropSettings || image.cropSettings || defaultSettings;

      setInitialCropSettings(initialSettings);

      setActiveCropSettings(initialSettings);

      const initialAspectRatio = getSelectionFromAspectRatio(
        initialSettings.aspectRatio,
        dimensions
      );
      setSelectedAspectRatio(initialAspectRatio);

      cleanup();
      onOpen();
    };

    img.src = image.url;
  };

  const handleCropperReady = () => {
    const cropper = cropperRef.current?.cropper;
    if (cropper && currentImage && initialCropSettings) {
      setTimeout(() => {
        cropper.setData({
          x: initialCropSettings.x,
          y: initialCropSettings.y,
          width: initialCropSettings.width,
          height: initialCropSettings.height
        });
      }, 0);
    }
  };

  // Handles crop & save operation using modern File System API if available
  const handleCrop = async () => {
    const cropper = cropperRef.current?.cropper;
    if (cropper && currentImage) {
      const canvas = cropper.getCroppedCanvas();
      let blob: Blob | null = null;
      try {
        blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve));
        if (!blob) return;

        const croppedFile = new File([blob], `cropped-${currentImage.file.name}`, {
          type: blob.type
        });
        const data = cropper.getData();

        const newCropSettings: CropSettings = {
          x: data.x,
          y: data.y,
          width: data.width,
          height: data.height,
          aspectRatio: activeCropSettings.aspectRatio
        };

        try {
          const showSaveFilePicker = (window as any).showSaveFilePicker as
            | ShowSaveFilePicker
            | undefined;

          if (showSaveFilePicker) {
            // Create temporary object URL for File System API save
            const saveUrl = URL.createObjectURL(croppedFile);
            addUrlForCleanup(saveUrl);

            // Preserve original image while updating crop-related properties
            setImages((prev) =>
              prev.map((img) =>
                img.id === currentImage.id
                  ? {
                      ...img,
                      cropped: true,
                      cropSettings: newCropSettings,
                      cropHistory: [
                        ...img.cropHistory,
                        {
                          x: Math.round(data.x),
                          y: Math.round(data.y),
                          width: Math.round(data.width),
                          height: Math.round(data.height)
                        }
                      ]
                    }
                  : img
              )
            );

            setGlobalCropSettings(newCropSettings);

            URL.revokeObjectURL(saveUrl);
            removeUrlFromCleanup(saveUrl);
            onClose();
          } else {
            // Create temporary object URL and link for fallback browser download
            const downloadUrl = URL.createObjectURL(croppedFile);
            addUrlForCleanup(downloadUrl);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = croppedFile.name;
            link.click();

            // Preserve original image while updating crop-related properties
            setImages((prev) =>
              prev.map((img) =>
                img.id === currentImage.id
                  ? {
                      ...img,
                      cropped: true,
                      cropSettings: newCropSettings,
                      cropHistory: [
                        ...img.cropHistory,
                        {
                          x: Math.round(data.x),
                          y: Math.round(data.y),
                          width: Math.round(data.width),
                          height: Math.round(data.height)
                        }
                      ]
                    }
                  : img
              )
            );

            setGlobalCropSettings(newCropSettings);

            URL.revokeObjectURL(downloadUrl);
            removeUrlFromCleanup(downloadUrl);
            onClose();
          }
        } catch (err) {
          console.error('Error or cancel occurred:', err);
          // Save crop settings without updating history on error or cancel
          setGlobalCropSettings(newCropSettings);
          setImages((prev) =>
            prev.map((img) =>
              img.id === currentImage.id
                ? {
                    ...img,
                    cropSettings: newCropSettings
                  }
                : img
            )
          );
          onClose();
          return;
        }
      } finally {
        if (canvas) {
          canvas.width = 0;
          canvas.height = 0;
        }
        blob = null;
      }
    }
  };

  // Preserves current crop settings without saving the cropped image
  const handleCancel = () => {
    setIsClosing(true);
    const cropper = cropperRef.current?.cropper;
    if (cropper && currentImage && initialCropSettings) {
      const currentData = cropper.getData();

      const aspectRatio = saveOnCancel
        ? getAspectRatioFromSelection(selectedAspectRatio)
        : getAspectRatioFromSelection('free');

      const newCropSettings: CropSettings = saveOnCancel
        ? {
            x: currentData.x,
            y: currentData.y,
            width: currentData.width,
            height: currentData.height,
            aspectRatio
          }
        : {
            x: initialCropSettings.x,
            y: initialCropSettings.y,
            width: initialCropSettings.width,
            height: initialCropSettings.height,
            aspectRatio
          };

      // Always update the settings (either to current or initial)
      setGlobalCropSettings(newCropSettings);
      setImages((prev) =>
        prev.map((img) =>
          img.id === currentImage.id
            ? {
                ...img,
                cropSettings: newCropSettings
              }
            : img
        )
      );

      if (!saveOnCancel) {
        setSaveOnCancel(false);
        setSelectedAspectRatio('free');
      }

      cropper.destroy();
    }
    onClose();
  };

  const updateCropSettings = useCallback(
    (data: Cropper.Data) => {
      const newCropSettings: CropSettings = {
        x: data.x,
        y: data.y,
        width: data.width,
        height: data.height,
        aspectRatio: activeCropSettings.aspectRatio
      };

      setActiveCropSettings(newCropSettings);

      if (isPerImageCrop && currentImage) {
        setImages((prev) =>
          prev.map((img) =>
            img.id === currentImage.id ? { ...img, cropSettings: newCropSettings } : img
          )
        );
      } else {
        setGlobalCropSettings(newCropSettings);
      }
    },
    [activeCropSettings.aspectRatio, currentImage, isPerImageCrop]
  );

  // Converts aspect ratio selection to numeric value and updates cropper
  const handleAspectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedAspectRatio(value);

    const aspectRatio = getAspectRatioFromSelection(value);

    const cropper = cropperRef.current?.cropper;
    if (cropper) {
      const currentData = cropper.getData();
      cropper.setAspectRatio(aspectRatio);

      const newCropSettings: CropSettings = {
        x: currentData.x,
        y: currentData.y,
        width: currentData.width,
        height: aspectRatio ? currentData.width / aspectRatio : currentData.height,
        aspectRatio
      };

      cropper.setData({
        x: newCropSettings.x,
        y: newCropSettings.y,
        width: newCropSettings.width,
        height: newCropSettings.height
      });

      setActiveCropSettings(newCropSettings);

      if (isPerImageCrop && currentImage) {
        setImages((prev) =>
          prev.map((img) =>
            img.id === currentImage.id ? { ...img, cropSettings: newCropSettings } : img
          )
        );
      } else {
        setGlobalCropSettings(newCropSettings);
      }
    }
  };

  const getAspectRatioFromSelection = useCallback(
    (value: string): number => {
      switch (value) {
        case TEXT.MODAL.ASPECT_RATIOS.ORIGINAL.VALUE:
          return originalDimensions ? originalDimensions.width / originalDimensions.height : 0;
        case TEXT.MODAL.ASPECT_RATIOS.SQUARE.VALUE:
          return 1;
        default:
          return 0;
      }
    },
    [originalDimensions]
  );

  // Updates numeric crop settings and maintains aspect ratio if set
  const handleNumericChange = useCallback(
    (key: keyof CropSettings, value: string) => {
      const num = Math.max(0, Number(value));
      setActiveCropSettings((prev) => {
        const newCropSettings = { ...prev, [key]: num };
        const aspectRatio = getAspectRatioFromSelection(selectedAspectRatio);
        if (aspectRatio && (key === 'width' || key === 'height')) {
          const otherKey = key === 'width' ? 'height' : 'width';
          newCropSettings[otherKey] = num / aspectRatio;
        }
        const cropper = cropperRef.current?.cropper;
        if (cropper) {
          cropper.setData(newCropSettings);
        }
        return newCropSettings;
      });
    },
    [getAspectRatioFromSelection, selectedAspectRatio]
  );

  const handleDelete = (id: string) => {
    setImages((prev) => {
      const imageToDelete = prev.find((img) => img.id === id);
      if (imageToDelete?.url) {
        URL.revokeObjectURL(imageToDelete.url);
        removeUrlFromCleanup(imageToDelete.url);
      }
      return prev.filter((img) => img.id !== id);
    });
  };

  const handleFileInputClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handlePageClick = useCallback(() => {
    toast.closeAll();
  }, [toast]);

  const getSelectionFromAspectRatio = (
    ratio: number,
    originalDimensions: { width: number; height: number } | null
  ): string => {
    if (ratio === 1) {
      return TEXT.MODAL.ASPECT_RATIOS.SQUARE.VALUE;
    } else if (
      originalDimensions &&
      Math.abs(ratio - originalDimensions.width / originalDimensions.height) < 0.0001
    ) {
      return TEXT.MODAL.ASPECT_RATIOS.ORIGINAL.VALUE;
    }
    return TEXT.MODAL.ASPECT_RATIOS.FREE.VALUE;
  };

  const getFileExtension = (filename: string): string => {
    return filename.slice(((filename.lastIndexOf('.') - 1) >>> 0) + 2).toLowerCase();
  };

  const formatNumber = (num: number): string => {
    const rounded = Math.round(num);
    return rounded === 0 ? '0' : rounded.toString();
  };

  const handleXChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleNumericChange('x', e.target.value);
    },
    [handleNumericChange]
  );

  const handleYChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleNumericChange('y', e.target.value);
    },
    [handleNumericChange]
  );

  const handleWidthChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleNumericChange('width', e.target.value);
    },
    [handleNumericChange]
  );

  const handleHeightChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleNumericChange('height', e.target.value);
    },
    [handleNumericChange]
  );

  const handleCropMemoryChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setIsPerImageCrop(e.target.value === 'per-image');
  }, []);

  const handleCropEvent = useCallback(
    (e: Cropper.CropEvent) => {
      if (isClosing) {
        return;
      }
      updateCropSettings(e.detail);
    },
    [updateCropSettings, isClosing]
  );

  useEffect(() => {
    return () => {
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
        processingTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    try {
      const preventDefault = (e: Event) => e.preventDefault();
      window.addEventListener('dragover', preventDefault);
      window.addEventListener('drop', handleDrop as any);
      return () => {
        try {
          window.removeEventListener('dragover', preventDefault);
          window.removeEventListener('drop', handleDrop as any);
        } catch (error) {
          console.warn('Error removing event listeners:', error);
        }
      };
    } catch (error) {
      console.warn('Error setting up drag and drop:', error);
    }
  }, [handleDrop]);

  useEffect(() => {
    return () => {
      objectUrlsToCleanup.current.forEach((url) => {
        URL.revokeObjectURL(url);
      });
      objectUrlsToCleanup.current = [];
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
    }
  }, [isOpen]);

  return (
    <Box
      p={4}
      h="100vh"
      overflow="auto"
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      onClick={handlePageClick}
    >
      <VStack spacing={4} align="stretch" position="relative">
        <Flex gap={6} flexWrap="wrap" alignItems="center" justifyContent="flex-end" minH="32px">
          <Text
            fontSize="xl"
            fontWeight="bold"
            whiteSpace="nowrap"
            mr="auto"
            lineHeight="32px"
            h="32px"
            mt="-4px"
          >
            {TEXT.TITLE}
          </Text>
          <FormControl display="flex" alignItems="center" w="auto" minW="max-content" h="32px">
            <FormLabel htmlFor="theme-toggle" mb="0" whiteSpace="nowrap" lineHeight="32px" h="32px">
              {colorMode === 'light' ? TEXT.THEME.LIGHT : TEXT.THEME.DARK}
            </FormLabel>
            <Switch
              id="theme-toggle"
              isChecked={colorMode === 'light'}
              onChange={toggleColorMode}
            />
          </FormControl>
          <FormControl display="flex" alignItems="center" w="auto" minW="max-content" h="32px">
            <FormLabel htmlFor="crop-memory" mb="0" whiteSpace="nowrap" lineHeight="32px" h="32px">
              {TEXT.CROP_MEMORY.LABEL}
            </FormLabel>
            <Select
              id="crop-memory"
              size="sm"
              width="120px"
              value={isPerImageCrop ? 'per-image' : 'global'}
              onChange={handleCropMemoryChange}
              h="32px"
            >
              <option value="per-image">{TEXT.CROP_MEMORY.OPTIONS.PER_IMAGE}</option>
              <option value="global">{TEXT.CROP_MEMORY.OPTIONS.GLOBAL}</option>
            </Select>
          </FormControl>
        </Flex>
        <Box
          border="2px dashed"
          borderColor="gray.500"
          px={2}
          py={4}
          textAlign="center"
          cursor="pointer"
          _hover={{ borderColor: 'gray.400' }}
          onClick={handleFileInputClick}
        >
          <Text>{TEXT.UPLOAD.PROMPT}</Text>
        </Box>
        {isProcessing && (
          <Flex
            position="fixed"
            top={0}
            left={0}
            right={0}
            bottom={0}
            zIndex={9999}
            justify="center"
            align="center"
            gap={2}
            color={colorMode === 'light' ? 'blackAlpha.900' : 'whiteAlpha.900'}
            bg={colorMode === 'light' ? 'whiteAlpha.500' : 'blackAlpha.500'}
            transition={`opacity ${TIMING.TRANSITION} ease-in-out`}
            opacity={isProcessing ? 1 : 0}
          >
            <Flex
              bg={colorMode === 'light' ? 'whiteAlpha.900' : 'blackAlpha.900'}
              px={4}
              py={3}
              borderRadius="md"
              align="center"
              gap={2}
            >
              <Spinner size="md" />
              <Text fontWeight="bold">{TEXT.OVERLAY.PROCESSING}</Text>
            </Flex>
          </Flex>
        )}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          multiple
          hidden
        />
        <ImageGrid
          images={images}
          onCropClick={openCropModal}
          onDeleteClick={handleDelete}
          colorMode={colorMode}
        />
      </VStack>
      <CropModal
        isOpen={isOpen}
        onClose={onClose}
        currentImage={currentImage}
        activeCropSettings={activeCropSettings}
        originalDimensions={originalDimensions}
        selectedAspectRatio={selectedAspectRatio}
        saveOnCancel={saveOnCancel}
        onCrop={handleCrop}
        onCancel={handleCancel}
        onCropEvent={handleCropEvent}
        onCropperReady={handleCropperReady}
        onAspectChange={handleAspectChange}
        onSaveOnCancelChange={(e) => setSaveOnCancel(e.target.checked)}
        onXChange={handleXChange}
        onYChange={handleYChange}
        onWidthChange={handleWidthChange}
        onHeightChange={handleHeightChange}
        cropperRef={cropperRef}
        formatNumber={formatNumber}
      />
    </Box>
  );
};

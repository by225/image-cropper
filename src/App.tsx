import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  ChakraProvider, Box, Button, Flex, Grid, GridItem, Image, Modal, ModalOverlay,
  ModalContent, ModalBody, Text, IconButton, useDisclosure, Select, Input, VStack, HStack,
  useToast, extendTheme, ColorModeScript, Switch, FormControl, FormLabel, useColorMode,
  Popover, PopoverTrigger, PopoverContent, PopoverBody, PopoverArrow, Spinner
} from '@chakra-ui/react';
import { DeleteIcon, InfoIcon } from '@chakra-ui/icons';
import Cropper, { ReactCropperElement } from 'react-cropper';
import 'cropperjs/dist/cropper.css';

const theme = extendTheme({
  config: { 
    initialColorMode: "dark", 
    useSystemColorMode: false 
  },
  components: {
    Alert: {
      variants: {
        solid: {
          container: {
            color: "#1A202C",
            bg: "#E5C16D",
            _light: {
              bg: "#E5C16D"
            },
            _dark: {
              bg: "#E5C16D"
            }
          },
          icon: {
            color: "#1A202C"
          }
        }
      }
    },
    Toast: {
      defaultProps: {
        variant: "solid",
        status: "warning"
      }
    }
  }
});

// Type definition for the modern File System Access API
type ShowSaveFilePicker = (options: {
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

interface ImageData {
  id: string;
  file: File;
  url: string;
  cropped: boolean;
  cropHistory: {
    x: number;
    y: number;
    width: number;
    height: number;
  }[];
  lastCropSettings?: CropSettings;
}

interface CropSettings {
  x: number;
  y: number;
  width: number;
  height: number;
  aspectRatio: number | null;
}

// String constants for the app
const TEXT = {
  TITLE: "Image Cropper",
  THEME: {
    LIGHT: "Light Mode",
    DARK: "Dark Mode"
  },
  CROP_MEMORY: {
    LABEL: "Remember Crop Rectangle:",
    OPTIONS: {
      PER_IMAGE: "Per Image",
      GLOBAL: "Global"
    }
  },
  UPLOAD: {
    PROMPT: "Click here to upload or drop images anywhere (max 10)"
  },
  CROP_HISTORY: {
    TITLE: "Crop History",
    UNITS: "(in pixels)",
    EMPTY: "No crops yet",
    COLUMNS: {
      X: "X",
      Y: "Y",
      WIDTH: "Width",
      HEIGHT: "Height"
    }
  },
  BUTTONS: {
    CROP: "Crop",
    CANCEL: "Cancel",
    CROP_DOWNLOAD: "Crop & Download"
  },
  MODAL: {
    TITLE: "Crop Image",
    ORIGINAL_LABEL: "Original:",
    ASPECT_RATIO_LABEL: "Aspect Ratio:",
  },
  TOASTS: {
    LIMIT: {
      TITLE: "Images ignored",
      DESC: {
        AT_LIMIT: (count: number) => 
          `${count} ${count === 1 ? 'image' : 'images'} ignored because of limit`,
        PARTIAL: (added: number, ignored: number) => 
          `${added === 1 ? "First image" : `First ${added} images`} added, ${ignored} ${ignored === 1 ? "image was" : "images were"} ignored due to limit.`
      }
    },
    DUPLICATES: {
      TITLE: "Duplicates detected",
      DESC: (count: number) => 
        `${count} duplicate ${count === 1 ? 'file was' : 'files were'} ignored`
    },
    INVALID_TYPE: {
      TITLE: "Invalid files",
      DESC: (count: number) =>
        `${count} ${count === 1 ? 'file' : 'files'} ignored (only ${Object.values(ACCEPTED_TYPES).flat().join(', ')} files are accepted)`
    }
  },
  OVERLAY: {
    PROCESSING: "Processing images..."
  }
};

const ACCEPTED_TYPES: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp']
};

const TIMING = {
  DEBOUNCE: 50,
  FADE_OUT: 200,
  TOAST_DELAY: 400,
  TRANSITION: "0.2s"
};

const AppContent: React.FC = () => {
  const [images, setImages] = useState<ImageData[]>([]);
  const [currentImage, setCurrentImage] = useState<ImageData | null>(null);
  const [cropSettings, setCropSettings] = useState<CropSettings>({ x: 0, y: 0, width: 0, height: 0, aspectRatio: null });
  const [isPerImageCrop, setIsPerImageCrop] = useState(true);
  const [lastCropSettings, setLastCropSettings] = useState<CropSettings | null>(null);
  const [originalDimensions, setOriginalDimensions] = useState<{ width: number; height: number } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const {isOpen, onOpen, onClose} = useDisclosure();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cropperRef = useRef<ReactCropperElement>(null);
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const {colorMode, toggleColorMode} = useColorMode();

  const toast = useToast({
    position: "bottom",
    duration: 6000,
    isClosable: true,
    variant: "solid",
    status: "warning"
  });

  const processFiles = useCallback((files: File[]) => {
    if (isProcessing) {
      return;
    }
  
    if (files.length === 0) {
      return;
    }
  
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
      processingTimeoutRef.current = null;
    }
  
    toast.closeAll();
  
    setIsProcessing(true);
  
    // Debounce the processing
    processingTimeoutRef.current = setTimeout(() => {
      
      // Collect messages to show after processing
      const messages: Array<{
        title: string;
        description: string;
        status: 'warning' | 'success' | 'error' | 'info';
      }> = [];
      
      // Check limit first
      const remainingSlots = Math.max(0, 10 - images.length);
      if (remainingSlots === 0) {
        messages.push({
          title: TEXT.TOASTS.LIMIT.TITLE,
          description: TEXT.TOASTS.LIMIT.DESC.AT_LIMIT(files.length),
          status: 'warning'
        });
        setTimeout(() => setIsProcessing(false), TIMING.FADE_OUT);
        setTimeout(() => messages.forEach(msg => toast(msg)), TIMING.TOAST_DELAY);
        return;
      }
  
      // Filter out non-image files
      const imageFiles = files.filter(f => Object.keys(ACCEPTED_TYPES).includes(f.type));
      const invalidTypeCount = files.length - imageFiles.length;
  
      if (invalidTypeCount > 0) {
        messages.push({
          title: TEXT.TOASTS.INVALID_TYPE.TITLE,
          description: TEXT.TOASTS.INVALID_TYPE.DESC(invalidTypeCount),
          status: 'warning'
        });
        if (imageFiles.length === 0) {
          setTimeout(() => setIsProcessing(false), TIMING.FADE_OUT);
          setTimeout(() => messages.forEach(msg => toast(msg)), TIMING.TOAST_DELAY);
          return;
        }
      }
  
      // Filter duplicates
      const existingFilenames = new Set(images.map(img => img.file.name));
      const nonDuplicateFiles = imageFiles.filter(file => !existingFilenames.has(file.name));
      const duplicateCount = imageFiles.length - nonDuplicateFiles.length;
  
      if (duplicateCount > 0) {
        messages.push({
          title: TEXT.TOASTS.DUPLICATES.TITLE,
          description: TEXT.TOASTS.DUPLICATES.DESC(duplicateCount),
          status: 'warning'
        });
        if (nonDuplicateFiles.length === 0) {
          setTimeout(() => setIsProcessing(false), TIMING.FADE_OUT);
          setTimeout(() => messages.forEach(msg => toast(msg)), TIMING.TOAST_DELAY);
          return;
        }
      }
  
      // Process files sequentially
      const filesToProcess = nonDuplicateFiles.slice(0, remainingSlots);
      const ignoredDueToLimit = Math.max(0, nonDuplicateFiles.length - remainingSlots);
  
      if (filesToProcess.length === 0) {
        if (ignoredDueToLimit > 0) {
          messages.push({
            title: TEXT.TOASTS.LIMIT.TITLE,
            description: TEXT.TOASTS.LIMIT.DESC.PARTIAL(filesToProcess.length, ignoredDueToLimit),
            status: 'warning'
          });
        }
        setTimeout(() => setIsProcessing(false), TIMING.FADE_OUT);
        setTimeout(() => messages.forEach(msg => toast(msg)), TIMING.TOAST_DELAY);
        return;
      }
  
      let processedCount = 0;
  
      const processNextFile = () => {
        if (processedCount >= filesToProcess.length) {
          if (ignoredDueToLimit > 0) {
            messages.push({
              title: TEXT.TOASTS.LIMIT.TITLE,
              description: TEXT.TOASTS.LIMIT.DESC.PARTIAL(filesToProcess.length, ignoredDueToLimit),
              status: 'warning'
            });
          }
          // Clear timeout ref and fade out processing state
          if (processingTimeoutRef.current) {
            clearTimeout(processingTimeoutRef.current);
            processingTimeoutRef.current = null;
          }
          setTimeout(() => setIsProcessing(false), TIMING.FADE_OUT);
          setTimeout(() => messages.forEach(msg => toast(msg)), TIMING.TOAST_DELAY);
          return;
        }
  
        const file = filesToProcess[processedCount];
        const newImage = {
          id: `${file.name}-${Date.now()}`,
          file,
          url: URL.createObjectURL(file),
          cropped: false,
          cropHistory: [],
        };
  
        setImages(prev => [...prev, newImage]);
        processedCount++;
        requestAnimationFrame(processNextFile);
      };
  
      processNextFile();
    }, TIMING.DEBOUNCE);
  }, [images, toast, isProcessing]);
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  }, [processFiles]);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    processFiles(files);
  };

  // Opens crop modal with settings based on mode:
  // Per-Image: image settings -> 50% default
  // Global: global -> image -> 50% default
  const openCropModal = (image: ImageData) => {
    setCurrentImage(image);
    const img = new window.Image();
    img.src = image.url;
    img.onload = () => {
      const dimensions = { width: img.width, height: img.height };
      setOriginalDimensions(dimensions);
      
      // Default centered 50% crop
      const defaultSettings = {
        width: dimensions.width / 2,
        height: dimensions.height / 2,
        x: dimensions.width / 4,
        y: dimensions.height / 4,
        aspectRatio: null
      };
      
      const newSettings = isPerImageCrop 
        ? (image.lastCropSettings || defaultSettings)
        : (lastCropSettings || image.lastCropSettings || defaultSettings);
      
      setCropSettings(newSettings);
      onOpen();
    };
  };
  
  // Applies crop settings after cropper initialization with a delay to ensure stability
  const handleCropperReady = () => {
    setTimeout(() => {
      const cropper = cropperRef.current?.cropper;
      if (cropper && originalDimensions) {
        cropper.setData(cropSettings);
        
        if (lastCropSettings?.aspectRatio) {
          cropper.setAspectRatio(lastCropSettings.aspectRatio);
        }
      }
    }, 100);
  };

  // Handles crop & save operation using modern File System API if available, falls back to download link
  const handleCrop = async () => {
    const cropper = cropperRef.current?.cropper;
    if (cropper && currentImage) {
      const canvas = cropper.getCroppedCanvas();
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve));
      if (!blob) return;
  
      // Create the file and capture crop settings before any async operations
      const croppedFile = new File([blob], `cropped-${currentImage.file.name}`, { type: blob.type });
      const data = cropper.getData();
      const newCropSettings = {...cropSettings};
  
      try {
        const showSaveFilePicker = (window as any).showSaveFilePicker as ShowSaveFilePicker | undefined;
        
        if (showSaveFilePicker) {
          // Modern API path - we can detect if save was successful
          const handle = await showSaveFilePicker({
            suggestedName: croppedFile.name,
            types: [{
              description: 'Image',
              accept: ACCEPTED_TYPES
            }]
          });
          
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
  
          // Update both settings and history after successful save
          setLastCropSettings(newCropSettings);  // Update global
          setImages(prev => prev.map(img =>
            img.id === currentImage.id
              ? { 
                  ...img, 
                  cropped: true,
                  lastCropSettings: newCropSettings,  // Update per-image
                  cropHistory: [...img.cropHistory, { 
                    x: Math.round(data.x),
                    y: Math.round(data.y),
                    width: Math.round(data.width),
                    height: Math.round(data.height)
                  }]
                }
              : img
          ));
          onClose();
        } else {
          // Legacy path - can't detect if save was successful
          const link = document.createElement("a");
          link.href = URL.createObjectURL(croppedFile);
          link.download = croppedFile.name;
          link.click();
          URL.revokeObjectURL(link.href);
  
          // Update both settings and history since we can't detect cancellation
          setLastCropSettings(newCropSettings);  // Update global
          setImages(prev => prev.map(img =>
            img.id === currentImage.id
              ? { 
                  ...img, 
                  cropped: true,
                  lastCropSettings: newCropSettings,  // Update per-image
                  cropHistory: [...img.cropHistory, { 
                    x: Math.round(data.x),
                    y: Math.round(data.y),
                    width: Math.round(data.width),
                    height: Math.round(data.height)
                  }]
                }
              : img
          ));
          onClose();
        }
      } catch (err) {
        console.error('Error or cancel occurred:', err);
        // Save crop settings without updating history on error or cancel
        setLastCropSettings(newCropSettings);  // Update global
        setImages(prev => prev.map(img =>
          img.id === currentImage.id
            ? { 
                ...img,
                lastCropSettings: newCropSettings  // Update per-image
              }
            : img
        ));
        onClose();
        return;
      }
    }
  };
  
  // Preserves current crop settings without saving the cropped image
  const handleCancel = () => {
    const cropper = cropperRef.current?.cropper;
    if (cropper && currentImage) {
      // Save the actual pixel values
      const data = cropper.getData();
      const newCropSettings = {
        x: data.x,
        y: data.y,
        width: data.width,
        height: data.height,
        aspectRatio: cropSettings.aspectRatio
      };
  
      // Always update both per-image and global settings
      setLastCropSettings(newCropSettings);  // Update global
      setImages(prev => prev.map(img =>
        img.id === currentImage.id
          ? { 
              ...img,
              lastCropSettings: newCropSettings  // Update per-image
            }
          : img
      ));
    }
    onClose();
  };

  // Updates crop settings when the user modifies the crop area
  const updateCropSettings = (data: Cropper.Data) => {
    const newSettings = {
      x: data.x,
      y: data.y,
      width: data.width,
      height: data.height,
      aspectRatio: cropSettings.aspectRatio,
    };
    setCropSettings(newSettings);
  };

  const handleDelete = (id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  // Updates aspect ratio and applies it to the cropper (original or 1:1)
  const handleAspectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    let aspectRatio: number | null = null;
    if (value === "original") {
      const img = new window.Image();
      img.src = currentImage!.url;
      aspectRatio = img.width / img.height;
    } else if (value === "1:1") {
      aspectRatio = 1;
    }
    setCropSettings(prev => ({ ...prev, aspectRatio }));
    const cropper = cropperRef.current?.cropper;
    if (cropper) {
      cropper.setAspectRatio(aspectRatio ?? NaN);
    }
  };

  // Updates numeric crop settings and maintains aspect ratio if set
  const handleNumericChange = (key: keyof CropSettings, value: string) => {
    const num = Math.max(0, Number(value));
    setCropSettings(prev => {
      const newSettings = { ...prev, [key]: num };
      if (prev.aspectRatio && (key === "width" || key === "height")) {
        const otherKey = key === "width" ? "height" : "width";
        newSettings[otherKey] = num / prev.aspectRatio;
      }
      const cropper = cropperRef.current?.cropper;
      if (cropper) {
        cropper.setData(newSettings);
      }
      return newSettings;
    });
  };

  const handlePageClick = useCallback(() => {
    toast.closeAll();
  }, [toast]);
  
  // Formats numbers for display, handling zero values specially
  const formatNumber = (num: number): string => {
    const rounded = Math.round(num);
    return rounded === 0 ? "0" : rounded.toString();
  };

  useEffect(() => {
    return () => {
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
        processingTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const preventDefault = (e: Event) => e.preventDefault();
    window.addEventListener("dragover", preventDefault);
    window.addEventListener("drop", handleDrop as any);
    return () => {
      window.removeEventListener("dragover", preventDefault);
      window.removeEventListener("drop", handleDrop as any);
    };
  }, [handleDrop]);

  return (
    <Box 
      p={4} 
      h="100vh" 
      overflow="auto" 
      onDrop={handleDrop} 
      onDragOver={e => e.preventDefault()} 
      onClick={handlePageClick}
    >
      <VStack spacing={4} align="stretch" position="relative">
        <Flex 
          gap={6} 
          flexWrap="wrap"
          alignItems="center"
          justifyContent="flex-end"
          minH="32px"
        >
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
          <FormControl 
            display="flex" 
            alignItems="center" 
            w="auto" 
            minW="max-content"
            h="32px"
          >
            <FormLabel 
              htmlFor="theme-toggle" 
              mb="0" 
              whiteSpace="nowrap"
              lineHeight="32px"
              h="32px"
            >
              {colorMode === "light" ? TEXT.THEME.LIGHT : TEXT.THEME.DARK}
            </FormLabel>
            <Switch
              id="theme-toggle"
              isChecked={colorMode === "light"}
              onChange={toggleColorMode}
            />
          </FormControl>
          <FormControl 
            display="flex" 
            alignItems="center" 
            w="auto" 
            minW="max-content"
            h="32px"
          >
            <FormLabel 
              htmlFor="crop-memory" 
              mb="0" 
              whiteSpace="nowrap"
              lineHeight="32px"
              h="32px"
            >
              {TEXT.CROP_MEMORY.LABEL}
            </FormLabel>
            <Select
              id="crop-memory"
              size="sm"
              width="120px"
              value={isPerImageCrop ? "per-image" : "global"}
              onChange={(e) => setIsPerImageCrop(e.target.value === "per-image")}
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
          _hover={{ borderColor: "gray.400" }}
          onClick={() => fileInputRef.current?.click()}
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
            color={colorMode === "light" ? "blackAlpha.900" : "whiteAlpha.900"}
            bg={colorMode === "light" ? "whiteAlpha.500" : "blackAlpha.500"}
            transition={`opacity ${TIMING.TRANSITION} ease-in-out`}
            opacity={isProcessing ? 1 : 0}
          >
            <Flex
              bg={colorMode === "light" ? "whiteAlpha.900" : "blackAlpha.900"}
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
        <Grid templateColumns="repeat(auto-fill, minmax(200px, 1fr))" gap={4}>
          {images.map(image => (
            <Box 
              key={image.id} 
              borderWidth="1px" 
              borderRadius="md" 
              p={2}
              position="relative"
              display="flex"
              flexDirection="column"
              height="200px"
            >
              <Box 
                position="relative" 
                flex="1"
                display="flex"
                alignItems="center"
                justifyContent="center"
                overflow="hidden"
                mb={0}
              >
                <Image 
                  src={image.url} 
                  maxH="150px" 
                  maxW="100%"
                  objectFit="contain"
                  width="auto"
                  height="auto"
                />
                <Popover
                  trigger="click"
                  placement="bottom-start"
                  closeOnBlur={true}
                  gutter={4}
                  strategy="fixed"
                >
                  <PopoverTrigger>
                    <IconButton
                      aria-label="Info"
                      icon={<InfoIcon boxSize={4} />}
                      bg={image.cropped ? "green.500" : "gray.600"}
                      color="white"
                      opacity={0.9}
                      boxShadow="0 0 4px rgba(0,0,0,0.3)"
                      _hover={{ bg: image.cropped ? "green.600" : "gray.700", opacity: 1 }}
                      _active={{ bg: image.cropped ? "green.700" : "gray.800" }}
                      height="28px"
                      width="28px"
                      minWidth="28px"
                      padding={0}
                      position="absolute"
                      top={0}
                      left={0}
                    />
                  </PopoverTrigger>
                  <PopoverContent
                    width="auto"
                    maxW="300px"
                    bg="gray.700"
                    borderColor="gray.600"
                    _dark={{
                      bg: "gray.700",
                      borderColor: "gray.600"
                    }}
                    py={1}
                    px={2}
                  >
                    <PopoverArrow bg="gray.700" />
                    <PopoverBody p={2}>
                      <VStack 
                        align="start" 
                        spacing={1}
                        minH="44px"
                      >
                        <HStack spacing={1} width="100%" justify="center">
                          <Text fontWeight="bold" fontSize="sm" color="white">
                            {TEXT.CROP_HISTORY.TITLE}
                          </Text>
                          {image.cropHistory.length > 0 && (
                            <Text fontSize="sm" color="gray.300">
                              {TEXT.CROP_HISTORY.UNITS}
                            </Text>
                          )}
                        </HStack>
                        {image.cropHistory.length === 0 ? (
                          <Text fontSize="sm" color="gray.300">
                            {TEXT.CROP_HISTORY.EMPTY}
                          </Text>
                        ) : (
                          <Box>
                            <Grid 
                              templateColumns="repeat(4, 1fr)"
                              gap={0}
                              fontSize="sm"
                              color="gray.300"
                            >
                              <GridItem 
                                p={1} 
                                borderBottom="1px" 
                                borderRight="1px" 
                                borderColor="gray.600"
                              >
                                <Text fontWeight="medium" textAlign="center">{TEXT.CROP_HISTORY.COLUMNS.X}</Text>
                              </GridItem>
                              <GridItem 
                                p={1} 
                                borderBottom="1px" 
                                borderRight="1px" 
                                borderColor="gray.600"
                              >
                                <Text fontWeight="medium" textAlign="center">{TEXT.CROP_HISTORY.COLUMNS.Y}</Text>
                              </GridItem>
                              <GridItem 
                                p={1} 
                                borderBottom="1px" 
                                borderRight="1px" 
                                borderColor="gray.600"
                              >
                                <Text fontWeight="medium" textAlign="center">{TEXT.CROP_HISTORY.COLUMNS.WIDTH}</Text>
                              </GridItem>
                              <GridItem 
                                p={1} 
                                borderBottom="1px" 
                                borderColor="gray.600"
                              >
                                <Text fontWeight="medium" textAlign="center">{TEXT.CROP_HISTORY.COLUMNS.HEIGHT}</Text>
                              </GridItem>
                              {/* Data Rows */}
                              {image.cropHistory.map((crop, i) => (
                                <React.Fragment key={i}>
                                  <GridItem 
                                    p={1} 
                                    borderRight="1px" 
                                    borderBottom={i < image.cropHistory.length - 1 ? "1px" : "0"} 
                                    borderColor="gray.600"
                                  >
                                    <Text textAlign="right">{crop.x}</Text>
                                  </GridItem>
                                  <GridItem 
                                    p={1} 
                                    borderRight="1px" 
                                    borderBottom={i < image.cropHistory.length - 1 ? "1px" : "0"} 
                                    borderColor="gray.600"
                                  >
                                    <Text textAlign="right">{crop.y}</Text>
                                  </GridItem>
                                  <GridItem 
                                    p={1} 
                                    borderRight="1px" 
                                    borderBottom={i < image.cropHistory.length - 1 ? "1px" : "0"} 
                                    borderColor="gray.600"
                                  >
                                    <Text textAlign="right">{crop.width}</Text>
                                  </GridItem>
                                  <GridItem 
                                    p={1} 
                                    borderBottom={i < image.cropHistory.length - 1 ? "1px" : "0"} 
                                    borderColor="gray.600"
                                  >
                                    <Text textAlign="right">{crop.height}</Text>
                                  </GridItem>
                                </React.Fragment>
                              ))}
                            </Grid>
                          </Box>
                        )}
                      </VStack>
                    </PopoverBody>
                  </PopoverContent>
                </Popover>
                <IconButton
                  aria-label="Delete"
                  icon={<DeleteIcon boxSize={3.5} />}
                  bg="red.500"
                  color="white"
                  opacity={0.9}
                  boxShadow="0 0 4px rgba(0,0,0,0.3)"
                  _hover={{ bg: 'red.600', opacity: 1 }}
                  height="28px"
                  width="28px"
                  minWidth="28px"
                  padding={0}
                  position="absolute"
                  top={0}
                  right={0}
                  onClick={() => handleDelete(image.id)}
                />
              </Box>
              <Button 
                mt={2} 
                w="full" 
                height="28px"
                minHeight="28px"
                maxHeight="28px"
                size="none"
                padding="0 16px"
                onClick={() => openCropModal(image)}
                bg={colorMode === "light" ? "#C9CCD2" : "gray.600"}
                _hover={{ bg: colorMode === "light" ? "#D4D9E0" : "gray.500" }}
                _active={{ bg: colorMode === "light" ? "#ABAFB6" : "gray.700" }}
              >
                {TEXT.BUTTONS.CROP}
              </Button>
            </Box>
          ))}
        </Grid>
      </VStack>
      <Modal isOpen={isOpen} onClose={onClose} size="xl" isCentered>
        <ModalOverlay />
        <ModalContent 
          maxH="100vh"
          my={0}
          display="flex" 
          flexDirection="column"
        >
          <ModalBody 
            display="flex" 
            flexDirection="column" 
            gap={3}
            px={6}
            py={6}
          >
            {currentImage && (
              <>
                <Cropper
                  src={currentImage.url}
                  style={{ height: 'min(50vh, 400px)', width: '100%' }}
                  initialAspectRatio={cropSettings.aspectRatio ?? NaN}
                  guides={true}
                  crop={e => updateCropSettings(e.detail)}
                  ready={handleCropperReady}
                  ref={cropperRef}
                  viewMode={1}
                  dragMode="move"
                  cropBoxMovable={true}
                  cropBoxResizable={true}
                  toggleDragModeOnDblclick={false}
                />
                <VStack spacing={2} w="full">
                  <Flex 
                    w="full" 
                    direction={{ base: 'column', md: 'row' }} 
                    gap={2} 
                    align={{ base: 'center', md: 'center' }}
                    justify={{ base: 'center', md: 'space-between' }}
                  >
                    <HStack 
                      spacing={12}
                      flex={{ base: '0 0 auto', md: 'none' }}
                      alignItems="baseline"
                    >
                      <Text fontWeight="bold" fontSize="md" lineHeight="32px" mt="-1px">
                        {TEXT.MODAL.TITLE}
                      </Text>
                      <FormControl display="flex" alignItems="center" w="auto">
                        <FormLabel fontSize="sm" lineHeight="32px" mb={0} mr={2} whiteSpace="nowrap">
                          {TEXT.MODAL.ORIGINAL_LABEL}
                        </FormLabel>
                        <Text fontSize="sm" lineHeight="32px">
                          {originalDimensions ? `${originalDimensions.width} x ${originalDimensions.height}px` : ""}
                        </Text>
                      </FormControl>
                    </HStack>
                    <FormControl 
                      w={{ base: 'auto', md: '200px' }}
                      display="flex" 
                      alignItems="center"
                      justifyContent={{ base: 'center', md: 'flex-start' }}
                    >
                      <FormLabel fontSize="sm" lineHeight="32px" mb={0} mr={2} whiteSpace="nowrap">
                        {TEXT.MODAL.ASPECT_RATIO_LABEL}
                      </FormLabel>
                      <Select
                        size="sm" 
                        value={cropSettings.aspectRatio === null ? 'free' : 'custom'} 
                        onChange={handleAspectChange}
                        h="32px"
                        w="120px"
                      >
                        <option value="free">Free-form</option>
                        <option value="original">Original</option>
                        <option value="1:1">1:1</option>
                      </Select>
                    </FormControl>
                  </Flex>
                  <Flex 
                    w="full" 
                    direction={{ base: 'column', sm: 'row' }}
                    gap={4} 
                    align={{ base: 'center', sm: 'center' }}
                  >
                    <HStack spacing={4} flex="1" justify={{ base: 'center', sm: 'flex-start' }}>
                      <FormControl display="flex" alignItems="center" w="auto">
                        <FormLabel fontSize="sm" lineHeight="32px" mb={0} mr={2} whiteSpace="nowrap">X:</FormLabel>
                        <Input
                          size="sm"
                          w="70px"
                          h="32px"
                          lineHeight="32px"
                          value={formatNumber(cropSettings.x)}
                          onChange={e => handleNumericChange('x', e.target.value)}
                          type="number"
                        />
                      </FormControl>
                      <FormControl display="flex" alignItems="center" w="auto">
                        <FormLabel fontSize="sm" lineHeight="32px" mb={0} mr={2} whiteSpace="nowrap">Y:</FormLabel>
                        <Input
                          size="sm"
                          w="70px"
                          h="32px"
                          lineHeight="32px"
                          value={formatNumber(cropSettings.y)}
                          onChange={e => handleNumericChange('y', e.target.value)}
                          type="number"
                        />
                      </FormControl>
                    </HStack>
                    <HStack spacing={4} flex="1" justify={{ base: 'center', sm: 'flex-start' }}>
                      <FormControl display="flex" alignItems="center" w="auto">
                        <FormLabel fontSize="sm" lineHeight="32px" mb={0} mr={2} whiteSpace="nowrap">Width:</FormLabel>
                        <Input
                          size="sm"
                          w="70px"
                          h="32px"
                          lineHeight="32px"
                          value={formatNumber(cropSettings.width)}
                          onChange={e => handleNumericChange('width', e.target.value)}
                          type="number"
                        />
                      </FormControl>
                      <FormControl display="flex" alignItems="center" w="auto">
                        <FormLabel fontSize="sm" lineHeight="32px" mb={0} mr={2} whiteSpace="nowrap">Height:</FormLabel>
                        <Input
                          size="sm"
                          w="70px"
                          h="32px"
                          lineHeight="32px"
                          value={formatNumber(cropSettings.height)}
                          onChange={e => handleNumericChange('height', e.target.value)}
                          type="number"
                        />
                      </FormControl>
                    </HStack>
                  </Flex>
                  <Flex w="full" justify="center" align="center" gap={2} mt={3}>
                    <HStack>
                      <Button size="sm" onClick={handleCancel}>
                        {TEXT.BUTTONS.CANCEL}
                      </Button>
                      <Button size="sm" colorScheme="blue" onClick={handleCrop}>
                        {TEXT.BUTTONS.CROP_DOWNLOAD}
                      </Button>
                    </HStack>
                  </Flex>
                </VStack>
              </>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
};

const App: React.FC = () => {
  return (
    <ChakraProvider theme={theme}>
      <ColorModeScript initialColorMode={theme.config.initialColorMode} />
      <AppContent />
    </ChakraProvider>
  );
};

export default App;
export { App };
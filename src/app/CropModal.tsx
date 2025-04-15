// app/CropModal.tsx

import React from 'react';
// prettier-ignore
import {
  Modal, ModalOverlay, ModalContent, ModalBody, Button, VStack, HStack, Text,
  FormControl, FormLabel, Input, Select, Flex, Grid, GridItem, Checkbox
} from '@chakra-ui/react';
import Cropper, { ReactCropperElement } from 'react-cropper';
import 'cropperjs/dist/cropper.css';
import './cropper-custom.css';
import { CropSettings, ImageData } from './types';
import { TEXT } from './constants';

interface CropModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentImage: ImageData | null;
  activeCropSettings: CropSettings;
  originalDimensions: { width: number; height: number } | null;
  selectedAspectRatio: string;
  saveOnCancel: boolean;
  onCrop: () => Promise<void>;
  onCancel: () => void;
  onCropEvent: (event: any) => void;
  onCropperReady: () => void;
  onAspectChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  onSaveOnCancelChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onXChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onYChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onWidthChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onHeightChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  cropperRef: React.RefObject<ReactCropperElement>;
  formatNumber: (value: number) => string;
}

export const CropModal: React.FC<CropModalProps> = ({
  isOpen,
  onClose,
  currentImage,
  activeCropSettings,
  originalDimensions,
  selectedAspectRatio,
  saveOnCancel,
  onCrop,
  onCancel,
  onCropEvent,
  onCropperReady,
  onAspectChange,
  onSaveOnCancelChange,
  onXChange,
  onYChange,
  onWidthChange,
  onHeightChange,
  cropperRef,
  formatNumber
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" isCentered>
      <ModalOverlay />
      <ModalContent maxH="100vh" my={0} display="flex" flexDirection="column">
        <ModalBody display="flex" flexDirection="column" gap={3} px={6} py={6}>
          {currentImage && (
            <>
              <Cropper
                src={currentImage.url}
                style={{ height: 'min(50vh, 400px)', width: '100%' }}
                initialAspectRatio={activeCropSettings.aspectRatio}
                data={activeCropSettings}
                guides={true}
                crop={onCropEvent}
                ready={onCropperReady}
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
                        {originalDimensions
                          ? `${originalDimensions.width} x ${originalDimensions.height}px`
                          : ''}
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
                      value={selectedAspectRatio}
                      onChange={onAspectChange}
                      h="32px"
                      w="120px"
                    >
                      <option value={TEXT.MODAL.ASPECT_RATIOS.FREE.VALUE}>
                        {TEXT.MODAL.ASPECT_RATIOS.FREE.LABEL}
                      </option>
                      <option value={TEXT.MODAL.ASPECT_RATIOS.ORIGINAL.VALUE}>
                        {TEXT.MODAL.ASPECT_RATIOS.ORIGINAL.LABEL}
                      </option>
                      <option value={TEXT.MODAL.ASPECT_RATIOS.SQUARE.VALUE}>
                        {TEXT.MODAL.ASPECT_RATIOS.SQUARE.LABEL}
                      </option>
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
                      <FormLabel fontSize="sm" lineHeight="32px" mb={0} mr={2} whiteSpace="nowrap">
                        X:
                      </FormLabel>
                      <Input
                        size="sm"
                        w="70px"
                        h="32px"
                        lineHeight="32px"
                        value={formatNumber(activeCropSettings.x)}
                        onChange={onXChange}
                        type="number"
                      />
                    </FormControl>
                    <FormControl display="flex" alignItems="center" w="auto">
                      <FormLabel fontSize="sm" lineHeight="32px" mb={0} mr={2} whiteSpace="nowrap">
                        Y:
                      </FormLabel>
                      <Input
                        size="sm"
                        w="70px"
                        h="32px"
                        lineHeight="32px"
                        value={formatNumber(activeCropSettings.y)}
                        onChange={onYChange}
                        type="number"
                      />
                    </FormControl>
                  </HStack>
                  <HStack spacing={4} flex="1" justify={{ base: 'center', sm: 'flex-start' }}>
                    <FormControl display="flex" alignItems="center" w="auto">
                      <FormLabel fontSize="sm" lineHeight="32px" mb={0} mr={2} whiteSpace="nowrap">
                        Width:
                      </FormLabel>
                      <Input
                        size="sm"
                        w="70px"
                        h="32px"
                        lineHeight="32px"
                        value={formatNumber(activeCropSettings.width)}
                        onChange={onWidthChange}
                        type="number"
                      />
                    </FormControl>
                    <FormControl display="flex" alignItems="center" w="auto">
                      <FormLabel fontSize="sm" lineHeight="32px" mb={0} mr={2} whiteSpace="nowrap">
                        Height:
                      </FormLabel>
                      <Input
                        size="sm"
                        w="70px"
                        h="32px"
                        lineHeight="32px"
                        value={formatNumber(activeCropSettings.height)}
                        onChange={onHeightChange}
                        type="number"
                      />
                    </FormControl>
                  </HStack>
                </Flex>
                <Grid w="full" mt={3} templateColumns="1fr 3fr" alignItems="center">
                  <GridItem>
                    <Checkbox size="sm" isChecked={saveOnCancel} onChange={onSaveOnCancelChange}>
                      {TEXT.MODAL.SAVE_ON_CANCEL}
                    </Checkbox>
                  </GridItem>
                  <GridItem pl={4}>
                    <HStack>
                      <Button size="sm" onClick={onCancel}>
                        {TEXT.BUTTONS.CANCEL}
                      </Button>
                      <Button size="sm" colorScheme="blue" onClick={onCrop}>
                        {TEXT.BUTTONS.CROP_DOWNLOAD}
                      </Button>
                    </HStack>
                  </GridItem>
                </Grid>
              </VStack>
            </>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

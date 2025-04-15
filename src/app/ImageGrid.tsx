// app/ImageGrid.tsx

import React from 'react';
// prettier-ignore
import {
  Box, Button, Grid, Image, IconButton, VStack, HStack, Text, Popover,
  PopoverTrigger, PopoverContent, PopoverBody, PopoverArrow, GridItem
} from '@chakra-ui/react';
import { DeleteIcon, InfoIcon } from '@chakra-ui/icons';
import { ImageData } from './types';
import { TEXT } from './constants';

interface ImageGridProps {
  images: ImageData[];
  onCropClick: (image: ImageData) => void;
  onDeleteClick: (id: string) => void;
  colorMode: string;
}

export const ImageGrid: React.FC<ImageGridProps> = ({
  images,
  onCropClick,
  onDeleteClick,
  colorMode
}) => {
  return (
    <Grid templateColumns="repeat(auto-fill, minmax(200px, 1fr))" gap={4}>
      {images.map((image) => (
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
                  bg={image.cropped ? 'green.500' : 'gray.600'}
                  color="white"
                  opacity={0.9}
                  boxShadow="0 0 4px rgba(0,0,0,0.3)"
                  _hover={{
                    bg: image.cropped ? 'green.600' : 'gray.700',
                    opacity: 1
                  }}
                  _active={{
                    bg: image.cropped ? 'green.700' : 'gray.800'
                  }}
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
                  bg: 'gray.700',
                  borderColor: 'gray.600'
                }}
                py={1}
                px={2}
              >
                <PopoverArrow bg="gray.700" />
                <PopoverBody p={2}>
                  <VStack align="start" spacing={1} minH="44px">
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
                            <Text fontWeight="medium" textAlign="center">
                              {TEXT.CROP_HISTORY.COLUMNS.X}
                            </Text>
                          </GridItem>
                          <GridItem
                            p={1}
                            borderBottom="1px"
                            borderRight="1px"
                            borderColor="gray.600"
                          >
                            <Text fontWeight="medium" textAlign="center">
                              {TEXT.CROP_HISTORY.COLUMNS.Y}
                            </Text>
                          </GridItem>
                          <GridItem
                            p={1}
                            borderBottom="1px"
                            borderRight="1px"
                            borderColor="gray.600"
                          >
                            <Text fontWeight="medium" textAlign="center">
                              {TEXT.CROP_HISTORY.COLUMNS.WIDTH}
                            </Text>
                          </GridItem>
                          <GridItem p={1} borderBottom="1px" borderColor="gray.600">
                            <Text fontWeight="medium" textAlign="center">
                              {TEXT.CROP_HISTORY.COLUMNS.HEIGHT}
                            </Text>
                          </GridItem>
                          {image.cropHistory.map((crop, i) => (
                            <React.Fragment key={i}>
                              <GridItem
                                p={1}
                                borderRight="1px"
                                borderBottom={i < image.cropHistory.length - 1 ? '1px' : '0'}
                                borderColor="gray.600"
                              >
                                <Text textAlign="right">{crop.x}</Text>
                              </GridItem>
                              <GridItem
                                p={1}
                                borderRight="1px"
                                borderBottom={i < image.cropHistory.length - 1 ? '1px' : '0'}
                                borderColor="gray.600"
                              >
                                <Text textAlign="right">{crop.y}</Text>
                              </GridItem>
                              <GridItem
                                p={1}
                                borderRight="1px"
                                borderBottom={i < image.cropHistory.length - 1 ? '1px' : '0'}
                                borderColor="gray.600"
                              >
                                <Text textAlign="right">{crop.width}</Text>
                              </GridItem>
                              <GridItem
                                p={1}
                                borderBottom={i < image.cropHistory.length - 1 ? '1px' : '0'}
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
              onClick={() => onDeleteClick(image.id)}
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
            onClick={() => onCropClick(image)}
            bg={colorMode === 'light' ? '#C9CCD2' : 'gray.600'}
            _hover={{ bg: colorMode === 'light' ? '#D4D9E0' : 'gray.500' }}
            _active={{
              bg: colorMode === 'light' ? '#ABAFB6' : 'gray.700'
            }}
          >
            {TEXT.BUTTONS.CROP}
          </Button>
        </Box>
      ))}
    </Grid>
  );
};

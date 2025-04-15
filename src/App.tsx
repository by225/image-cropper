// App.tsx

import { ChakraProvider, ColorModeScript } from '@chakra-ui/react';
import { ImageCropperApp } from './app/ImageCropperApp';
import { theme } from './app/theme';

const App: React.FC = () => {
  return (
    <ChakraProvider theme={theme}>
      <ColorModeScript initialColorMode={theme.config.initialColorMode} />
      <ImageCropperApp />
    </ChakraProvider>
  );
};

export default App;

// app/theme.ts

import { extendTheme } from '@chakra-ui/react';

export const theme = extendTheme({
  config: {
    initialColorMode: 'dark',
    useSystemColorMode: false
  },
  components: {
    Alert: {
      variants: {
        solid: {
          container: {
            color: '#1A202C',
            bg: '#E5C16D',
            _light: {
              bg: '#E5C16D'
            },
            _dark: {
              bg: '#E5C16D'
            }
          },
          icon: {
            color: '#1A202C'
          }
        }
      }
    },
    Toast: {
      defaultProps: {
        variant: 'solid',
        status: 'warning'
      }
    }
  }
});

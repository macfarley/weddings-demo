import { ChakraProvider } from '@chakra-ui/react';
import { useRouter } from 'next/router';
import { system } from '../theme';
import { PaletteProvider } from '../context/PaletteContext';
import NavBar from '../components/NavBar';
import '../styles/globals.css';

export default function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const isInProgressRoute = router.pathname === '/' || router.pathname === '/under-construction';

  return (
    <ChakraProvider value={system}>
      <PaletteProvider>
        {!isInProgressRoute && <NavBar />}
        <Component {...pageProps} />
      </PaletteProvider>
    </ChakraProvider>
  );
}

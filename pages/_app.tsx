import { ChakraProvider } from '@chakra-ui/react';
import { useRouter } from 'next/router';
import { system } from '../theme';
import { PaletteProvider } from '../context/PaletteContext';
import NavBar from '../components/NavBar';
import SiteFooter from '../components/SiteFooter';
import '../styles/globals.css';
// Page styles (must be imported here — Next.js forbids global CSS in page/component files)
import '../styles/pages/about.css';
import '../styles/pages/admin.css';
import '../styles/pages/event-details.css';
import '../styles/pages/fonts.css';
import '../styles/pages/gallery.css';
import '../styles/pages/guestbook-public.css';
import '../styles/pages/guestbook.css';
import '../styles/pages/index.css';
import '../styles/pages/photo-guestbook.css';
import '../styles/pages/program.css';
import '../styles/pages/sendyourphotos.css';
import '../styles/pages/under-construction.css';
import '../styles/pages/upload.css';
// Component styles
import '../styles/components/color-story-toggle.css';
import '../styles/components/color-swatches.css';
import '../styles/components/image-viewer.css';
import '../styles/components/navbar.css';

export default function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const isInProgressRoute = router.pathname === '/under-construction';

  return (
    <ChakraProvider value={system}>
      <PaletteProvider>
        {!isInProgressRoute && <NavBar />}
        <Component {...pageProps} />
        {!isInProgressRoute && <SiteFooter />}
      </PaletteProvider>
    </ChakraProvider>
  );
}

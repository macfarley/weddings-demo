// _app.tsx — Next.js Pages Router app shell.
//
// All global CSS must be imported here — Next.js forbids global CSS imports
// in page or component files. Page-specific CSS is still logically organized
// in styles/pages/ and styles/components/ but imported here at the app level.
//
// Providers mounted here (outermost first):
//   ChakraProvider — Chakra UI system (modals only; most UI uses plain CSS)
//   PaletteProvider — wedding color theme context
//   NavBar           — shown on all pages except /qrcodeflyer and /under-construction
//   PrivacyNoticeBanner — cookie/data notice banner (GDPR-adjacent best practice)
//   SiteFooter       — shown on all pages except /under-construction
import { ChakraProvider } from '@chakra-ui/react';
import { useRouter } from 'next/router';
import { system } from '../theme';
import { PaletteProvider } from '../context/PaletteContext';
import NavBar from '../components/NavBar';
import SiteFooter from '../components/SiteFooter';
import PrivacyNoticeBanner from '../components/PrivacyNoticeBanner';
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
  const isFlyerRoute = router.pathname === '/qrcodeflyer';

  return (
    <ChakraProvider value={system}>
      <PaletteProvider>
        {!isInProgressRoute && !isFlyerRoute && <NavBar />}
        <Component {...pageProps} />
        {!isInProgressRoute && !isFlyerRoute && <SiteFooter />}
        {!isFlyerRoute && <PrivacyNoticeBanner />}
      </PaletteProvider>
    </ChakraProvider>
  );
}

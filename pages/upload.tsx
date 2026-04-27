import { useEffect } from 'react';
import { useRouter } from 'next/router';

// ACTIVE-ALTERNATE: /upload redirect stub
//
// The canonical photo upload page is /sendyourphotos.
// This stub exists because:
//   1. robots.txt blocks /upload from indexing (legacy path from early planning).
//   2. Some QR code flyerv1 links pointed here before the QR code was updated.
//   3. The proxy.ts Accept-header check covers /upload to block scrapers on this path too.
//
// Safe to change: if you update robots.txt and the flyer, this can redirect to /sendyourphotos
// or be removed entirely. Do not add upload logic here — use pages/sendyourphotos.tsx.

export default function Upload() {
  const router = useRouter();

  useEffect(() => {
    void router.replace('/sendyourphotos');
  }, [router]);

  return null;
}

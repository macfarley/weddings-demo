import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Cormorant Garamond (headings) + Montserrat (body/UI) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Montserrat:wght@300;400;600&display=swap" rel="stylesheet" />
        <style>{`
          html, body {
            background-image: url('/photos/checkered-flag.jpg');
            background-attachment: fixed;
            background-size: cover;
            background-position: center;
            min-height: 100vh;
            position: relative;
          }
          body::before {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-image: url('/photos/checkered-flag.jpg');
            background-attachment: fixed;
            background-size: cover;
            background-position: center;
            opacity: 0.15;
            pointer-events: none;
            z-index: -1;
          }
        `}</style>
        {/* Add favicon and tab title */}
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 36 36'><text y='32' font-size='32'>🍰</text></svg>" />
        <title>John and Crystal May 4Ever</title>
      </Head>
      <body className="font-sans">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}

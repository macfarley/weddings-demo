import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Inter font for all browsers */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap" rel="stylesheet" />
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
      </Head>
      <body className="font-sans">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}

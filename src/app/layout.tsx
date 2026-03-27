import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pathologic 2 - Mind Map",
  description: "A mind map in the style of Pathologic 2",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <head>
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-SWHH0ZWWCX"></script>
        <script dangerouslySetInnerHTML={{ __html: `
          if (location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-SWHH0ZWWCX');
          }
        `}} />
        <link rel="icon" href="/favicon.ico" sizes="32x32" />
        <link rel="icon" href="/icon.png" type="image/png" sizes="192x192" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.cdnfonts.com" crossOrigin="anonymous" />
        <link rel="preload" href="https://fonts.googleapis.com/css2?family=Noto+Sans:wdth,wght@75,400&display=swap" as="style" />
        <link rel="preload" href="https://fonts.cdnfonts.com/css/liberation-serif" as="style" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans:wdth,wght@75,400&display=swap" rel="stylesheet" />
        <link href="https://fonts.cdnfonts.com/css/liberation-serif" rel="stylesheet" />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

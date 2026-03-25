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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans:wdth,wght@75,400&display=swap" rel="stylesheet" />
        <link href="https://fonts.cdnfonts.com/css/liberation-serif" rel="stylesheet" />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

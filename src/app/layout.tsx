import type { Metadata, Viewport } from "next";
import "./globals.css";

/**
 * Metadata for the application.
 */
export const metadata: Metadata = {
  title: "Pokemon Scanner",
  description: "Scan and identify Pokemon cards using your device camera and computer vision",
  applicationName: "Pokemon Scanner",
  keywords: ["Pokemon", "scanner", "computer vision", "cards", "identification", "camera", "OCR"],
  authors: [{ name: "Pokemon Scanner Team" }],
  creator: "Pokemon Scanner Team",
  publisher: "Pokemon Scanner",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
};

/**
 * Viewport configuration optimized for mobile devices.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}

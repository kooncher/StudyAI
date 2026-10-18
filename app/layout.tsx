import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "เรดาร์ AI ป.โท",
  description: "ข่าวและเปเปอร์ AI ล่าสุด ผูกกับวิชาใน CSAI ของ NIDA",
  appleWebApp: { capable: true, title: "เรดาร์ AI", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F2F4F7" },
    { media: "(prefers-color-scheme: dark)", color: "#0E131C" },
  ],
};

const FONTS =
  "https://fonts.googleapis.com/css2?family=Bai+Jamjuree:wght@500;600;700&family=IBM+Plex+Sans+Thai:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href={FONTS} />
      </head>
      <body>{children}</body>
    </html>
  );
}

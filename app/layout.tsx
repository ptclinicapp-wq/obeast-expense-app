import type { Metadata, Viewport } from "next";
import "./globals.css";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "ลงตัว — บัญชีคู่ของเรา",
  description:
    "จดค่าใช้จ่ายของเปาและติม แบ่งยอดได้ทันที และสรุปว่าใครต้องคืนใคร โดยข้อมูลอยู่ในเครื่องของคุณ",
  manifest: `${basePath}/manifest.webmanifest`,
  applicationName: "ลงตัว",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ลงตัว",
  },
  openGraph: {
    type: "website",
    locale: "th_TH",
    title: "ลงตัว — บัญชีคู่ของเรา",
    description: "จด แบ่ง และเคลียร์ค่าใช้จ่ายของเปาและติมได้แบบเป็นส่วนตัว",
    images: [
      {
        url: `${basePath}/og.png`,
        width: 1536,
        height: 1024,
        alt: "ลงตัว บัญชีคู่ของเรา",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ลงตัว — บัญชีคู่ของเรา",
    description: "จด แบ่ง และเคลียร์ค่าใช้จ่ายของเปาและติมได้แบบเป็นส่วนตัว",
    images: [`${basePath}/og.png`],
  },
};

export const viewport: Viewport = {
  themeColor: "#f7f5ef",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <head>
        <meta
          httpEquiv="Content-Security-Policy"
          content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'"
        />
        <meta name="referrer" content="no-referrer" />
      </head>
      <body>{children}</body>
    </html>
  );
}

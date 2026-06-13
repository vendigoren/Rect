import type { Metadata } from "next";
import { DynaPuff } from "next/font/google";
import "./globals.css";

const dynaPuff = DynaPuff({
  variable: "--font-dynapuff",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Rect - Sprite Tool",
  description: "Narzędzie do tworzenia arkuszy klatek (spritesheet) z GIF oraz cięcia i dzielenia istniejących arkuszy.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl" className={`${dynaPuff.variable}`}>
      <body>{children}</body>
    </html>
  );
}

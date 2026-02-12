import type { Metadata } from "next";
import { Inter, Noto_Sans_Gurmukhi } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const gurmukhi = Noto_Sans_Gurmukhi({
  variable: "--font-gurmukhi",
  weight: ["400", "500", "700"],
  subsets: ["gurmukhi"],
});

export const metadata: Metadata = {
  title: "Gurbani Projector",
  description: "Advanced Gurbani Projection System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${gurmukhi.variable} antialiased`}
        suppressHydrationWarning={true}
      >
        {children}
      </body>
    </html>
  );
}

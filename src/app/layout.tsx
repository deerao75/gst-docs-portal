import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Footer from "@/components/Footer";
import Nav from "@/components/Nav";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Acer GST Reference Portal",
  description:
    "Acer GST Reference Portal — Acts, Rules, Notifications, Circulars, Orders, Instructions and Advisory for GST professionals.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body
        className={`${inter.className} flex min-h-screen flex-col bg-brand-cream font-sans antialiased`}
      >
        <Nav />
        <main className="w-full flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
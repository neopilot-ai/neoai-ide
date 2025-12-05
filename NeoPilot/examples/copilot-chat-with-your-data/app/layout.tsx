import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { NeoPilot } from "@neopilot/react-core";
import "@neopilot/react-ui/styles.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Chat with your data - NeoPilot",
  description: "AI-powered dashboard assistant for data visualization and insights",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <NeoPilot 
          runtimeUrl="/api/neopilot"
          showDevConsole={false}
        >
          {children}
        </NeoPilot>
      </body>
    </html>
  );
}

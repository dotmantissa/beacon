import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { PrivyProviderWrapper } from "@/components/PrivyProviderWrapper";
import { WalletProvider } from "@/components/WalletProvider";
import { ThemeProvider } from "@/components/ThemeProvider";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Beacon",
  description: "Neighbourhood safety, verified. Submit incidents with evidence. The AI cross-checks. The record stands.",
  icons: { icon: "/beacon-logo.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        {/* Runs synchronously before paint to prevent flash of wrong theme */}
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch{}` }} />
      </head>
      <body>
        <ThemeProvider>
          <PrivyProviderWrapper>
            <WalletProvider>
              {children}
            </WalletProvider>
          </PrivyProviderWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}

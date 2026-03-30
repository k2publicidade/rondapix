import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: 'Ronda Pix',
    template: '%s | Ronda Pix',
  },
  description: 'O jogo de cartas do subúrbio carioca agora online — aposte, vire, ganhe.',
  keywords: ['ronda', 'ronda pix', 'jogo de cartas', 'apostas virtuais', 'multiplayer', 'carioca'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-[#0a0f0d]`}>
        {children}
      </body>
    </html>
  );
}

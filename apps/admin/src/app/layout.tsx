import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ronda Admin',
  description: 'Painel administrativo do Ronda Online',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="min-h-screen bg-zinc-950 text-zinc-100 antialiased">
        {children}
      </body>
    </html>
  );
}

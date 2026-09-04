import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Manrope, Space_Grotesk } from 'next/font/google';
import './styles.css';

const bodyFont = Manrope({
  subsets: ['latin'],
  variable: '--font-body',
});

const displayFont = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
});

export const metadata: Metadata = {
  description: 'Transforme sua explicação em uma proposta profissional para revisar e compartilhar.',
  title: 'Cotali — O orçamento começa na sua voz',
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html className="scroll-smooth" lang="pt-BR">
      <body className={`${bodyFont.variable} ${displayFont.variable} bg-cotali-white font-cotali-body text-cotali-blue antialiased`}>
        {children}
      </body>
    </html>
  );
}
